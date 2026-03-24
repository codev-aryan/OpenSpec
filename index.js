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
 *   node index.js --url https://example.com
 *   node index.js --url https://example.com --strict
 */

"use strict";

// Load .env variables (GROQ_API_KEY) into process.env before any other imports.
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const { auditHtml, auditUrl } = require("./auditor");
const { fixViolation } = require("./fixer");
const { printBanner, printDiff, printSummary, printFixWritten } = require("./diff");

// ─── Configuration ────────────────────────────────────────────────────────────

// Limit the number of violations to auto-fix per run. Audits can surface
// many issues; processing all of them in one shot can be slow and costly.
// Increase this value to process more violations per run.
const MAX_VIOLATIONS = 2;

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
    console.error("  ✖ Audit failed:", err.message);
    process.exit(1);
  }

  if (violations.length === 0) {
    console.log("  ✔ No accessibility violations found. Great work!\n");
    process.exit(0);
  }

  console.log(`  Found ${violations.length} accessibility violation(s).`);
  console.log(`  Generating fixes for the first ${Math.min(MAX_VIOLATIONS, violations.length)}...\n`);

  // ── Step 2: Fix & Render ──────────────────────────────────────────────────
  // Process violations sequentially to keep terminal output ordered and
  // avoid flooding the Groq API with concurrent requests.
  const toProcess = violations.slice(0, MAX_VIOLATIONS);

  // Accumulate {brokenHtml, fixedHtml} pairs so we can apply them to disk
  // at the end if --fix was passed. Pairs with failed fixes are skipped.
  const appliedFixes = [];

  for (let i = 0; i < toProcess.length; i++) {
    const violation = toProcess[i];

    // axe-core returns `nodes`, each with a `html` property containing the
    // specific element that failed the rule. We use the first failing node.
    const brokenHtml = violation.nodes[0]?.html ?? "(no HTML snippet available)";

    let fixedHtml;
    try {
      fixedHtml = await fixViolation(
        brokenHtml,
        violation.description,
        violation.id
      );
      // Only track pairs where the AI actually returned a fix.
      appliedFixes.push({ brokenHtml, fixedHtml });
    } catch (err) {
      // If the AI fix fails for one violation, log the error and continue
      // processing the remaining ones rather than crashing entirely.
      console.error(`  ✖ Could not generate fix for [${violation.id}]: ${err.message}`);
      fixedHtml = "(fix generation failed — check your GROQ_API_KEY and network)";
    }

    printDiff({
      index: i + 1,
      violationId: violation.id,
      description: violation.description,
      impact: violation.impact,
      brokenHtml,
      fixedHtml,
    });
  }

  // ── Step 3: Write fixed file to disk (--fix, file mode only) ─────────────
  if (fixFlag && !urlTarget) {
    if (appliedFixes.length === 0) {
      console.log("  ℹ  --fix: No successful fixes to apply.\n");
    } else {
      // Apply each fix as a simple string replacement on the original HTML.
      // This preserves all surrounding markup exactly — we only swap out the
      // specific failing node snippets that axe-core and the AI both touched.
      let patchedHtml = htmlContent;
      for (const { brokenHtml, fixedHtml } of appliedFixes) {
        patchedHtml = patchedHtml.replaceAll(brokenHtml, fixedHtml);
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