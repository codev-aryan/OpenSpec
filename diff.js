// Standard ANSI escape codes for zero-dependency terminal styling
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    bold: "\x1b[1m"
};

/**
 * Prints a clean Before vs. After code diff to the terminal.
 */
function printDiff(violation, brokenHtml, fixedHtml) {
    console.log(`\n${colors.bold}${colors.cyan}--- [VIOLATION: ${violation.id}] ---${colors.reset}`);
    console.log(`${colors.yellow}Description: ${violation.description}${colors.reset}\n`);
    console.log(`${colors.red}🔴 BEFORE (Broken Code):${colors.reset}\n${brokenHtml}\n`);
    console.log(`${colors.green}🟢 AFTER (Fixed Code):${colors.reset}\n${fixedHtml}\n`);
    console.log(`${colors.bold}==========================================${colors.reset}`);
}

module.exports = { printDiff };