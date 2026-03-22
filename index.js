require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { auditHtml } = require('./auditor');
const { healCode } = require('./fixer');
const { printDiff } = require('./diff');

async function runOpenSpec() {
    console.log("🚀 Starting OpenSpec Audit...\n");

    try {
        // 1. Read the local FOSS project file
        const filePath = path.join(__dirname, 'examples', 'sample.html');
        const html = fs.readFileSync(filePath, 'utf8');

        // 2. Scan for violations
        console.log("🔍 Scanning for WCAG violations with axe-core...");
        const violations = await auditHtml(html);

        if (violations.length === 0) {
            console.log("✅ No accessibility issues found!");
            return;
        }

        console.log(`❌ Found ${violations.length} violation types. Initiating auto-heal via Llama 3...\n`);

        // 3. Process the first two violations to keep the demo snappy and impactful
        const demoViolations = violations.slice(0, 2);

        for (const violation of demoViolations) {
            const badNodeHtml = violation.nodes[0].html;
            
            // 4. Generate the FOSS-compliant fix
            const fixedHtml = await healCode(violation.description, badNodeHtml);
            
            // 5. Render the UI
            printDiff(violation, badNodeHtml, fixedHtml);
        }

        console.log("✨ Audit complete. Apply these fixes to your codebase.");

    } catch (error) {
        console.error("🚨 Error running OpenSpec:", error.message);
    }
}

runOpenSpec();