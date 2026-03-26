/**
 * index.js
 *
 * Main orchestrator and CLI entry point for OpenSpec.
 *
 * Execution flow:
 *   1. Load environment variables from .env (Groq API key).
 *   2. Read the target — either a local HTML file or a live URL (--url).
 *   3. Audit it using axe-core (auditor.js) and collect violations.
 *   4. For each violation (up to MAX_VIOLATIONS), extract the broken HTML
 *      snippet and send it to the Groq/Llama 3 fixer (fixer.js).
 *   5. Render the Before/After diff to the terminal (diff.js).
 *   6. If --fix is passed (file mode only), apply all fixes to the original
 *      HTML and write a corrected copy to <filename>.fixed.html on disk.
 *
 * Architecture Note (FOSS):
 *   This file is intentionally thin. It contains no business logic —
 *   only orchestration. Each concern (auditing, fixing, rendering) lives
 *   in its own module, making individual components independently testable
 *   and replaceable without touching the rest of the codebase.
 *
* Usage:
 *   node index.js [path-to-html-file]
 *   node index.js ./examples/sample.html
 *   node index.js ./examples/sample.html --fix
 *   node index.js ./examples/sample.html --strict
 *   node index.js ./examples/sample.html --fix --strict
 *   node index.js ./examples/sample.html --max 5
 *   node index.js ./examples/sample.html --max 5 --fix --strict
 *   node index.js --url https://example.com
 *   node index.js --url https://example.com --strict
 */

"use strict";

// Load .env variables (GROQ_API_KEY) into process.env before any other imports.
require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");

const { auditHtml, auditUrl } = require("./auditor");
const { fixViolation } = require("./fixer");
const { printBanner, printDiff, printSummary, printFixWritten } = require("./diff");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts a safe, loggable error message from any thrown value.
 *
 * Groq SDK errors include the full HTTP request context in their stack and
 * properties — which can contain the Authorization header and therefore the
 * API key. This function pulls only the status code and message text so we
 * never accidentally print credentials to stdout/CI logs.
 *
 * @param {unknown} err - The caught error value.
 * @returns {string} A sanitized, single-line error string safe to log.
 */
function _safeErrorMessage(err) {
  if (!err) return "Unknown error";

  // Groq SDK attaches a numeric `status` for HTTP errors (401, 429, 500, …).
  // Include it so the user knows whether it's an auth, rate-limit, or server issue.
  if (typeof err === "object" && err.status) {
    return `Groq API error ${err.status}: ${err.message ?? "no message"}`;
  }

  // For everything else (network errors, timeouts, etc.) just use the message.
  return err.message ?? String(err);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  printBanner();

  // Validate environment
  if (!process.env.GROQ_API_KEY) {
    console.error(
      "  ✖ Error: GROQ_API_KEY is not set.\n" +
      "  Copy .env.example to .env and add your key from https://console.groq.com\n"
    );
    process.exit(1);
  }

  // Parse CLI arguments.
  // Flags can appear in any position after the binary name.
  //   --url    audit a live URL instead of a local file (e.g. --url https://example.com)
  //   --fix    write a .fixed.html file to disk after generating fixes (file mode only)
  //   --strict exit with code 1 if any violations are found (for CI gates)
  const args = process.argv.slice(2);
  const fixFlag = args.includes("--fix");
  const strictFlag = args.includes("--strict");

  // Parse --max <value> (fallback to 2 if not provided or invalid)
  const maxFlagIndex = args.indexOf("--max");
  const parsedMax = maxFlagIndex !== -1 ? parseInt(args[maxFlagIndex + 1], 10) : NaN;
  const maxViolations = !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : 2;

  // --url <value>: find the flag then grab the next token as its value.
  const urlFlagIndex = args.indexOf("--url");
  const urlTarget = urlFlagIndex !== -1 ? args[urlFlagIndex + 1] : null;

  // Any non-flag argument that isn't the value after --url is the file path.
  const fileArg = args.find((a, i) => !a.startsWith("--") && i !== urlFlagIndex + 1);

  // ── Resolve the audit target ───────────────────────────────────────────────
  let htmlContent = null;    // populated in file mode; null in URL mode
  let targetLabel = null;    // display name shown in the terminal header

  if (urlTarget) {
    // URL mode — validate it looks like an absolute URL before attempting fetch.
    if (!/^https?:\/\/.+/.test(urlTarget)) {
      console.error(
        `  ✖ Error: Invalid URL — "${urlTarget}"\n` +
        "  URLs must start with http:// or https://\n"
      );
      process.exit(1);
    }

    // Warn clearly that --fix is incompatible with URL mode.
    // We have no local file to write back to, so silently ignoring it
    // would confuse users who expect a .fixed.html to appear.
    if (fixFlag) {
      console.warn(
        "  ⚠  --fix is not supported in URL mode (no local file to write to).\n" +
        "  The diff will still be shown in the terminal.\n"
      );
    }

    targetLabel = urlTarget;
  } else {
    // File mode — resolve path and read content from disk.
    const targetPath = fileArg
      ? path.resolve(fileArg)
      : path.resolve(__dirname, "examples", "sample.html");

    if (!fs.existsSync(targetPath)) {
      console.error(`  ✖ Error: File not found — ${targetPath}\n`);
      process.exit(1);
    }

    htmlContent = fs.readFileSync(targetPath, "utf-8");
    targetLabel = path.basename(targetPath);
  }

  console.log(`  Auditing: ${targetLabel}\n`);

  // ── Step 1: Audit ─────────────────────────────────────────────────────────
  let violations;
  try {
    violations = urlTarget
      ? await auditUrl(urlTarget)
      : await auditHtml(htmlContent);
  } catch (err) {
    console.error("  ✖ Audit failed:", _safeErrorMessage(err));
    process.exit(1);
  }

  if (violations.length === 0) {
    console.log("  ✔ No accessibility violations found. Great work!\n");
    process.exit(0);
  }

  console.log(`  Found ${violations.length} accessibility violation(s).`);
  console.log(`  Generating fixes for the first ${Math.min(maxViolations, violations.length)}...\n`);

  // ── Step 2: Fix & Render ──────────────────────────────────────────────────
  const toProcess = violations.slice(0, maxViolations); // (or MAX_VIOLATIONS if you didn't apply Bug 7 yet)
  const appliedFixes = [];

  // 1. Fire all Groq API requests concurrently
  const fixPromises = toProcess.map(async (violation, i) => {
    const brokenHtml = violation.nodes[0]?.html ?? "(no HTML snippet available)";
    let fixedHtml;
    
    try {
      fixedHtml = await fixViolation(brokenHtml, violation.description, violation.id);
    } catch (err) {
      // _safeErrorMessage() ensures we never print the API key to stdout.
      console.error(`  ✖ Could not generate fix for [${violation.id}]: ${_safeErrorMessage(err)}`);
      fixedHtml = "(fix generation failed — check your GROQ_API_KEY and network)";
    }
    
    return { index: i, violation, brokenHtml, fixedHtml };
  });

  // 2. Wait for all of them to finish at the same time
  const processedViolations = await Promise.all(fixPromises);

  // 3. Render the UI sequentially so the terminal diffs stay in perfect order
  for (const result of processedViolations) {
    if (!result.fixedHtml.includes("(fix generation failed")) {
      appliedFixes.push({ brokenHtml: result.brokenHtml, fixedHtml: result.fixedHtml });
    }

    printDiff({
      index: result.index + 1,
      violationId: result.violation.id,
      description: result.violation.description,
      impact: result.violation.impact,
      brokenHtml: result.brokenHtml,
      fixedHtml: result.fixedHtml,
    });
  }

// ── Step 3: Write fixed file to disk (--fix, file mode only) ─────────────
  if (fixFlag && !urlTarget) {
    if (appliedFixes.length === 0) {
      console.log("  ℹ  --fix: No successful fixes to apply.\n");
    } else {
      // Apply each fix as a simple string replacement on the original HTML.
      // We use .replace() instead of .replaceAll() so we only patch the first 
      // matching instance, preventing corruption of duplicate identical nodes.
      let patchedHtml = htmlContent;
      for (const { brokenHtml, fixedHtml } of appliedFixes) {
        patchedHtml = patchedHtml.replace(brokenHtml, fixedHtml);
      }

      // Write to <originalname>.fixed.html in the same directory as the source.
      const targetPath = path.resolve(fileArg || path.join(__dirname, "examples", "sample.html"));
      const ext = path.extname(targetPath);
      const base = path.basename(targetPath, ext);
      const outputPath = path.join(path.dirname(targetPath), `${base}.fixed${ext}`);

      fs.writeFileSync(outputPath, patchedHtml, "utf-8");
      printFixWritten(outputPath, appliedFixes.length);
    }
  }

  printSummary(violations.length, toProcess.length, fixFlag, strictFlag);

  // In strict mode, exit 1 so CI pipelines treat unresolved violations
  // as a build failure. Without --strict, always exit 0 for local dev flows.
  if (strictFlag && violations.length > 0) {
    process.exit(1);
  }
}

main();