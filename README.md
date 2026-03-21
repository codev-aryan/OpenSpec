<div align="center">

<h1>⚡ OpenSpec</h1>

<p><strong>"Self-Healing" Accessibility for the Open Web</strong></p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org/)
[![Powered by axe-core](https://img.shields.io/badge/Powered%20by-axe--core-663399)](https://github.com/dequelabs/axe-core)
[![Model: Llama 3](https://img.shields.io/badge/LLM-Llama%203%20via%20Groq-orange)](https://groq.com/)
[![FOSS 2026](https://img.shields.io/badge/FOSS%202026-Submission-blue)]()

<br/>

> **Audit. Understand. Fix.** — OpenSpec goes beyond reporting accessibility errors. It fixes them.

</div>

---

## The Problem

**96% of the top 1,000,000 websites fail basic WCAG accessibility tests** (WebAIM Million Report, 2024).

Every major accessibility tool — Lighthouse, axe DevTools, WAVE — stops at the same place: a list of violations. They hand you a report and walk away. The result? Developers are buried under cryptic rule IDs, documentation rabbit holes, and manual fixes that take hours.

The web has a massive accessibility debt, and the current tooling makes developers the ones who pay it.

---

## The Solution

**OpenSpec** is a lightweight, open-source CLI tool that closes the loop. It audits your HTML, understands your violations, and hands you back corrected code — in seconds.

```
$ node index.js ./my-page.html

  Auditing: my-page.html
  Found 7 accessibility violations.
  Generating WCAG-compliant fixes via Llama 3...

  ── Before ──────────────────────────────────────────
  - <img src="hero.png">
  - <button onclick="openMenu()">☰</button>
  - <input type="text" placeholder="Search...">

  ── After ───────────────────────────────────────────
  + <img src="hero.png" alt="Hero banner showing the product dashboard">
  + <button onclick="openMenu()" aria-label="Open navigation menu">☰</button>
  + <input type="text" placeholder="Search..." aria-label="Search the site">
```

No boilerplate. No config files. No cloud uploads. Just your file, fixed.

---

## Key Features

- **🔍 Powered by `axe-core`** — The industry-standard accessibility engine trusted by Google, Microsoft, and Deloitte. Not a custom parser — battle-tested WCAG 2.1/2.2 rule coverage.

- **🤖 AI-Generated Fixes, Not Just Reports** — Uses the Groq API (Llama 3) to read the violation context and generate semantically correct, human-readable ARIA attributes and HTML corrections.

- **⚡ Fast by Design** — Groq's inference API is one of the fastest available. Fixes return in under 3 seconds on typical pages. No GPU required on your machine.

- **🔁 Side-by-Side Diff** — Every fix is shown as a clean Before/After diff directly in the terminal. See exactly what changed and why.

- **📦 Truly Lightweight** — Five dependencies. No Electron, no browser extension, no SaaS subscription. Runs anywhere Node.js runs.

- **🔓 100% Open Source** — MIT licensed. The fix logic, the prompt, the diff renderer — all of it is yours to inspect, fork, and improve.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Accessibility Engine | `axe-core` + `jsdom` |
| AI / LLM | Groq API · Llama 3 (open-weight) |
| Environment Config | `dotenv` |
| License | MIT |

---

## Prerequisites

Before you begin, ensure you have the following:

- **Node.js v18 or higher** — [Download here](https://nodejs.org/). Verify with `node --version`.
- **A Groq API Key** — Free tier available. Get yours at [console.groq.com](https://console.groq.com). No credit card required.

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

**3. Configure your environment**

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Open `.env` and add your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

> **Note:** Your API key is never sent anywhere except directly to the Groq API. OpenSpec has no telemetry and no remote servers.

---

## Usage

Point OpenSpec at any local HTML file:

```bash
node index.js <path-to-html-file>
```

**Example:**

```bash
node index.js ./examples/sample.html
```

**What happens next:**

1. OpenSpec loads your HTML into a `jsdom` environment.
2. `axe-core` runs a full WCAG 2.1 audit and returns all violations.
3. The violations and the relevant HTML nodes are sent to Llama 3 via Groq.
4. The corrected code is returned and displayed as a terminal diff.
5. *(Optional)* The fixed HTML is written to `<filename>.fixed.html`.

---

## Video Demo

> 📹 **3-Minute Walkthrough**

[![OpenSpec Demo](https://img.shields.io/badge/Watch%20Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=PLACEHOLDER)

*The demo covers: running an audit on a real-world HTML snippet, reviewing the violations report, and seeing the AI-generated diff fix 7 issues in under 5 seconds.*

---

## Project Structure

```
openspec/
├── index.js          # Main CLI entry point and orchestrator
├── auditor.js        # Core accessibility engine (axe-core + jsdom)
├── fixer.js          # AI logic and prompt engineering (Groq API)
├── diff.js           # Terminal UI and Before/After diff rendering
├── .env.example      # Environment variable template for contributors
├── package.json      # Node.js dependencies
├── LICENSE           # MIT License
├── README.md         # Project documentation and roadmap
└── examples/
    └── sample.html   # Deliberately broken HTML file for testing
```

---

## Roadmap

- [ ] Watch mode (`--watch`) for live re-auditing on file save
- [ ] JSON/HTML report output flag (`--output report.json`)
- [ ] Support for auditing a live URL (not just local files)
- [ ] VS Code extension wrapper
- [ ] Batch mode for auditing entire directories

---

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request for major changes.

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
