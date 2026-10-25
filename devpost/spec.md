---
doc: spec
status: approved
---

# Rollcheck — Technical Spec

## How This Works, In Plain Language
Rollcheck is a single web page that runs entirely in the browser. There is no server: once the page has loaded, the student file is read and checked on the user's own computer and never sent anywhere.

It has three parts:

1. **The engine** (`src/engine/`) — plain TypeScript functions with no UI. Given the cells of a sheet and a list of rules, it decides each student's group and writes the reasons. It never guesses: every cell keeps the exact text from the file next to the number it could (or couldn't) read from it. This is the part that is fully unit-tested on its own — the learner's practice goal.
2. **The background worker** (`src/worker/`) — a Web Worker is a second thread the browser runs behind the page. Reading a 50,000-row file and checking it happens there, so the page never freezes and can show "Reading rows… 32,000 of 51,200".
3. **The screens** (`src/ui/`) — React components for File, Rules and Results. They only display what the engine returns and send it the user's choices. No eligibility logic lives in the UI.

Why this shape: the engine is the product's promise (counts add up, nothing guessed), so it is kept small, pure and testable. The worker exists only because large exports must stay responsive. Nothing else is needed: no accounts, no storage, no backend.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **Open** → Vite-built static page loads; theme read from `localStorage` (the only thing remembered).
2. **Drop a file / Try sample data** → `FileStage` reads the file into bytes (or fetches the bundled `sample/rollcheck-sample.csv`) → sends bytes + file name to the worker.
3. **Worker reads it** → `engine/parse` detects type (.csv via Papa Parse with delimiter detection, .xlsx via SheetJS) → `engine/normalise` finds the header row, renames duplicate/blank headers, builds `Cell { raw, value, kind }` for every cell → `engine/columns` tags column types and auto-detects ID / name / match columns → worker posts progress messages, then the `Table` (headers, rows, notices, sheet list).
4. **Rules screen** → reducer stores the table; `RulesStage` shows summary, preview, pickers, rule builder. Rule-set .json loads through `engine/ruleset`. Warnings (mostly non-numeric column, missing column) come from engine helpers, not the UI.
5. **Check students** → table + rules + options go to the worker → `engine/evaluate` (each rule per row) → `engine/review` (duplicate IDs, likely duplicate students) → `engine/group` (precedence, reasons, sort order, counts, rule impact) → `engine/invariant` (counts add up, every row in exactly one group). Pass → `CheckResult` posted back. Fail → an error, no results.
6. **Results screen** → `Counters`, `RuleImpact`, virtualised `ResultsTable`, `RowDetailPanel` read from `CheckResult`. Filter and search are UI state over the result, not a re-check.
7. **Download / Save rule set / Print** → `io/exportXlsx` builds a 3-sheet workbook with SheetJS and triggers a download; `io/download` saves rule-set .json; Print uses `window.print()` with print CSS.
8. **Change rules** → back to Rules, table and rules kept. **Start over** → reducer reset; worker drops its copy.

## Stack
All choices below are the learner's stated technical preferences, verified against current releases on 2026-10-24.

| Piece | Version | Why | Docs |
|---|---|---|---|
| Vite | 8.3.x | Fast static build, no backend | https://vite.dev/guide/ |
| React | 19.3.x | Learner's familiar UI library | https://react.dev/ |
| TypeScript | **6.0.3** (strict) | Learner's choice. Pinned below 7 because `typescript-eslint` 8.72 supports TS `<6.1.0` | https://www.typescriptlang.org/docs/ |
| Tailwind CSS | 4.3.x via `@tailwindcss/vite` | Learner's choice; design tokens as CSS variables | https://tailwindcss.com/docs |
| SheetJS (`xlsx`) | **0.20.3**, installed from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` | Read and write .xlsx. Official CDN tarball, not the stale npm-registry package (verified on docs.sheetjs.com) | https://docs.sheetjs.com/ |
| Papa Parse | 5.7.x | CSV with delimiter detection and streaming | https://www.papaparse.com/docs |
| @tanstack/react-virtual | 3.14.x | Virtualised results table for 50k rows | https://tanstack.com/virtual/latest |
| lucide-react | 1.x, 16px icons | Status and UI icons | https://lucide.dev/guide/packages/lucide-react |
| @fontsource/ibm-plex-sans, @fontsource/ibm-plex-mono | 5.3.x | Self-hosted fonts, no CDN | https://fontsource.org/fonts/ibm-plex-sans |
| Vitest | 5.0.x + jsdom | Engine unit tests, UI tests | https://vitest.dev/guide/ |
| React Testing Library | 16.3.x | Main-flow UI tests | https://testing-library.com/docs/react-testing-library/intro/ |
| ESLint 10 + typescript-eslint 8.72 | | Lint gate | https://typescript-eslint.io/getting-started |

State: React `useReducer` in one `AppState`; no state library (learner's choice).
Node 22 (installed: v22.23.2). npm 10.

## Where It Runs and How Someone Tries It
- Runtime: any modern desktop browser (Chrome, Edge, Firefox, Safari). No API keys, no environment variables.
- Run locally: `npm install`, then `npm run dev`, open `http://localhost:5173`.
- Tests: `npm test`. All gates: `npm run check` (type-check, lint, tests, build).
- Demo recording: local dev server or the deployed URL → click **Try sample data** → **Check students**.
- Submission needs the video and the public GitHub repo; deployment is optional and extra.
- **Deploy: Vercel** (chosen by the learner at ship time; GitHub Pages was the original recommendation). `vercel.json` runs `npm ci` and `npm run build` and serves `dist/`. Vite `base: './'` keeps the build portable to any static host. Live: https://rollcheck-six.vercel.app (auto-deploys from `main`). Repository: https://github.com/ankitrajchoudhari/rollcheck

## Look and Feel
Implements `prd.md > Look and Feel`.
- **Tokens** in `src/styles/index.css` as CSS variables, mapped into Tailwind with `@theme`:
  - Light: `--bg #FAF9F6`, `--surface #FFFFFF`, `--text #1C1B19`, `--muted #6B6860`, `--line #E4E1DA`, `--accent #1F5F46`; status `--ok #2F7A4B`, `--no #A33B2B`, `--review #B7791F`.
  - Dark (re-tuned, not inverted): `--bg #161614`, `--surface #1E1D1B`, `--text #ECE9E2`, `--muted #A39F95`, `--line #34322E`, `--accent #6FBF98`; status `--ok #74C493`, `--no #E58A7B`, `--review #E3B062`.
  - Status text on tinted backgrounds checked for WCAG AA; where `#B7791F` fails AA as text on white, the label uses a darker review text tone (`#8A5A12`) while `#B7791F` stays the icon/border colour.
- **Dark mode:** `prefers-color-scheme` by default; toggle sets `data-theme="light|dark"` on `<html>` and saves it to `localStorage`.
- **Type:** Plex Sans UI, Plex Mono for values/IDs/reasons' quoted values; `font-variant-numeric: tabular-nums` on tables and counters; scale 13/14/16/20/28 as Tailwind font-size tokens.
- **Shape:** radius ≤ 6px; 1px `--line` borders; one shadow token used only by the detail panel and popovers; spacing on Tailwind's 4px scale; content `max-w-[1200px]`.
- **Motion:** 150ms transitions on state changes only; disabled under `prefers-reduced-motion`.
- **Icons:** lucide 16px: Eligible `CircleCheck`, Not eligible `CircleX`, Needs review `TriangleAlert` — always with the text label.
- **Copy:** constants in `src/ui/copy.ts`; calm, no exclamation marks.
- **Layout:** left-aligned header (no centred hero); stepper under it; single column below 768px with the table scrolling sideways.
- **Print:** `@media print` hides controls, shows a print header (file, date, rules, counts) and the full table (virtualisation off while printing).

## Components

### Engine — Types (`src/engine/types.ts`)
`Cell { raw: string; value: number | null; kind: 'number' | 'text-number' | 'comma-decimal' | 'text' | 'blank'; shown?: string }`, `Table`, `Rule`, `RuleSet`, `RowOutcome`, `CheckResult`. Shared by every module; no runtime code.

### Engine — Parse (`src/engine/parse.ts`)
Implements `prd.md > Reading the File`.
- Detect type by extension and magic bytes; anything else → `UnsupportedFileError` ("Only .csv and .xlsx files are supported.").
- **CSV:** Papa Parse with `delimiter: ''` (auto: comma, semicolon, tab), `header: false`, `skipEmptyLines: false`, all values as strings; streamed in chunks for progress.
- **XLSX:** SheetJS `read(bytes, { cellDates: false, cellNF: true, cellText: true })`; list sheet names; read the chosen sheet as a grid.
  - Text cells → `raw` is the stored string, untouched (so "AB", "10 ", "75%" stay exact).
  - Number cells → `raw` is the full stored value (`String(v)`), so a cell Excel shows as "75" but stores 74.6 displays as 74.6. Excel's displayed text is kept in `shown` for the detail panel.
  - Date-formatted cells and zero-padded number formats (e.g. `00000`) → `raw` is Excel's displayed text (dates stay as displayed, "00417" stays "00417").
  - Percent-formatted numbers → compared as the percent (0.746 → 74.6), displayed as `74.6%`; the stored 0.746 is shown in the row detail.
- Corrupt/unreadable → "This file could not be read. Check that it opens in Excel, then try again."

### Engine — Normalise (`src/engine/normalise.ts`)
Implements `prd.md > Reading the File`, `prd.md > States and Boundaries`.
- Header = first row with any non-blank cell; rows above it dropped and noted.
- Blank header → "Column N" (N = 1-based column position); duplicate header → "Name (2)". Each rename becomes a notice.
- Trailing fully-blank rows dropped; blank rows in the middle are kept as student rows (they surface as blanks in Needs review). **Empty / headers only** → `NoRowsError` ("This file has no student rows.").
- `excelRow` kept for every row (actual sheet row number) so reasons match what users see in Excel.
- **`classifyCell(raw)`** — the core of "never guess":
  - `blank`: empty or whitespace only.
  - `number`: matches `^-?\d+(\.\d+)?$` exactly (no spaces) → value parsed.
  - `text-number`: a number with surrounding spaces and/or a trailing `%` ("75%", "75 %", "10 ") → value parsed (75, 75, 10), flagged as stored as text.
  - `comma-decimal`: digits with one comma and no dot ("74,6", "1,234") → value `null`, flagged, never guessed.
  - `text`: everything else ("AB", "N/A", "-") → value `null`.

### Engine — Columns (`src/engine/columns.ts`)
Implements `prd.md > Reading the File`, `prd.md > Building Rules`.
- Column type over non-blank cells: all `number` → number; none parseable → text; else mixed.
- `isMostlyNonNumeric(col)`: more than 50% of non-blank cells are not `number`/`text-number`.
- Auto-detect by header (case-insensitive): ID `roll|id|reg|enrol|admission|student no`; name `name`; match columns `dob|date of birth|birth|email|mail`, falling back to none. Sample data pre-sets `age` + `school`.

### Engine — Evaluate (`src/engine/evaluate.ts`)
Implements `prd.md > Building Rules`, `prd.md > Checking Students`.
Per rule per row → `RuleOutcome { result: 'pass' | 'fail' | 'review', reasons: string[] }`.
- **is at least L / is at most L** (margin m ≥ 0):
  - `blank` → review "X is blank."; `text` → review "X is 'AB', not a number. Check manually."; `comma-decimal` → review "X is '74,6', which uses a comma. Check whether it means 74.6.".
  - `text-number` → evaluated on its parsed value **and** a review note "X is '75 %', a number stored as text. Confirm the value."
  - Numeric value v: if m > 0 and |v − L| < m (strict boundary) → review "X is 75.4, within 1 of the 75 limit. Confirm before deciding."; else pass/fail ("X is 72, below the 75 limit." / "X is 14, above the 10 limit.").
- **equals / is not / is one of:** compare `trim(raw).toLowerCase()`; if both sides parse as `number`/`text-number`, compare numbers ("75" = "75.0"). Blank cell → review. "is one of" values split on new lines or `;` (not commas, so "74,6" stays one value). No margin.
- **is not blank:** blank → fail ("Fees status is blank."). This is the one rule where blank is a decided failure, not a review.
- Reasons quote the raw value: numbers unquoted (`74.6`), text quoted (`'AB'`).

### Engine — Review Detection (`src/engine/review.ts`)
Implements `prd.md > Checking Students`.
- **Duplicate IDs** on the ID column (trimmed, case-insensitive; blank IDs ignored). Every row in the group flagged, naming the others: "Roll number S017 appears twice (rows 18 and 203)." / "appears 3 times (rows …)". Label uses the ID column's header.
- **Likely duplicate students:** `normaliseName` = lowercase, trim, remove dots, collapse spaces, split into parts. Two names match when they have the same number of parts and each part is equal, or one is a single letter equal to the other's first letter. Plus all chosen match columns equal (trimmed, case-insensitive, non-blank). Grouped by last name part first to stay fast on 50k rows. Both rows flagged, each naming the other's row: "Possible duplicate: 'S. Kumar' (row 203) and 'SURESH KUMAR' share date of birth 2004-03-11."
- Exact-duplicate-ID pairs are not also reported as likely-duplicate students.

### Engine — Group (`src/engine/group.ts`)
Implements `prd.md > Checking Students`, `prd.md > Reviewing Results`.
- Precedence per row: any rule `fail` → **Not eligible**; else any rule `review` or row-level flag → **Needs review**; else **Eligible** ("Meets all N rules.").
- Reason = all sentences joined with a space, failures first, then review notes, then duplicate notes.
- Sort: Needs review, Not eligible, Eligible; file order within each.
- Rule impact: per rule, count of rows where it failed and rows where it was review; plus duplicate-ID and likely-duplicate counts.

### Engine — Invariant (`src/engine/invariant.ts`)
Implements `prd.md > Checking Students`.
`assertInvariant(result, totalRows)`: eligible + notEligible + review === total, each row index appears exactly once, every row has a non-empty reason. Throws `InvariantError`; the UI shows "The counts did not add up, so no results are shown. Nothing was changed." and no table.

### Engine — Rule Sets (`src/engine/ruleset.ts`)
Implements `prd.md > Saving and Sharing Results`.
JSON `{ "app": "rollcheck", "version": 1, "rules": [...], "matchColumns": [...], "idColumn", "nameColumn" }` — column names only, no student data. `parseRuleSet(text)` validates shape (max 5 rules, known conditions) and returns `{ ruleSet, missingColumns }` against the current headers so the UI can ask the user to remap.

### Engine — Check Pipeline (`src/engine/check.ts`)
`checkTable(table, rules, options, onProgress?) → CheckResult` — runs evaluate → review → group → invariant. The single entry point the worker (and tests) call.

### Engine — Formula Comparison (`src/engine/formula.ts`)
Implements `prd.md > Comparing With a Spreadsheet Formula`. `compareWithFormula(table, rules, result)` evaluates the usual `IF(AND(...))` per row with Excel's rules (text > any number, empty = 0 or "", `=` case-insensitive without trimming, a number never equals text, a cell of spaces is not blank) and returns each verdict plus the rows that differ. `formulaText(rules)` writes the formula with column names. Runs on the page; it does not touch `CheckResult`.

### Worker (`src/worker/rollcheck.worker.ts`, `src/worker/client.ts`)
Implements `prd.md > Reading the File` (large files), `prd.md > Checking Students`.
- Messages in: `{ type: 'read', bytes, fileName, sheet? }`, `{ type: 'check', rules, options }`, `{ type: 'reset' }`. Messages out: `progress { phase, done, total }`, `table`, `result`, `error { code, message }`.
- The worker keeps the parsed table so 'check' doesn't resend it; main thread also receives the table once for preview and display.
- Progress: CSV reports rows as they stream; .xlsx reports "Reading file…" during SheetJS's single read (it can't report partway), then row progress for normalising and checking. Throttled to ~10 updates/second.
- `client.ts` wraps the worker in promises. If `Worker` is unavailable (tests in jsdom), it runs the same engine calls in-thread.

### IO (`src/io/`)
- `exportXlsx.ts` — Implements `prd.md > Saving and Sharing Results`. Sheets: **Results** (original headers + Status + Reason; every cell written as its `raw` text so nothing is rounded or reformatted), **Rules used** (rule rows, margin, timestamp, file name, sheet, counts, total), **Needs review**. File name `<original>-rollcheck.xlsx`.
- `download.ts` — Blob download helper for .xlsx and rule-set .json.
- `readFile.ts` — `File` → `ArrayBuffer`; extension check before sending to the worker.

### App State (`src/app/state.ts`, `src/app/App.tsx`)
Implements `prd.md > Screens and Layout`.
`useReducer` with `AppState { stage: 'file'|'rules'|'results', busy?: Progress, error?, fileName?, sheets?, sheet?, table?, idColumn?, nameColumn?, matchColumns, rules, notices, result?, filter, search, selectedRow? }`. Actions: `fileRead`, `sheetChosen`, `columnsChanged`, `rulesChanged`, `ruleSetLoaded`, `checkDone`, `filterSet`, `searchSet`, `rowOpened`, `changeRules`, `startOver`, `failed`. Stepper derives which steps are reachable from state.

### UI — Shell (`src/ui/shell/`)
`Header` (name, one line, theme toggle), `Stepper` (1 File · 2 Rules · 3 Results; `aria-current="step"`), `ThemeToggle`, `Notice` (info / warning / error banners, `role="status"` or `role="alert"`).

### UI — File Stage (`src/ui/file/`)
Implements `prd.md > Screens and Layout > 1 · File`. `DropZone` (drag-and-drop + hidden `<input type=file accept=".csv,.xlsx">`, Enter/Space opens picker, disabled while reading, progress text), "Try sample data" button, privacy line, error notices.

### UI — Rules Stage (`src/ui/rules/`)
Implements `prd.md > Screens and Layout > 2 · Rules`, `prd.md > Building Rules`. `FileSummary`, `SheetPicker`, `ColumnPickers` (ID, name, "Also match duplicates on" multi-select), `PreviewTable` (5 rows, type tag per column, mixed highlighted), `RuleBuilder` + `RuleRow` (labelled selects/inputs; Move up / Move down / Remove buttons; margin input on number rules; value hidden for "is not blank"; textarea-style list for "is one of"), `LoadRuleSet`, `RemapColumns` dialog, mostly-non-numeric warning, **Check students**.

### UI — Results Stage (`src/ui/results/`)
Implements `prd.md > Screens and Layout > 3 · Results`, `prd.md > Reviewing Results`. `CheckedLine` ("N of N students checked", `aria-live="polite"`), `Counters` (three toggle buttons, `aria-pressed`), `RuleImpact`, `SearchBox`, `ResultsTable` (TanStack Virtual, sticky header, rows are buttons → open detail; Status cell = icon + label), `RowDetailPanel` (side panel on desktop, full-screen sheet on phone; focus trapped, Esc closes, focus returns to the row), `ResultActions` (Download, Save rule set, Print, Change rules, Start over), `PrintHeader`.

### Sample Data (`scripts/make-sample.mjs`, `public/sample/`)
Implements `prd.md > Sample Data`.
Node script reads `data/source/student-mat.csv` (UCI, CC BY 4.0), takes the first rows in file order, adds `Student ID` (S001…) and synthetic `Student Name` (from a fixed list of common Portuguese first/last names — the dataset's schools are Portuguese; no real students), inserts the documented traps, writes `public/sample/rollcheck-sample.csv` (semicolon-separated, ~120 rows) and prints a trap manifest that `DATA_SOURCES.md` records. Deterministic: same output every run.
Traps: G3 `9.6`; absences `AB`; blank absences; absences `10 ` (trailing space); G3 `75%`-style text (`12%`); G3 `9,8`; one duplicate Student ID; one student repeated as "A. Silva" / "ANA SILVA" with the same age and school.
`src/ui/sampleRules.ts` pre-fills "absences is at most 10" and "G3 is at least 10", margin 1, match columns age + school.

## Data Model
| Data | Where it lives | Updated by | When the user leaves / returns |
|---|---|---|---|
| File bytes | Worker memory only | Dropping a file | Gone on Start over or closing the tab |
| Parsed `Table` (cells with `raw`, `value`, `kind`) | Worker + React state | Read / sheet change | Gone on Start over or closing the tab |
| Rules, margins, ID/name/match columns | React state | Rule builder, rule-set load | Kept on Change rules; gone on Start over / close. Persist only via a downloaded .json |
| `CheckResult` (outcomes, groups, counts, impact) | React state | Check students | Replaced on each check; gone on Change rules→recheck, Start over, close |
| Filter, search, open row | React state | Results controls | Reset on new check |
| Decisions on Needs review rows (`src/io/decisions.ts`) | React state (`AppState.decisions`) | Row detail "Your decision" | Cleared on a new check or Start over; kept only in the downloaded .xlsx (Final decision, Decision note) |
| Theme | `localStorage` (`rollcheck-theme`) | Theme toggle | Remembered |

Nothing about students is ever written to `localStorage`, IndexedDB, cookies or the network.

## File Structure
```
eligibility-checker/
├── .github/workflows/
│   └── ci.yml                 # type-check, lint, test, build on every push
├── data/source/student-mat.csv  # UCI dataset (CC BY 4.0), input to make-sample
├── devpost/                   # scope / prd / spec (+ .html companions); learner-profile.md git-ignored
├── public/sample/rollcheck-sample.csv  # generated demo sheet with documented traps
├── scripts/make-sample.mjs    # builds the demo sheet from data/source
├── src/
│   ├── engine/                # pure logic, no React, no DOM
│   │   ├── types.ts
│   │   ├── parse.ts           # .csv / .xlsx → raw grid
│   │   ├── normalise.ts       # header row, renames, classifyCell
│   │   ├── columns.ts         # column types, auto-detect, mostly-non-numeric
│   │   ├── evaluate.ts        # each rule × each row
│   │   ├── review.ts          # duplicate IDs, likely duplicate students
│   │   ├── reasons.ts         # sentence builders (one place for wording)
│   │   ├── group.ts           # precedence, sort, counts, rule impact
│   │   ├── invariant.ts       # counts must add up
│   │   ├── ruleset.ts         # .json save / load / missing columns
│   │   ├── check.ts           # pipeline entry point
│   │   └── *.test.ts          # Vitest unit tests next to each module
│   ├── worker/
│   │   ├── rollcheck.worker.ts
│   │   └── client.ts          # promise API + in-thread fallback
│   ├── io/                    # exportXlsx, download, readFile
│   ├── app/                   # state.ts reducer, App.tsx, App.test.tsx (RTL main flow)
│   ├── ui/
│   │   ├── shell/  file/  rules/  results/
│   │   ├── copy.ts            # all user-facing strings
│   │   └── sampleRules.ts
│   ├── styles/index.css       # Tailwind + tokens + print + reduced motion
│   └── main.tsx
├── tests/fixtures/            # tiny .csv / .xlsx files for edge cases
├── DATA_SOURCES.md            # dataset credit, licence, every inserted trap
├── README.md
├── eslint.config.js  tsconfig*.json  vite.config.ts  package.json
└── .gitignore                 # learner-profile, .env*, node_modules, dist
```

## External Services and Dependencies
- **No runtime services, no API keys, no network calls** after the page loads (fonts are bundled).
- **SheetJS CDN tarball** — install-time only: `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. Licence Apache-2.0.
- **UCI Student Performance** — downloaded once (`https://archive.ics.uci.edu/static/public/320/student+performance.zip`, verified working), committed as `data/source/student-mat.csv`. Cortez, P. (2008). Student Performance [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5TG7T. Licence: **CC BY 4.0** (as stated on the UCI page) — redistribution allowed with attribution and an indication of changes, both in `DATA_SOURCES.md` and README.
- **Vercel** (optional deploy) — static hosting of `dist/`, configured in `vercel.json`. https://vercel.com/docs/frameworks/frontend/vite

## Important Failure Modes
- **Huge or odd .xlsx makes SheetJS slow** → it runs in the worker; the page shows "Reading file…" and stays usable; Start over cancels by terminating and recreating the worker.
- **Unexpected cell formats** (percent formats, dates, formulas with errors like `#N/A`) → raw text preserved; anything not a clean number becomes `text` → Needs review. Never coerced.
- **Engine bug producing a bad split** → invariant error, no partial results.
- **Worker unavailable** (old browser / file:// quirks) → `client.ts` falls back to in-thread checking; slower, still correct.

## What Was Simplified and Why
- **Rule sets as downloaded .json** instead of an in-app library — no storage of anything; reuse still works next cycle.
- **.xlsx read progress is coarse** ("Reading file…" then row progress) instead of byte-level — SheetJS reads a workbook in one call; a streaming xlsx parser would add a dependency for little gain.
- **Duplicate-name matching is rule-based** (initials + same match columns) instead of fuzzy similarity — explainable in one sentence, testable, and matches the PRD's examples.
- **Sample CSV, not .xlsx** — semicolon CSV shows delimiter detection and keeps traps like "10 " byte-exact; .xlsx reading is covered by test fixtures.

## Decisions and Open Issues
**Learner decisions carried forward:** the full stack above, Web Worker, pure engine modules, raw + parsed side by side, virtualised table, reducer state, @fontsource, lucide, Vitest + RTL, CI gates, static deploy (from `prd.md > Product Decisions` and the learner's technical plan).

**Agent recommendations, accepted by the learner at review:** TypeScript pinned to 6.0.3 (TS 7 is out but typescript-eslint doesn't support it yet); GitHub Pages as the deploy target (later changed to Vercel by the learner); sample data as CSV; the review-label text tone `#8A5A12` for AA contrast; "is one of" split on new lines / `;` not commas; `data/source/` committed (CC BY permits it) instead of git-ignored `data/raw/`.

**Resolved at review (learner accepted the recommendations):**
1. **Margin boundary — the one genuine unknown.** Strict: a value is near-limit when `m > 0` and `|v − L| < m`. Values equal to the limit are near-limit (e.g. 17 sample students with G3 exactly 10). Evidence to check during the build: the margin-boundary unit test and the real demo counts.
2. **Percent-formatted .xlsx numbers** compare as the percent (0.746 → 74.6), display `74.6%`, and show the stored value in the row detail.

**Self-review:** every `prd.md > Features and Behavior` heading has a component; data model, file tree and components agree; each failure point has a fallback. Unverified until build: TanStack Virtual + print interplay (print disables virtualisation), and SheetJS `cellNF` behaviour on zero-padded formats — both checked with fixtures in the first slices.
