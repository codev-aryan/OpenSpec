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

const { JSDOM, VirtualConsole } = require("jsdom");
const axe = require("axe-core");

// How long (ms) to wait for a remote URL to respond before giving up.
// Exposed as a constant so it's easy to override in tests or future CLI flags.
const URL_TIMEOUT_MS = 15_000;

/**
 * Creates a VirtualConsole that silences known jsdom "not implemented"
 * noise (e.g. HTMLCanvasElement.getContext) while forwarding everything
 * else to the real Node.js console so genuine errors are still visible.
 *
 * @returns {VirtualConsole}
 */
function _makeVirtualConsole() {
  const vc = new VirtualConsole();

  // Create a proxy console to intercept the canvas error before it hits the terminal
  const filteredConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    dir: console.dir.bind(console),
    error: (...args) => {
      // Catch and silently drop the specific canvas warning
      if (typeof args[0] === "string" && args[0].includes("HTMLCanvasElement's getContext()")) {
        return; 
      }
      // Forward all other errors normally
      console.error(...args);
    }
  };

  // Pipe virtual events to our filtered console instead of the raw global console.
  // Note: Use forwardTo() for jsdom v27+, or sendTo() for older versions.
  vc.forwardTo(filteredConsole, { omitJSDOMErrors: true });

  return vc;
}


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
  // virtualConsole suppresses "Not implemented" noise from jsdom internals.
  const dom = new JSDOM(htmlString, {
    runScripts: "dangerously",
    resources: "usable",
    virtualConsole: _makeVirtualConsole(),
  });

  return _runAxe(dom);
}

/**
 * Fetches a live URL and audits the resulting DOM for WCAG accessibility violations.
 * Uses JSDOM.fromURL() which handles the HTTP request and DOM construction in one step.
 *
 * Races the fetch against a URL_TIMEOUT_MS deadline so a slow or unreachable
 * host never causes the process to hang indefinitely.
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
  //
  // Promise.race() pairs the fetch with a timeout sentinel so we always
  // exit cleanly if the server is slow, unreachable, or stalls mid-response.
  const fetchDom = JSDOM.fromURL(url, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole: _makeVirtualConsole(),
  });

  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`Request timed out after ${URL_TIMEOUT_MS / 1000}s — is the URL reachable?`)),
      URL_TIMEOUT_MS
    )
  );

  const dom = await Promise.race([fetchDom, timeout]);

  return _runAxe(dom);
}

module.exports = { auditHtml, auditUrl };