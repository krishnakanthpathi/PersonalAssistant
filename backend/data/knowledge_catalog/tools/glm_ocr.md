---
type: tool_group
title: GLM-OCR Vision Tool
description: High-precision OCR model (glm-ocr) conditioned on task trigger prefixes for text recognition, table parsing, formula extraction, and figure descriptions.
tags: [ocr, glm-ocr, vision, image, text_extraction, table_recognition, formula_recognition, figure_recognition, latex, document, scan, transcription, reading, pdf_page]
tools: [glm_ocr]
timestamp: 2026-08-16T20:00:00.000Z
---

# GLM-OCR Vision Tool

Specialized vision-language Optical Character Recognition (OCR) tool powered by `glm-ocr`. Provides conditioned document understanding and high-precision extraction.

### Available Tools

- **`glm_ocr`**: Performs OCR on an image file (`filePath`) or base64 image (`imageBase64`) with task-specific conditioning:
  - **`text`** (`Text Recognition:`): Transcribes all document plain text, layout, titles, headers, and paragraphs.
  - **`table`** (`Table Recognition:`): Extracts tables into clean Markdown or HTML structure.
  - **`formula`** (`Formula Recognition:`): Extracts complex mathematical equations and symbols into LaTeX notation.
  - **`figure`** (`Figure Recognition:`): Generates descriptions and details from figures, charts, and diagrams.
