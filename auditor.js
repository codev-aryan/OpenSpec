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
 * Internal helper — injects axe-core into a jsdom window and runs the audit.
 * Shared by both auditHtml and auditUrl so the engine logic lives in one place.
 *
 * @param {object} dom - A JSDOM instance (already constructed or fetched).
 * @returns {Promise<Array>} axe violation objects.
 */
async function _runAxe(dom) {
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

  return _runAxe(dom);
}

/**
 * Fetches a live URL and audits the resulting DOM for WCAG accessibility violations.
 * Uses JSDOM.fromURL() which handles the HTTP request and DOM construction in one step.
 *
 * Note: JSDOM renders the initial HTML payload only — it does not execute JavaScript
 * or wait for client-side rendering. This means SPAs may show fewer violations than
 * a real browser would, but static and server-rendered sites audit accurately.
 *
 * @param {string} url - A fully-qualified URL (https://example.com).
 * @returns {Promise<Array>} A promise that resolves to an array of axe violation objects.
 */
async function auditUrl(url) {
  // JSDOM.fromURL fetches the page over HTTP/S and constructs the DOM.
  // pretendToBeVisual gives axe-core a realistic layout environment so
  // visibility-related rules (e.g. color-contrast) can run correctly.
  const dom = await JSDOM.fromURL(url, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
  });

  return _runAxe(dom);
}

module.exports = { auditHtml, auditUrl };