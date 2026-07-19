---
type: preference
title: Developer Preferences
description: Tech stacks, code styles, formatting rules, and development preferences for Krishnakanth.
tags: [dev, coding, rules]
timestamp: 2026-07-19T14:46:00Z
---

# Developer Preferences

## Technology Stack
- **Primary stack**: MERN stack (MongoDB, Express, React, Node.js).
- **Frontend Frameworks**:
  - Vue 3 (prefers Options API over Composition API; uses ESN / CDN modules for PHP legacy migration).
  - React (understands useContext and hooks).
- **Backend Languages**: Node.js/JavaScript, Python, Java (for competitive programming), and legacy PHP.
- **Database Systems**:
  - SQL (PostgreSQL, MySQL).
  - NoSQL (MongoDB connections, indexing, aggregate pipeline optimizations; Redis caching).
- **No TypeScript**: Prefers pure, vanilla JavaScript.

## Code Style & Refactoring Rules
- **Formatting Guidelines**:
  - Always use **standard Markdown tables** (`|` and `---`) for tabular data representation. Never use HTML table tags.
  - Always use **Mermaid.js** code blocks (```mermaid```) to show system designs, graphs, flowcharts, or architecture diagrams.
  - Write clean, decoupled code. Keep professional work isolated from local experimentation.
  - Retain legacy class definitions when refactoring to Bootstrap.

## Local AI & LLM Usage
- **Tools**: Running local quantized models (Qwen 2.5, Llama 3.5, Gemma 4) via Ollama.
- **Quota Management**: Relies heavily on local models when Google Gemini API quotas are exhausted.
- **Hardware Concerns**: MacBook Air runs at 100% GPU utilization during heavy inference, causing heat. Quantized models are run with reduced thread counts to save resource utilization.

## Competitive Programming (LeetCode)
- **Status**: LeetCode "Knight" level.
- **Count**: Solved over 1300 algorithm problems.
- **Topics**: Active focus on dynamic programming (digit DP, bottom-up tabulation, word break, knapsack variants), combinatorics, and MST algorithms.
- **Language**: Prefers Python or Java for contest problems.
