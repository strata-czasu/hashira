/**
 * CSS for preview documents. Values mirror Discord's dark-theme Components V2
 * rendering, cross-checked against discohook's preview implementation
 * (github.com/discohook/discohook, packages/site/app/components/preview).
 * They are approximations good enough for visual diffs, not pixel-perfect
 * replicas.
 */

const VARIABLES = `
  --d-page-bg: #1e1f22;
  --d-chat-bg: #313338;
  --d-container-bg: #37373d;
  --d-container-border: #434349;
  --d-text: #dbdee1;
  --d-muted: #949ba4;
  --d-link: #00a8fc;
  --d-btn-text: #ffffff;
  --d-btn-primary-bg: #5865f2;
  --d-btn-secondary-bg: rgba(151, 151, 159, 0.12);
  --d-btn-secondary-text: #ebebed;
  --d-btn-secondary-border: rgba(151, 151, 159, 0.04);
  --d-btn-success-bg: #00863a;
  --d-btn-danger-bg: #d22d39;
  --d-select-bg: #1e1f22;
  --d-code-bg: #2b2d31;
  --d-code-border: #1e1f22;
  --d-spoiler-bg: #1e1f22;
  --d-quote-border: #4e5058;
  --d-divider: rgba(96, 96, 105, 0.5);
  --d-mention-bg: rgba(88, 101, 242, 0.3);
  --d-mention-text: #c9cdfb;
  --d-frame-border: rgba(255, 255, 255, 0.06);
  --d-label-before: #f64949;
  --d-label-after: #35cc6d;
`;

export const PREVIEW_CSS = `
*, *::before, *::after { box-sizing: border-box; }
:root { ${VARIABLES} }
body {
  margin: 0;
  /* Shrink-wrap so screenshots hug the content. */
  width: max-content;
  background: var(--d-page-bg);
  color: var(--d-text);
  font-family: "gg sans", "Noto Sans", -apple-system, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.375;
}

.d-page {
  padding: 16px;
  background: var(--d-chat-bg);
}

/* Discord's message column width. */
.d-components {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 520px;
}

.d-page a { color: var(--d-link); text-decoration: none; }

/* --- Container (type 17) ------------------------------------------------ */
.d-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  overflow: hidden;
  background: var(--d-container-bg);
  border: 1px solid var(--d-container-border);
  border-radius: 8px;
}
.d-container .d-md { font-size: 14px; }
.d-container.d-accent::before {
  content: "";
  position: absolute;
  left: 0; top: 0;
  width: 4px; height: 100%;
  background: var(--d-accent, transparent);
}
.d-spoiled > * { filter: blur(10px); pointer-events: none; }
.d-spoilered img, img.d-spoilered { filter: blur(24px); }

/* --- Text + markdown ---------------------------------------------------- */
.d-md p { margin: 0; }
.d-md h1 { font-size: 1.5em; font-weight: 600; margin: 8px 0 4px; }
.d-md h2 { font-size: 1.25em; font-weight: 600; margin: 6px 0 4px; }
.d-md h3 { font-size: 1em; font-weight: 600; margin: 4px 0; }
.d-md > :first-child { margin-top: 0; }
.d-md blockquote {
  margin: 4px 0;
  padding-left: 12px;
  border-left: 4px solid var(--d-quote-border);
}
.d-md ul, .d-md ol { margin: 4px 0; padding-inline-start: 24px; }
.d-subtext { font-size: 0.85em; color: var(--d-muted); }
.d-code-inline {
  padding: 0.15em 0.25em;
  border-radius: 3px;
  background: var(--d-code-bg);
  font-family: Consolas, "Andale Mono WT", "Courier New", monospace;
  font-size: 0.85em;
}
.d-pre {
  width: fit-content;
  max-width: 100%;
  margin: 4px 0;
  padding: 8px;
  overflow-x: auto;
  white-space: pre-wrap;
  background: var(--d-code-bg);
  border: 1px solid var(--d-code-border);
  border-radius: 8px;
  font-size: 0.85em;
}
.d-pre code {
  font-family: Consolas, "Andale Mono WT", "Courier New", monospace;
}
.d-spoiler {
  border-radius: 4px;
  background: var(--d-spoiler-bg);
  color: transparent;
}
.d-mention {
  padding: 0 2px;
  border-radius: 3px;
  background: var(--d-mention-bg);
  color: var(--d-mention-text);
  font-weight: 500;
}
.d-emoji {
  width: 1.375em;
  height: 1.375em;
  object-fit: contain;
  vertical-align: bottom;
}

/* --- Action rows / buttons (types 1-2) ---------------------------------- */
.d-row { display: flex; gap: 8px; align-items: center; }
.d-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 32px;
  min-width: 60px;
  padding: 2px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: var(--d-btn-text);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}
.d-btn-primary { background: var(--d-btn-primary-bg); }
.d-btn-secondary {
  background: var(--d-btn-secondary-bg);
  border-color: var(--d-btn-secondary-border);
  color: var(--d-btn-secondary-text);
}
.d-btn-success { background: var(--d-btn-success-bg); }
.d-btn-danger { background: var(--d-btn-danger-bg); }
.d-btn-premium { background: linear-gradient(90deg, #80726f, #5865f2); }
.d-disabled { opacity: 0.5; }
.d-select {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 36px;
  min-width: 200px;
  padding: 0 8px;
  border-radius: 8px;
  background: var(--d-select-bg);
  font-size: 14px;
  font-weight: 500;
  color: var(--d-text);
}
.d-select-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.d-chevron { flex: none; opacity: 0.7; }

/* --- Section (type 9) --------------------------------------------------- */
.d-section { display: flex; gap: 12px; }
.d-section-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.d-accessory { align-self: flex-start; flex: none; }
.d-thumbnail {
  width: 85px;
  height: 85px;
  object-fit: cover;
  border-radius: 8px;
}

/* --- Separator (type 14) ------------------------------------------------ */
.d-separator { margin: 0; border: none; border-radius: 999px; }
.d-separator.d-divided { border-top: 1px solid var(--d-divider); }
.d-separator.d-spacing-large { margin-block: 8px; }

/* --- Media gallery (type 12) / file (type 13) --------------------------- */
.d-gallery { display: grid; gap: 4px; }
.d-gallery-item {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}
.d-gallery-item img { width: 100%; height: 100%; object-fit: cover; }
.d-gallery-item.d-spoilered img { filter: blur(24px); }
.d-file-card {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 400px;
  padding: 12px;
  background: var(--d-container-bg);
  border: 1px solid var(--d-container-border);
  border-radius: 8px;
}
.d-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.d-file-icon { flex: none; color: var(--d-muted); }

/* --- Comparison layout -------------------------------------------------- */
.d-compare {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding: 16px;
}
.d-compare.d-stacked { flex-direction: column; }
.d-col { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.d-panel {
  padding: 16px;
  background: var(--d-chat-bg);
  border-radius: 8px;
  outline: 1px solid var(--d-frame-border);
}
.d-label {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--d-page-bg);
}
.d-label-before { background: var(--d-label-before); }
.d-label-after { background: var(--d-label-after); }
`;
