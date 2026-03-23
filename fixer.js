/**
 * fixer.js
 *
 * AI-powered fix generation for OpenSpec.
 * Sends a broken HTML snippet and its violation description to Llama 3
 * (hosted on Groq) and returns the corrected, WCAG-compliant HTML.
 *
 * Architecture Note (FOSS):
 *   This module uses the Groq API purely as a fast inference provider.
 *   The underlying model (Llama 3) is an open-weight model from Meta, 
 *   released under the Llama 3 Community License. The prompt is 
 *   self-contained — no proprietary plugins or closed APIs are required.
 *   To switch providers (e.g., Ollama locally), only this file changes.
 */

"use strict";

const Groq = require("groq-sdk");

// Initialize the Groq client once at module load time.
// The SDK automatically reads GROQ_API_KEY from the environment.
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Generates a WCAG-compliant fix for a broken HTML snippet.
 *
 * @param {string} brokenHtml - The raw HTML snippet containing the violation.
 * @param {string} violationDescription - Human-readable description of the axe-core rule that was violated.
 * @param {string} violationId - The axe-core rule ID (e.g., "image-alt", "label").
 * @returns {Promise<string>} A promise that resolves to the fixed raw HTML string.
 */
async function fixViolation(brokenHtml, violationDescription, violationId) {
  // The system prompt constrains Llama 3 to behave as a pure code transformer.
  // Strict output formatting is critical: we want raw HTML with zero prose,
  // so we can display it directly in the diff without post-processing.
  const systemPrompt = `You are an expert web accessibility engineer.
Your only job is to fix HTML code to make it WCAG 2.1 AA compliant.
Rules you MUST follow:
- Return ONLY the corrected raw HTML snippet. No explanations, no markdown, no code fences.
- Do NOT change any existing attributes, classes, IDs, or content unless required for the fix.
- Do NOT add new elements unless the fix strictly requires it (e.g., a <label>).
- Your entire response must be the fixed HTML and nothing else.`;

  const userPrompt = `Fix the following HTML snippet to resolve this accessibility violation.

Violation Rule: ${violationId}
Violation Description: ${violationDescription}

Broken HTML:
${brokenHtml}`;

  const chatCompletion = await groq.chat.completions.create({
    model: "llama3-8b-8192",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    // Low temperature = more deterministic, rule-following output.
    // We want code fixes, not creative writing.
    temperature: 0.2,
    max_tokens: 512,
  });

  const fixedHtml = chatCompletion.choices[0]?.message?.content?.trim();

  if (!fixedHtml) {
    throw new Error("Groq API returned an empty response for the fix.");
  }

  return fixedHtml;
}

module.exports = { fixViolation };
