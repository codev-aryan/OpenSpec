/**
 * auditor.js
 *
 * Core accessibility engine for OpenSpec.
 * Uses jsdom to create a virtual DOM environment and axe-core to run
 * a full WCAG 2.1 audit against it — no real browser required.
 *
 * Architecture Note (FOSS):
 *   axe-core is the same engine that powers Deque's commercial tooling,
 *   but its core rule library is Apache 2.0 licensed and freely available.
 *   This module is the only place axe/jsdom are coupled, making it easy
 *   to swap in a different engine (e.g., pa11y) in the future.
 */

"use strict";

const { JSDOM } = require("jsdom");
const axe = require("axe-core");

/**
 * Audits an HTML string for WCAG accessibility violations.
 *
 * @param {string} htmlString - The raw HTML content to audit.
 * @returns {Promise<Array>} A promise that resolves to an array of axe violation objects.
 *   Each violation has: id, description, impact, nodes (with html snippets).
 */
async function auditHtml(htmlString) {
  // Set up a virtual browser environment using jsdom.
  // The `runScripts` option is needed for axe-core to execute inside the DOM.
  const dom = new JSDOM(htmlString, {
    runScripts: "dangerously",
    resources: "usable",
  });

  const { window } = dom;
  const { document } = window;

  // axe-core needs to be sourced into the jsdom window so it can
  // traverse the virtual document just like it would a real browser page.
  const axeSource = axe.source;
  const scriptEl = document.createElement("script");
  scriptEl.textContent = axeSource;
  document.head.appendChild(scriptEl);

  // Run the audit. axe.run() is async and resolves with a results object
  // containing `violations`, `passes`, `incomplete`, and `inapplicable` arrays.
  const results = await window.axe.run(document);

  return results.violations;
}

module.exports = { auditHtml };
