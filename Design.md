# Design.md
> CloudGuard Pipeline — Design System
> Version: 1.0.0 | Last updated: July 2026

Copy this entire file into `frontend/src/styles/globals.css` and `app/layout.tsx` imports.
Every colour, font, spacing value, and radius in the app comes from this file — nothing is hardcoded.

---

## 1. Font

We use **Inter** — clean, professional, highly legible at small sizes.

Add to `app/layout.tsx`:
```tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
```

Add to root `<html>` element:
```tsx
<html className={inter.variable}>
```

---

## 2. CSS Custom Properties (globals.css)

Paste this into `frontend/src/styles/globals.css`:

```css
/* ─── Base reset ──────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-family: var(--font-sans), system-ui, sans-serif; }

/* ─── Light theme (default) ───────────────────────────────────── */
:root {
  /* Surfaces */
  --color-bg-primary:       #ffffff;
  --color-bg-secondary:     #f5f5f0;
  --color-bg-tertiary:      #eeede8;

  /* Role backgrounds */
  --color-bg-info:          #e6f1fb;
  --color-bg-success:       #eaf3de;
  --color-bg-warning:       #faeeda;
  --color-bg-danger:        #fcebeb;

  /* Text */
  --color-text-primary:     #1a1a18;
  --color-text-secondary:   #5f5e5a;
  --color-text-muted:       #888780;

  /* Role text */
  --color-text-info:        #0c447c;
  --color-text-success:     #27500a;
  --color-text-warning:     #633806;
  --color-text-danger:      #791f1f;

  /* Borders */
  --color-border:           rgba(0, 0, 0, 0.12);
  --color-border-strong:    rgba(0, 0, 0, 0.22);
  --color-border-stronger:  rgba(0, 0, 0, 0.35);

  /* Score colours (semantic — used for score bar gradient) */
  --color-score-green:      #0ca30c;
  --color-score-amber:      #fab219;
  --color-score-orange:     #ec835a;
  --color-score-red:        #d03b3b;

  /* AWS service brand colours (node icon backgrounds) */
  --aws-kinesis:    #FF9900;
  --aws-s3:         #3F8624;
  --aws-sqs:        #FF4F8B;
  --aws-lambda:     #FF9900;
  --aws-glue:       #8C4FFF;
  --aws-emr:        #C0392B;
  --aws-rds:        #527FFF;
  --aws-dynamo:     #527FFF;
  --aws-redshift:   #8C4FFF;
  --aws-iam:        #DD344C;
  --aws-kms:        #DD344C;
  --aws-waf:        #DD344C;
  --aws-cloudwatch: #FF9900;
  --aws-guardduty:  #DD344C;

  /* Security check dot colours */
  --color-check-iam:    #DD344C;
  --color-check-enc:    #8C4FFF;
  --color-check-detect: #FF9900;

  /* Typography scale */
  --font-sans:   'Inter', system-ui, sans-serif;
  --font-mono:   'Courier New', Courier, monospace;
  --text-xs:     11px;
  --text-sm:     12px;
  --text-base:   13px;
  --text-md:     14px;
  --text-lg:     16px;
  --text-xl:     18px;
  --text-2xl:    22px;
  --text-3xl:    28px;

  /* Font weights */
  --weight-normal:  400;
  --weight-medium:  500;

  /* Spacing */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Layout */
  --topbar-height:  48px;
  --sidebar-width:  200px;
  --panel-width:    280px;

  /* Transitions */
  --transition-fast:   150ms ease;
  --transition-base:   200ms ease;
  --transition-slow:   300ms ease;
}

/* ─── Dark theme ──────────────────────────────────────────────── */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary:       #1e1e1c;
    --color-bg-secondary:     #2c2c2a;
    --color-bg-tertiary:      #383836;

    --color-bg-info:          #042c53;
    --color-bg-success:       #173404;
    --color-bg-warning:       #412402;
    --color-bg-danger:        #501313;

    --color-text-primary:     #e8e6de;
    --color-text-secondary:   #b4b2a9;
    --color-text-muted:       #888780;

    --color-text-info:        #85b7eb;
    --color-text-success:     #c0dd97;
    --color-text-warning:     #fac775;
    --color-text-danger:      #f09595;

    --color-border:           rgba(255, 255, 255, 0.10);
    --color-border-strong:    rgba(255, 255, 255, 0.18);
    --color-border-stronger:  rgba(255, 255, 255, 0.30);
  }
}

/* ─── Base styles ─────────────────────────────────────────────── */
body {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  font-weight: var(--weight-normal);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
```

---

## 3. Typography Rules

| Use case | Size token | Weight | Color token |
|---|---|---|---|
| Section heading (h1) | `--text-2xl` | `--weight-medium` | `--color-text-primary` |
| Panel heading | `--text-lg` | `--weight-medium` | `--color-text-primary` |
| Node label | `--text-md` | `--weight-medium` | `--color-text-primary` |
| Body text | `--text-base` | `--weight-normal` | `--color-text-primary` |
| Supporting text | `--text-sm` | `--weight-normal` | `--color-text-secondary` |
| Caption / badge | `--text-xs` | `--weight-medium` | (role colour) |
| Monospace code | `--font-mono`, `--text-sm` | `--weight-normal` | `--color-text-info` |

**Rules:**
- Maximum two weights in use at any time: 400 and 500
- Never use bold (600+) — too heavy against the host UI
- Sentence case everywhere — never Title Case labels or ALL CAPS headings
- No terminal punctuation on labels, buttons, or headings

---

## 4. Component Tokens

### Nodes
```css
.pipeline-node {
  background: var(--color-bg-primary);
  border: 0.5px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  width: 148px;
  transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
}
.pipeline-node:hover,
.pipeline-node.selected {
  border-color: var(--color-border-stronger);
  box-shadow: 0 0 0 2px var(--color-bg-info);
}
.node-icon {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
}
```

### Buttons
```css
.btn {
  font-size: var(--text-sm);
  font-weight: var(--weight-normal);
  padding: 4px 12px;
  border-radius: var(--radius-md);
  border: 0.5px solid var(--color-border-strong);
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.btn:hover { background: var(--color-bg-tertiary); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  background: var(--color-text-primary);
  color: var(--color-bg-primary);
  border-color: var(--color-text-primary);
}
.btn-primary:hover { opacity: 0.85; }
```

### Chat messages
```css
.msg-agent {
  background: var(--color-bg-secondary);
  border: 0.5px solid var(--color-border);
  border-radius: var(--radius-md);
  align-self: flex-start;
}
.msg-user {
  background: var(--color-bg-info);
  color: var(--color-text-info);
  border-radius: var(--radius-md);
  align-self: flex-end;
}
```

### Badges (severity)
```css
.badge-critical { background: var(--color-bg-danger);  color: var(--color-text-danger); }
.badge-high     { background: var(--color-bg-warning); color: var(--color-text-warning); }
.badge-medium   { background: var(--color-bg-info);    color: var(--color-text-info); }
.badge-passed   { background: var(--color-bg-success); color: var(--color-text-success); }
```

---

## 5. Score Colour Logic

```typescript
// Used in ScoreCard.tsx and ValidationReport.tsx
const SCORE_BANDS = [
  { min: 80, color: '#0ca30c', label: 'Green',  sub: 'Production ready'  },
  { min: 60, color: '#fab219', label: 'Amber',  sub: 'Needs remediation' },
  { min: 40, color: '#ec835a', label: 'Orange', sub: 'Significant gaps'  },
  { min: 0,  color: '#d03b3b', label: 'Red',    sub: 'Block deployment'  },
]

export function getScoreMeta(score: number) {
  return SCORE_BANDS.find(b => score >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1]
}
// Usage: const { color, label, sub } = getScoreMeta(report.score)
// Apply: score number color, progress bar fill color, sub-label text
```

---

## 6. Layout Grid

```css
/* builder/page.tsx root layout */
.builder-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr var(--panel-width);
  grid-template-rows: var(--topbar-height) 1fr;
  height: 100vh;
  overflow: hidden;
}
.topbar   { grid-column: 1 / -1; }
.sidebar  { grid-column: 1; grid-row: 2; overflow-y: auto; }
.canvas   { grid-column: 2; grid-row: 2; position: relative; }
.panel    { grid-column: 3; grid-row: 2; display: flex; flex-direction: column; }
```

---

## 7. Sidebar Section Groups

```
Ingestion       — Kinesis (orange), S3 (green), SQS (pink)
Processing      — Lambda (orange), Glue ETL (purple), EMR (red)
Storage         — RDS (blue), DynamoDB (blue), Redshift (purple)
Security        — IAM Role (red), KMS Key (red), WAF (red)
Observability   — CloudWatch (orange), GuardDuty (red)
```

Section headers use `--text-xs`, `--weight-medium`, `--color-text-muted`, `text-transform: uppercase`, `letter-spacing: 0.05em`.

---

## 8. Dark Mode Rules

- Every element must use CSS custom properties — never hardcode hex values in component styles
- Test dark mode by setting OS preference to dark or using Chrome DevTools → Rendering → Emulate CSS media feature `prefers-color-scheme: dark`
- The background of the root canvas area uses `--color-bg-primary` (white in light, dark grey in dark)
- The sidebar and agent panel use `--color-bg-secondary`
- Node cards use `--color-bg-primary` so they stand out from the sidebar and panel backgrounds
- AWS brand colours (orange, green, purple, etc.) are the same in both modes — they are branding, not UI colours
- Score colours are the same in both modes — they are semantic, not UI colours