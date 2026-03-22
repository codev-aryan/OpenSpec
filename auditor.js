const { JSDOM } = require('jsdom');
const axe = require('axe-core');

/**
 * Parses an HTML string into a virtual DOM and runs the axe-core accessibility engine.
 * @param {string} htmlString - The raw HTML to audit.
 * @returns {Array} - An array of WCAG violations.
 */
async function auditHtml(htmlString) {
    // Create a virtual browser environment for axe-core
    const dom = new JSDOM(htmlString);
    const { window } = dom;

    // Run the audit
    const results = await axe.run(window.document.documentElement);
    return results.violations;
}

module.exports = { auditHtml };