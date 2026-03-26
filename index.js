/**
 * index.js
 *
 * Main orchestrator and CLI entry point for OpenSpec.
 *
 * Execution flow:
 * 1. Load environment variables from .env (Groq API key).
 * 2. Read the target — either a local HTML file or a live URL (--url).
 * 3. Audit it using axe-core (auditor.js) and collect violations.
 * 4. For each violation (up to --max), extract the broken HTML
 * snippet and send it to the Groq/Llama 3 fixer (fixer.js).
 * 5. Render the Before/After diff to the terminal (diff.js).
 * 6. If --fix is passed (file mode only), apply all fixes to the original
 * HTML and write a corrected copy to <filename>.fixed.html on disk.
 *
 * Usage:
 * node index.js [path-to-html-file]
 * node index.js ./examples/sample.html
 * node index.js ./examples/sample.html --fix
 * node index.js ./examples/sample.html --strict
 * node index.js ./examples/sample.html --fix --strict
 * node index.js ./examples/sample.html --max 5
 * node index.js ./examples/sample.html --max 5 --fix --strict
 * node index.js --url https://example.com
 * node index.js --url https://example.com --strict
 */

"use strict";

// Load .env variables (GROQ_API_KEY) into process.env before any other imports.
// { quiet: true } silences the annoying "[dotenv@17.3.1] injecting env..." log.
require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");

const { auditHtml, auditUrl } = require("./auditor");
const { fixViolation } = require("./fixer");
const { printBanner, printDiff, printSummary, printFixWritten } = require("./diff");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _safeErrorMessage(err) {
  if (!err) return "Unknown error";
  if (typeof err === "object" && err.status) {
    return `Groq API error ${err.status}: ${err.message ?? "no message"}`;
  }
  return err.message ?? String(err);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  printBanner();

  if (!process.env.GROQ_API_KEY) {
    console.error(
      "  ✖ Error: GROQ_API_KEY is not set.\n" +
      "  Copy .env.example to .env and add your key from https://console.groq.com\n"
    );
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const fixFlag = args.includes("--fix");
  const strictFlag = args.includes("--strict");

  const maxFlagIndex = args.indexOf("--max");
  const maxRawValue = maxFlagIndex !== -1 ? args[maxFlagIndex + 1] : null;

  if (maxFlagIndex !== -1 && (!maxRawValue || maxRawValue.startsWith("--"))) {
    console.error("  ✖ Error: --max requires a number. Example: --max 4\n");
    process.exit(1);
  }

  const parsedMax = maxRawValue ? parseInt(maxRawValue, 10) : NaN;
  const maxViolations = !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : 2;

  const urlFlagIndex = args.indexOf("--url");
  const urlTarget = urlFlagIndex !== -1 ? args[urlFlagIndex + 1] : null;

  const fileArg = args.find((a, i) =>
    !a.startsWith("--") &&
    i !== urlFlagIndex + 1 &&
    i !== maxFlagIndex + 1
  );

  // ── Resolve the audit target ───────────────────────────────────────────────
  let htmlContent = null;
  let targetLabel = null;

  if (urlTarget) {
    if (!/^https?:\/\/.+/.test(urlTarget)) {
      console.error(
        `  ✖ Error: Invalid URL — "${urlTarget}"\n` +
        "  URLs must start with http:// or https://\n"
      );
      process.exit(1);
    }
    if (fixFlag) {
      console.warn(
        "  ⚠  --fix is not supported in URL mode (no local file to write to).\n" +
        "  The diff will still be shown in the terminal.\n"
      );
    }
    targetLabel = urlTarget;
  } else {
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

  // Count total distinct broken elements across all grouped rules
  const totalNodes = violations.reduce((acc, v) => acc + v.nodes.length, 0);
  
  // Flatten all broken nodes into a single array so we can process them individually
  const allBrokenNodes = violations.flatMap(violation => 
    violation.nodes.map(node => ({ violation, node }))
  );
  
  // Apply the --max limit to the elements directly
  const nodesToProcess = allBrokenNodes.slice(0, maxViolations);

  console.log(`  Found ${totalNodes} broken element(s) across ${violations.length} rule(s).`);
  console.log(`  Generating fixes for the first ${nodesToProcess.length} element(s)...\n`);

  // ── Step 2: Fix & Render ──────────────────────────────────────────────────
  const appliedFixes = [];

  // 1. Fire all Groq API requests concurrently
  const fixPromises = nodesToProcess.map(async ({ violation, node }) => {
    const brokenHtml = node.html ?? "(no HTML snippet available)";
    let fixedHtml = null;
    let success = false;

    try {
      fixedHtml = await fixViolation(brokenHtml, violation.description, violation.id);
      success = true;
    } catch (err) {
      console.error(`  ✖ Could not generate fix for [${violation.id}]: ${_safeErrorMessage(err)}`);
    }

    return { violation, brokenHtml, fixedHtml, success };
  });

  // 2. Wait for all of them to finish at the same time
  const processedNodes = await Promise.all(fixPromises);

  // 3. Render the UI sequentially so the terminal diffs stay in perfect order
  let displayIndex = 1;
  for (const result of processedNodes) {
    if (result.success && result.fixedHtml) {
      appliedFixes.push({ brokenHtml: result.brokenHtml, fixedHtml: result.fixedHtml });
    }

    printDiff({
      index: displayIndex++,
      violationId: result.violation.id,
      description: result.violation.description,
      impact: result.violation.impact,
      brokenHtml: result.brokenHtml,
      fixedHtml: result.fixedHtml ?? "(fix generation failed — check your network or API key)",
    });
  }

  // ── Step 3: Write fixed file to disk (--fix, file mode only) ─────────────
  if (fixFlag && !urlTarget) {
    if (appliedFixes.length === 0) {
      console.log("  ℹ  --fix: No successful fixes to apply.\n");
    } else {
      let patchedHtml = htmlContent;
      for (const { brokenHtml, fixedHtml } of appliedFixes) {
        patchedHtml = patchedHtml.replace(brokenHtml, fixedHtml);
      }

      const targetPath = path.resolve(fileArg || path.join(__dirname, "examples", "sample.html"));
      const ext = path.extname(targetPath);
      const base = path.basename(targetPath, ext);
      const outputPath = path.join(path.dirname(targetPath), `${base}.fixed${ext}`);

      fs.writeFileSync(outputPath, patchedHtml, "utf-8");
      printFixWritten(outputPath, appliedFixes.length);
    }
  }

  // Print summary using totalNodes so the math matches the UI
  printSummary(totalNodes, appliedFixes.length, fixFlag, strictFlag);

  if (strictFlag && violations.length > 0) {
    process.exit(1);
  }
}

main();