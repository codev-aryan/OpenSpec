<div align="center">

<h1>⚡ OpenSpec</h1>

<p><strong>"Self-Healing" Accessibility for the Open Web</strong></p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org/)
[![Powered by axe-core](https://img.shields.io/badge/Powered%20by-axe--core-663399)](https://github.com/dequelabs/axe-core)
[![Model: Llama 3](https://img.shields.io/badge/LLM-Llama%203%20via%20Groq-orange)](https://groq.com/)
[![FOSS 2026](https://img.shields.io/badge/FOSS%202026-Submission-blue)]()

<br/>

> **Audit. Understand. Fix.** — OpenSpec doesn't just report accessibility errors. It eliminates them.

</div>

---

## The Problem

**96% of the top 1,000,000 websites fail basic WCAG accessibility tests** (WebAIM Million Report, 2024).

Every major accessibility tool — Lighthouse, axe DevTools, WAVE — stops at the same place: a list of violations. They hand you a report and walk away. The result? Developers are buried under cryptic rule IDs, documentation rabbit holes, and manual fixes that take hours.

The web has a massive accessibility debt. The existing tooling makes developers the ones who pay it.

---

## The Solution

**OpenSpec** is a lightweight, open-source CLI tool that closes the loop. It audits your HTML, understands each violation, and hands you back corrected code — in seconds.

```
$ node index.js ./examples/sample.html

  ⚡ OpenSpec — Self-Healing Accessibility
  Powered by axe-core + Llama 3 via Groq

  Auditing: sample.html
  Found 6 accessibility violation(s).
  Generating fixes for the first 2...

  ════════════════════════════════════════════════════════════
  VIOLATION 1  [image-alt]
  Impact: CRITICAL
  Ensures <img> elements have alternate text or a role of none or presentation.

  ────────────────────────────────────────────────────────────
  🔴  BEFORE

  - <img src="hero.png" />

  ────────────────────────────────────────────────────────────
  🟢  AFTER  (AI-generated fix)

  + <img src="hero.png" alt="Hero banner showing the product dashboard" />

  ════════════════════════════════════════════════════════════

  ✔ Done. Processed 2 of 6 violation(s) found.
  ℹ  Tip: run with --fix to write a corrected .fixed.html file to disk.
  ℹ  Tip: run with --strict to exit 1 on violations — use this in CI to gate deploys.
```

No boilerplate. No config files. No data leaves your machine except to the Groq inference API. Just your file, fixed.

---

## Key Features

- **🔍 Powered by `axe-core`** — The industry-standard accessibility engine trusted by Google, Microsoft, and Deloitte. Battle-tested WCAG 2.1/2.2 rule coverage running inside `jsdom`, no real browser required.

- **🤖 AI-Generated Fixes, Not Just Reports** — Uses the Groq API (Llama 3) to read each violation in context and generate semantically correct, human-readable ARIA attributes and HTML corrections.

- **🌐 Audit Files or Live URLs** — Point OpenSpec at a local HTML file or any live website with `--url https://example.com`. No browser, no Puppeteer, no Playwright.

- **💾 Write Fixes to Disk** — Pass `--fix` to apply all AI-generated corrections and write the result to `<filename>.fixed.html`. The original is never modified.

- **🚦 CI/CD Ready** — Pass `--strict` to exit with code `1` when violations are found. Drop it into any pipeline to gate deploys on accessibility.

- **⚡ Fast by Design** — Groq's inference layer is among the fastest available. Fixes return in under 3 seconds per violation. No GPU, no Docker, no local model weights.

- **🎨 Color-Coded Terminal Diff** — Every fix renders as a Before/After diff with ANSI color highlighting. Impact severity (Critical / Serious / Moderate / Minor) is color-coded at a glance.

- **📦 Truly Lightweight** — Four runtime dependencies. No Electron, no browser extension, no SaaS subscription. Runs anywhere Node.js 18+ runs.

- **🔓 100% Open Source** — MIT licensed. The audit logic, the AI prompt, the diff renderer — all of it is yours to inspect, fork, and extend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ (CommonJS) |
| Accessibility Engine | `axe-core` + `jsdom` |
| AI / LLM | Groq API · Llama 3 `llama-3.1-8b-instant` (open-weight) |
| Environment Config | `dotenv` |
| Terminal UI | Raw ANSI escape codes (zero extra deps) |
| License | MIT |

---

## Prerequisites

- **Node.js v18 or higher** — [Download here](https://nodejs.org/). Verify with `node --version`.
- **A Groq API Key** — Free tier available, no credit card required. Get yours at [console.groq.com](https://console.groq.com).

---

## Installation

**1. Clone the repository**

```bash
git clone https://github.com/codev-aryan/openspec.git
cd openspec
```

**2. Install dependencies**

```bash
npm install
```

This installs: `axe-core`, `jsdom`, `groq-sdk`, `dotenv`.

**3. Configure your environment**

```bash
cp .env.example .env
```

Open `.env` and add your key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

> **Privacy note:** Your API key is read locally by `dotenv`. OpenSpec has no telemetry, no analytics, and no remote servers beyond the Groq inference API call you explicitly trigger.

---

## Usage

### Audit a local file

```bash
node index.js <path-to-html-file>
```

### Audit a live URL

```bash
node index.js --url https://example.com
```

> **Note:** URL mode audits the initial HTML payload returned by the server. JavaScript-rendered content (SPAs) may show fewer violations than a real browser would. Static and server-rendered sites audit accurately.

### Write fixes to disk

```bash
node index.js ./examples/sample.html --fix
```

Applies all AI-generated corrections to the original HTML and writes the result to `sample.fixed.html` in the same directory. The original file is never touched.

### Gate CI deploys on accessibility

```bash
node index.js ./src/index.html --strict
```

Exits with code `1` if any violations are found. Exit `0` means clean. Combine with `--fix` for a full self-healing pipeline step.

### Combining flags

All flags are composable and can appear in any order:

```bash
# Audit a file, write fixes, and fail CI if violations remain
node index.js ./src/index.html --fix --strict

# Audit a live URL and fail CI if violations are found
node index.js --url https://example.com --strict
```

### Tune how many violations are auto-fixed per run

Open `index.js` and adjust this constant near the top:

```js
const MAX_VIOLATIONS = 2; // increase to process more violations per run
```

### GitHub Actions example

```yaml
- name: Audit accessibility
  run: node index.js ./src/index.html --strict
```

---

## Run the included example

```bash
node index.js ./examples/sample.html
```

`examples/sample.html` is a deliberately inaccessible page containing 6 violations across missing `alt` tags, unlabelled form inputs, icon-only buttons, non-descriptive link text, and skipped heading levels — designed to demonstrate OpenSpec's full range.

---

## Video Demo

> 📹 **3-Minute Walkthrough**

[![OpenSpec Demo](https://img.shields.io/badge/Watch%20Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=PLACEHOLDER)

*The demo covers: running an audit on `sample.html`, reviewing the CRITICAL/SERIOUS impact breakdown, and watching Llama 3 fix 2 violations live in under 6 seconds.*

---

## Project Structure

```
openspec/
├── index.js          # CLI entry point and orchestrator — thin by design
├── auditor.js        # axe-core + jsdom: virtual DOM audit engine (file + URL)
├── fixer.js          # Groq SDK + Llama 3: prompt engineering and fix generation
├── diff.js           # Terminal UI: ANSI color diff renderer, zero extra deps
├── .env.example      # Environment variable template
├── package.json      # Node.js dependencies
├── LICENSE           # MIT License
├── README.md         # You are here
└── examples/
    └── sample.html   # Deliberately broken HTML with 6 WCAG violations
```

Each module owns exactly one concern. `index.js` contains no business logic — only orchestration. `auditor.js`, `fixer.js`, and `diff.js` are independently testable and swappable without touching the rest of the codebase.

---

## How the AI Fix Works

The prompt sent to Llama 3 is intentionally strict:

- The system prompt constrains the model to act as a pure **code transformer**, not an explainer — it must return raw HTML and nothing else.
- `temperature: 0.2` keeps output deterministic and prevents the model from adding markdown fences, prose, or creative rewrites.
- Each call receives only the single failing HTML node and its axe-core rule description — no surrounding page context that could dilute the output.

The returned string is dropped directly into the terminal diff with no post-processing required. When `--fix` is passed, it is also applied back to the original HTML via surgical string replacement — only the exact failing nodes are swapped, everything else is preserved byte-for-byte.

---

## CLI Reference

| Flag | Mode | Description |
|---|---|---|
| `<file>` | File | Path to a local HTML file to audit |
| `--url <url>` | URL | Fetch and audit a live URL |
| `--fix` | File only | Write AI-corrected HTML to `<filename>.fixed.html` |
| `--strict` | Both | Exit code `1` if any violations are found |

---

## Roadmap

- [ ] Watch mode (`--watch`) for live re-auditing on file save
- [ ] `--output report.json` flag for structured violation + fix export
- [ ] Support for auditing entire directories in batch mode
- [ ] VS Code extension wrapper

---

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request for significant changes.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for details.

---

<div align="center">

Built for **FOSS 2026** by [@codev-aryan](https://github.com/codev-aryan)

*Making the web accessible shouldn't require a manual.*

</div>
