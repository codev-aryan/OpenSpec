const Groq = require('groq-sdk');

// Initialize the Groq client. Requires GROQ_API_KEY in the .env file.
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Sends the broken HTML and error description to Llama 3 to generate a fix.
 * @param {string} violationDesc - The axe-core error description.
 * @param {string} brokenHtml - The specific HTML node that failed.
 * @returns {string} - The corrected HTML.
 */
async function healCode(violationDesc, brokenHtml) {
    const prompt = `You are an expert FOSS accessibility developer. Fix the provided HTML snippet to resolve the specified axe-core WCAG violation. Return ONLY the corrected raw HTML code. Do not include markdown formatting, explanations, or backticks.
    
Violation: ${violationDesc}
Broken HTML: ${brokenHtml}`;

    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama3-8b-8192", // Fast, open-weight model ideal for CLI tools
        temperature: 0.1, // Low temperature for deterministic, factual code output
    });

    return completion.choices[0]?.message?.content?.trim() || "Error generating fix.";
}

module.exports = { healCode };