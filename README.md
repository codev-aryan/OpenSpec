<div align="center">

<h1>⚡ OpenSpec</h1>

<p><strong>"Self-Healing" Accessibility for the Open Web</strong></p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org/)
[![Powered by axe-core](https://img.shields.io/badge/Powered%20by-axe--core-663399)](https://github.com/dequelabs/axe-core)
[![Model: Llama 3](https://img.shields.io/badge/LLM-Llama%203%20(Open%20Weights)-orange)](https://llama.meta.com/)
[![FOSS 2026](https://img.shields.io/badge/FOSS%202026-Submission-blue)]()

<br/>

**[🎥 Watch the 3-Minute Video Demo here](https://youtu.be/4YKAK17czUE)**

<br/>

> **Audit. Understand. Fix.** OpenSpec doesn't just report accessibility errors. It eliminates them.

</div>

---

## The Problem

**96% of the top 1,000,000 websites fail basic WCAG accessibility tests** (WebAIM Million Report, 2024).

Every major accessibility tool (Lighthouse, axe DevTools, WAVE) stops at the same place: a list of violations. They hand you a report and walk away. The result? Developers are buried under cryptic rule IDs, documentation rabbit holes, and manual fixes that take hours.

The web has a massive accessibility debt. The existing tooling makes developers the ones who pay it.

---

## The Solution

**OpenSpec** is a lightweight, open-source CLI tool that closes the loop. It audits your HTML, understands each violation, and hands you back corrected code in seconds.

```
$ node index.js examples/sample.html --max 4

  ⚡ OpenSpec — Self-Healing Accessibility
  Powered by axe-core + Llama 3 via Groq

  Auditing: sample.html

  Found 10 broken element(s) across 4 rule(s).
  Generating fixes for the first 4 element(s)...

  ════════════════════════════════════════════════════════════
  VIOLATION 1  [heading-order]
  Impact: MODERATE
  Ensure the order of headings is semantically correct
  ────────────────────────────────────────────────────────────
  🔴  BEFORE

  - <h4>Our Features</h4>

  ────────────────────────────────────────────────────────────
  🟢  AFTER  (AI-generated fix)

  + <h2>Our Features</h2>

  ════════════════════════════════════════════════════════════

  ════════════════════════════════════════════════════════════
  VIOLATION 2  [html-has-lang]
  Impact: SERIOUS
  Ensure every HTML document has a lang attribute
  ────────────────────────────────────────────────────────────
  🔴  BEFORE

  - <html>

  ────────────────────────────────────────────────────────────
  🟢  AFTER  (AI-generated fix)

  + <html lang="en">

  ════════════════════════════════════════════════════════════

  ════════════════════════════════════════════════════════════
  VIOLATION 3  [image-alt]
  Impact: CRITICAL
  Ensure <img> elements have alternative text or a role of none or presentation
  ────────────────────────────────────────────────────────────
  🔴  BEFORE

  - <img src="hero.png">

  ────────────────────────────────────────────────────────────
  🟢  AFTER  (AI-generated fix)

  + <img src="hero.png" alt="Hero image">

  ════════════════════════════════════════════════════════════

  ════════════════════════════════════════════════════════════
  VIOLATION 4  [region]
  Impact: MODERATE
  Ensure all page content is contained by landmarks
  ────────────────────────────────────────────────────────────
  🔴  BEFORE

  - <img src="hero.png">

  ────────────────────────────────────────────────────────────
  🟢  AFTER  (AI-generated fix)

  + <main role="main">
  +   <img src="hero.png">
  + </main>

  ════════════════════════════════════════════════════════════

  ✔ Done. Processed 4 of 10 violation(s) found.
  ℹ  6 violation(s) not processed (run with --max <n> to process more).
  ℹ  Tip: run with --fix to write a corrected .fixed.html file to disk.
  ℹ  Tip: run with --strict to exit 1 on violations — use this in CI to gate deploys.
```

No boilerplate. No config files. No data leaves your machine except to the Groq inference API. Just your file, fixed.

---

## Key Features

- **🔍 Powered by `axe-core`** — The industry-standard accessibility engine trusted by Google, Microsoft, and Deloitte. Battle-tested WCAG 2.1/2.2 rule coverage running inside `jsdom`, no real browser required.

- **🤖 Open-Weight AI Fixes** — Uses **Llama 3 (8B)**, an open-weight model, to read each violation in context and generate semantically correct HTML corrections. *(Note: Currently configured to use Groq's API purely for fast, free inference during the hackathon, but the prompt architecture is provider-agnostic and fully compatible with local FOSS runners like Ollama).*

- **🌐 Audit Files or Live URLs** — Point OpenSpec at a local HTML file or any live website with `--url https://example.com`. No browser, no Puppeteer, no Playwright.

- **💾 Write Fixes to Disk** — Pass `--fix` to apply all AI-generated corrections and write the result to `<filename>.fixed.html`. The original is never modified.

- **🚦 CI/CD Ready** — Pass `--strict` to exit with code `1` when violations are found. Use the official GitHub Action to drop it into any pipeline in seconds.

- **🎛️ Tunable Depth** — Pass `--max <n>` to control how many violations are fixed per run. Default is 2 for speed; crank it up when you want a full sweep.

- **⚡ Fast by Design** — Groq's inference layer is among the fastest available. All Groq calls run concurrently, so fixing 4 violations takes the same time as fixing 1. No GPU, no Docker, no local model weights.

- **🎨 Color-Coded Terminal Diff** — Every fix renders as a Before/After diff with ANSI color highlighting. Impact severity (Critical / Serious / Moderate / Minor) is color-coded at a glance.

- **📦 Truly Lightweight** — Four runtime dependencies. No Electron, no browser extension, no SaaS subscription. Runs anywhere Node.js 18+ runs.

- **🔓 100% Open Source** — MIT licensed. The audit logic, the AI prompt, the diff renderer. All of it is yours to inspect, fork, and extend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ (CommonJS) |
| Accessibility Engine | `axe-core` + `jsdom` |
| AI / LLM | **Llama 3** `llama-3.1-8b-instant` (Open-weight model) <br/> *Inference provided by Groq for demo speed* |
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
node index.js examples/sample.html --fix
```

Applies all AI-generated corrections and writes the result to `sample.fixed.html` in the same directory. The original file is never touched.

### Control how many violations are fixed

```bash
node index.js examples/sample.html --max 4
```

Defaults to `2` for fast runs. Pass any number to sweep more violations in one pass. All fixes are generated concurrently, so fixing 4 takes the same time as fixing 1.

### Gate CI deploys on accessibility

```bash
node index.js ./src/index.html --strict
```

Exits with code `1` if any violations are found, exit `0` means clean. This flag only affects the exit code, making it safe to drop into any pipeline.

### Combining flags

All flags are composable and can appear in any order:

```bash
# Audit, fix all violations, write to disk, and fail CI if any remain
node index.js examples/sample.html --max 4 --fix --strict

# Audit a live URL and fail CI if violations are found
node index.js --url https://example.com --strict
```

---

## GitHub Actions

OpenSpec ships with an official GitHub Action. Add it to any workflow to automatically audit your HTML and block deployments when accessibility violations are found.

### Setup

Add your Groq API key to your repository secrets:

1. Go to **Settings > Secrets and variables > Actions**
2. Click **New repository secret**
3. Name it `GROQ_API_KEY` and paste your key

### Basic usage

```yaml
name: Accessibility Audit

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run OpenSpec
        uses: codev-aryan/openspec@main
        with:
          target: index.html
          groq_api_key: ${{ secrets.GROQ_API_KEY }}
```

This will audit `index.html` on every push and pull request. The workflow fails if any WCAG violations are found.

### Action inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `target` | Yes | `index.html` | File path or URL to audit |
| `groq_api_key` | Yes | | Your Groq API key |
| `max` | No | `5` | Max number of violations to process |


### Full pipeline example

```yaml
name: Accessibility Gate

on:
  pull_request:
    branches: [main]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Audit accessibility
        uses: codev-aryan/openspec@main
        with:
          target: ./src/index.html
          groq_api_key: ${{ secrets.GROQ_API_KEY }}
          max: 10
```

Pull requests that introduce accessibility violations will be blocked automatically.

---

## Run the included example

```bash
node index.js examples/sample.html
```

`examples/sample.html` is a deliberately inaccessible page with violations across missing alt attributes, missing lang attribute, skipped heading levels, unlabelled inputs, icon-only buttons, non-descriptive link text, and low-contrast text. It's designed to demonstrate OpenSpec's full audit-and-fix loop out of the box.

---

## Project Structure

```
openspec/
├── index.js          # CLI entry point and orchestrator
├── auditor.js        # axe-core + jsdom: virtual DOM audit engine (file + URL)
├── fixer.js          # Groq SDK + Llama 3: prompt engineering and fix generation
├── diff.js           # Terminal UI: ANSI color diff renderer, zero extra deps
├── action.yml        # GitHub Action definition
├── examples/
│   └── sample.html   # Deliberately broken HTML with WCAG violations
├── .env.example      # Environment variable template
├── package.json      # Node.js dependencies
└── LICENSE           # MIT License
```

Each module owns exactly one concern. `index.js` contains no business logic, only orchestration. `auditor.js`, `fixer.js`, and `diff.js` are independently testable and swappable without touching the rest of the codebase.

---

## How the AI Fix Works

The prompt sent to Llama 3 is intentionally strict:

- The system prompt constrains the model to act as a pure **code transformer**, not an explainer. It must return raw HTML and nothing else.
- `temperature: 0.2` keeps output deterministic and prevents the model from adding markdown fences, prose, or creative rewrites.
- Each call receives only the single failing HTML node and its axe-core rule description. No surrounding page context that could dilute the output.

The returned string is dropped directly into the terminal diff with no post-processing required. When `--fix` is passed, it is applied back to the original HTML via surgical string replacement. Only the exact failing nodes are swapped, everything else is preserved byte-for-byte.

---

## CLI Reference

| Flag | Mode | Description |
|---|---|---|
| `<file>` | File | Path to a local HTML file to audit |
| `--url <url>` | URL | Fetch and audit a live URL |
| `--max <n>` | Both | Number of violations to fix per run (default: 2) |
| `--fix` | File only | Write AI-corrected HTML to `<filename>.fixed.html` |
| `--strict` | Both | Exit code `1` if any violations are found |

---

## Roadmap

- [ ] Watch mode (`--watch`) for live re-auditing on file save
- [ ] `--output report.json` flag for structured violation + fix export
- [ ] Support for auditing entire directories in batch mode
- [ ] Live progress indicator while Groq fixes are being generated

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
