/**
 * diff.js
 *
 * Terminal UI renderer for OpenSpec.
 * Prints a clean, color-coded Before/After diff to stdout using raw
 * ANSI escape codes — no third-party UI or color libraries required.
 *
 * Architecture Note (FOSS):
 *   Keeping the UI layer dependency-free is a deliberate design choice.
 *   ANSI escape codes are supported by every major terminal emulator
 *   (macOS Terminal, iTerm2, Windows Terminal, all Linux terminals).
 *   This keeps the install footprint minimal and the code auditable.
 */

"use strict";

// ANSI escape codes for terminal styling.
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  // Text colors
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // Background colors (used for line highlights)
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
};

/**
 * A small helper to apply one or more ANSI codes to a string.
 * @param {string} text
 * @param {...string} codes - ANSI codes from the ANSI object above.
 * @returns {string}
 */
function style(text, ...codes) {
  return codes.join("") + text + ANSI.reset;
}

/**
 * Prints a horizontal rule divider to the terminal.
 * @param {string} [char="─"] - The character to repeat.
 * @param {number} [width=60] - How wide the rule should be.
 */
function printRule(char = "─", width = 60) {
  console.log(style(char.repeat(width), ANSI.dim));
}

/**
 * Renders a single violation's Before/After diff to the terminal.
 *
 * @param {object} options
 * @param {number}  options.index           - The violation number (1-based) for display.
 * @param {string}  options.violationId     - The axe-core rule ID (e.g., "image-alt").
 * @param {string}  options.description     - Human-readable description of the violation.
 * @param {string}  options.impact          - Severity: "critical", "serious", "moderate", "minor".
 * @param {string}  options.brokenHtml      - The original, inaccessible HTML snippet.
 * @param {string}  options.fixedHtml       - The AI-generated, corrected HTML snippet.
 */
function printDiff({ index, violationId, description, impact, brokenHtml, fixedHtml }) {
  const impactColor =
    impact === "critical" || impact === "serious" ? ANSI.red : ANSI.yellow;

  console.log("\n");
  printRule("═");

  // Header: violation number and rule ID
  console.log(
    style(`  VIOLATION ${index}`, ANSI.bold, ANSI.white) +
    "  " +
    style(`[${violationId}]`, ANSI.dim)
  );

  // Impact badge
  console.log(
    "  Impact: " + style(impact.toUpperCase(), ANSI.bold, impactColor)
  );

  // Description
  console.log(
    style("  " + description, ANSI.dim)
  );

  printRule();

  // BEFORE block
  console.log(style("  🔴  BEFORE", ANSI.bold, ANSI.red));
  console.log("");
  brokenHtml
    .trim()
    .split("\n")
    .forEach((line) => {
      console.log(style("  - ", ANSI.red) + style(line, ANSI.dim));
    });

  console.log("");
  printRule();

  // AFTER block
  console.log(style("  🟢  AFTER  (AI-generated fix)", ANSI.bold, ANSI.green));
  console.log("");
  fixedHtml
    .trim()
    .split("\n")
    .forEach((line) => {
      console.log(style("  + ", ANSI.green) + line);
    });

  console.log("");
  printRule("═");
}

/**
 * Prints the OpenSpec banner to the terminal on startup.
 */
function printBanner() {
  console.log("\n");
  console.log(style("  ⚡ OpenSpec — Self-Healing Accessibility", ANSI.bold, ANSI.cyan));
  console.log(style("  Powered by axe-core + Llama 3 via Groq", ANSI.dim));
  console.log("\n");
}

/**
 * Prints a confirmation that the fixed HTML file was written to disk.
 * @param {string} outputPath - Absolute path of the written file.
 * @param {number} count - Number of fixes applied.
 */
function printFixWritten(outputPath, count) {
  console.log("\n");
  printRule("─");
  console.log(
    style("  💾  Fixed file written: ", ANSI.bold, ANSI.green) +
    style(outputPath, ANSI.cyan)
  );
  console.log(
    style(`  ${count} fix(es) applied to the original HTML.`, ANSI.dim)
  );
  printRule("─");
}

/**
 * Prints a summary line after all violations have been processed.
 * @param {number} total - Total violations found.
 * @param {number} fixed - Total violations fixed in this run.
 * @param {boolean} [writeMode=false] - Whether --fix was passed.
 * @param {boolean} [strictMode=false] - Whether --strict was passed.
 */
function printSummary(total, fixed, writeMode = false, strictMode = false) {
  console.log("\n");
  printRule("─");
  console.log(
    style("  ✔ Done. ", ANSI.bold, ANSI.green) +
    style(`Processed ${fixed} of ${total} violation(s) found.`, ANSI.dim)
  );
  if (total > fixed) {
    console.log(
      style(
      `  ℹ  ${total - fixed} violation(s) not processed (run with --max <n> to process more).`,
        ANSI.dim
      )
    );
  }
  if (!writeMode) {
    console.log(
      style("  ℹ  Tip: run with --fix to write a corrected .fixed.html file to disk.", ANSI.dim)
    );
  }
  if (total > 0 && !strictMode) {
    console.log(
      style("  ℹ  Tip: run with --strict to exit 1 on violations — use this in CI to gate deploys.", ANSI.dim)
    );
  }
  printRule("─");
  console.log("\n");
}

module.exports = { printBanner, printDiff, printSummary, printFixWritten };