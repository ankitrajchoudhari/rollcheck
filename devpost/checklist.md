---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (chosen by the learner in advance)

## Slices

- [x] **1. The engine sorts real students correctly, proven by tests**
  Becomes usable: `npm test` runs the full engine on fixtures and on the real UCI `student-mat.csv`, and every edge case, condition, the margin rule, duplicates, rule sets and the invariant pass. A runnable script prints the three counts for the demo rules on the real data.
  Why now: The engine is the kernel ("refuses to guess") and the learner's practice goal. It's the riskiest logic and everything else only displays it. This is the one allowed layer-only slice: it independently proves the critical risk and leaves runnable evidence. Project scaffold (Vite, React, TS 6.0.3 strict, Tailwind, Vitest, ESLint, SheetJS from the CDN tarball) is bootstrapped here.
  PRD ref: `prd.md > Checking Students`, `prd.md > Reading the File`, `prd.md > Product Decisions`
  Spec ref: `spec.md > Engine — Types`, `spec.md > Engine — Parse`, `spec.md > Engine — Normalise`, `spec.md > Engine — Columns`, `spec.md > Engine — Evaluate`, `spec.md > Engine — Review Detection`, `spec.md > Engine — Group`, `spec.md > Engine — Invariant`, `spec.md > Engine — Rule Sets`, `spec.md > Engine — Check Pipeline`, `spec.md > Stack`
  Build: Scaffold the project per `spec.md > File Structure`; commit `data/source/student-mat.csv`; implement every `src/engine/` module with co-located Vitest tests and `tests/fixtures/` (.csv and generated .xlsx: blank rows above header, duplicate/blank headers, leading-zero IDs, dates, percent format, multi-sheet, empty, headers-only); add `npm run check`.
  Verify (mechanical): `npm run typecheck`, `npm run lint`, `npm test` all pass; engine run on `student-mat.csv` with the demo rules prints counts that add up to the row total; tests cover strict margin boundary (9 decided, 9.6/10/10.4 review, 11 decided).
  Learner check: Run `npm test` and read the test names in `src/engine/` — each PRD edge case should have a test you recognise.
  Commit: `Add tested eligibility engine`

- [x] **2. You can drop a file and see what Rollcheck read**
  Becomes usable: The File screen (drop zone, privacy line) accepts .csv/.xlsx and moves to Rules showing file name, sheet picker, row/column counts, ID/name pickers, renamed-column notices and a 5-row typed preview. Wrong type, empty and unreadable files show their messages. Big files show progress.
  Why now: First real path through the browser, and it carries the worker risk (Web Worker + SheetJS + Vite bundling) early.
  PRD ref: `prd.md > The Core Journey` (steps 1–3), `prd.md > Screens and Layout`, `prd.md > Reading the File`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Worker`, `spec.md > IO`, `spec.md > App State`, `spec.md > UI — Shell`, `spec.md > UI — File Stage`, `spec.md > UI — Rules Stage`, `spec.md > Look and Feel`
  Build: Worker + client with in-thread fallback, reducer, shell (header, stepper, theme tokens, fonts), DropZone, FileSummary, SheetPicker, ColumnPickers, PreviewTable, notices.
  Verify (mechanical): Production build succeeds; dev server starts; headless browser screenshot of File and Rules stages after loading `student-mat.csv` and a multi-sheet .xlsx fixture; a generated 60,000-row CSV loads with progress and correct count.
  Learner check: Run `npm run dev`, open http://localhost:5173, drop `data/source/student-mat.csv`, and check the counts (395 rows, 33 columns) and preview.
  Commit: `Read files in a worker and show summary`

- [x] **3. You can set rules and see every student checked**
  Becomes usable: Rule builder (1–5 rules, six conditions, margin, add/remove/reorder by keyboard, "Also match duplicates on", mostly-non-numeric warning) → Check students → Results shows "N of N students checked", the three counters and a basic table with Status and Reason, Needs review first. Invariant failure shows the error.
  Why now: This is the kernel visible end to end — the first moment the product's promise can be seen on screen. Early feedback here can still shape the results design.
  PRD ref: `prd.md > Building Rules`, `prd.md > Checking Students`, `prd.md > The Core Journey` (steps 4–5)
  Spec ref: `spec.md > UI — Rules Stage`, `spec.md > Engine — Check Pipeline`, `spec.md > Worker`, `spec.md > UI — Results Stage`
  Build: RuleBuilder/RuleRow, validation and disabled states, check through the worker, CheckedLine, Counters, a first ResultsTable, Change rules / Start over.
  Verify (mechanical): Build passes; RTL test: load fixture → add rule → check → counters add up to total; headless screenshot of Rules and Results.
  Learner check: Drop `student-mat.csv`, add "absences is at most 10" and "G3 is at least 10", click Check students, and see whether the reasons read the way you'd want staff to read them.
  Commit: `Add rule builder and check students`

- [x] **4. You can explore results: filter, search, open a student**
  Becomes usable: Counters filter the table, search, rule impact summary, virtualised table that stays smooth on 50k rows, row detail panel with every original cell, each rule's outcome and every reason (Esc closes, focus returns).
  Why now: Completes the results screen on top of the working check; depends on slice 3.
  PRD ref: `prd.md > Reviewing Results`, `prd.md > Screens and Layout` (3 · Results)
  Spec ref: `spec.md > UI — Results Stage`, `spec.md > Engine — Group`
  Build: Counter filtering (aria-pressed), SearchBox, RuleImpact, TanStack Virtual table, RowDetailPanel with focus trap, empty filter/search states.
  Verify (mechanical): RTL tests for filter count = counter, search no-match message, detail panel shows all columns and closes on Esc; 60k-row check renders and scrolls in headless browser.
  Learner check: Click "Needs review", search a student ID, open a row, press Esc.
  Commit: `Add results filtering, search and row detail`

- [x] **5. You can take results away: download, rule sets, print**
  Becomes usable: Download .xlsx (Results, Rules used, Needs review), Save rule set .json, Load rule set with missing-column remap, Print view.
  Why now: Closes the core loop (`scope.md > The Core Loop`: download the result) and the next-cycle reuse.
  PRD ref: `prd.md > Saving and Sharing Results`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > IO`, `spec.md > Engine — Rule Sets`, `spec.md > Look and Feel` (print)
  Build: exportXlsx, download helper, LoadRuleSet + RemapColumns, Save rule set, print CSS + PrintHeader.
  Verify (mechanical): Unit test reads the exported workbook back with SheetJS: 3 sheets, raw values unchanged, counts match; rule-set round trip reproduces counts; headless print-to-PDF shows no buttons.
  Learner check: Download results and open the file in Excel; save the rule set, Start over, load it back.
  Commit: `Add xlsx export, rule sets and print`

- [x] **6. One click shows the whole story with sample data**
  Becomes usable: "Try sample data" loads the bundled ~120-row demo sheet with demo rules and match columns pre-filled; every documented trap lands in Needs review with its reason.
  Why now: The demo video depends on it, and it's the end-to-end proof of `scope.md > What "Working" Looks Like`. Needs the full journey to exist first.
  PRD ref: `prd.md > Sample Data`, `prd.md > Checking Students`
  Spec ref: `spec.md > Sample Data`, `spec.md > External Services and Dependencies`
  Build: `scripts/make-sample.mjs`, generated `public/sample/rollcheck-sample.csv`, sampleRules, the button, `DATA_SOURCES.md` with credit, licence, changes and every trap.
  Verify (mechanical): Test loads the generated sample through the engine and asserts each trap row's group and reason, plus counts total 120; RTL test for the button flow.
  Learner check: Start over → Try sample data → Check students, and find each trap in Needs review.
  Commit: `Add sample data with documented traps`

- [x] **7. It feels finished: dark mode, every state, accessibility**
  Becomes usable: Theme toggle with re-tuned dark palette, every empty/loading/error state designed, keyboard-only journey, visible focus, aria-live counts, AA contrast, reduced motion, no breakage at phone width.
  Why now: Polish once behaviour is settled, so it isn't redone. Judged under Design.
  PRD ref: `prd.md > Look and Feel`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Look and Feel`, `spec.md > UI — Shell`
  Build: Dark tokens + toggle, state polish, focus styles, contrast fixes, responsive pass, remaining RTL main-flow tests.
  Verify (mechanical): Full `npm run check`; headless screenshots light/dark at 1280px and 390px; contrast check of status colours on surfaces; keyboard-only RTL flow test.
  Learner check: Toggle dark mode, narrow the window to phone width, and do the whole journey with only the keyboard.
  Commit: `Polish states, dark mode and accessibility`

- [x] **8. Anyone can understand, run and trust the repo**
  Becomes usable: README (what, who, screenshots, run, test, engine architecture, data + licence + traps, limitations, "Built with the Devpost Learn Skill Pack using Claude Code"), CI workflow running the gates on push, optional Pages deploy workflow.
  Why now: Submission needs a public repo reviewers can read without running anything.
  PRD ref: `prd.md > What We're Building`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > External Services and Dependencies`
  Build: README.md with screenshots, `.github/workflows/ci.yml`, `.github/workflows/pages.yml`, `vite base './'`.
  Verify (mechanical): `npm run check` passes locally; workflows are valid YAML and mirror the local scripts; `npm run build` output opens via `npm run preview`.
  Learner check: Read the README top to bottom as if you were a judge.
  Commit: `Add README and CI`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 3 (first real check on screen). Feedback received: whole header in one column, layout misaligned and not responsive, design dull and hard to understand. Fixed; learner retried with their file (hacakthon.xlsx: 395 rows split into 33 columns, 169/166/60) and confirmed.
- [x] Final kick-the-tires exploration and feedback completed — consolidated click-through checklist (16 checks incl. 8 edge-case files) handed over; learner replied "yes ship it" with no further changes requested.

## Final Review

- [x] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [x] Learning activity complete — prior practice connected (focused alternative; no extra exercise)
- [x] Optional edit and transfer reflection addressed — edit not applicable; transfer question offered once
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Desired outcome was a fully tested logic core separate from the UI. Practised during the build: slice 1 built the engine alone with tests from the PRD edge cases; `src/engine/read.test.ts` "shows the real stored value, not the rounded display" failed first run and exposed the plain `0` format being treated as padding (fix in `src/engine/parse.ts`). At the slice-3 checkpoint the learner's Excel-re-saved file became the regression test "splits a semicolon CSV that Excel squeezed into one column" before the fix in `src/engine/read.ts` · `splitSingleColumn`.
Route and stops: Reference route only (not toured live): `src/engine/classify.ts` classifyCell → `src/engine/evaluate.ts` evaluateNumber → `src/engine/group.ts` decideStatus + `src/engine/invariant.ts` assertInvariant.
Edit outcome: Not applicable.
Reflection: Offered once; optional.
Activity mode: Prior practice connected, with app map.

## Final Review — after shipping

- [x] Unified design pass requested by the learner ("more unified, not like AI"): one header with stage tabs and a file chip, one panel style throughout, ledger-style tally instead of dashboard cards, status margin marks on rows, ruled-paper drop zone, consistent table headings and footer, stacked student entries and a three-column tally on phones. Verified at 390 and 1280px in light and dark, 138 tests passing.

- [x] Clearer controls requested by the learner: one style and height for every input and dropdown (custom chevron, focus ring), conditions grouped by what they work on, column options show their type, a plain sentence under each rule, search with a clear button, Esc to clear and "/" to focus. Added `docs/excel-comparison.xlsx` (`npm run compare`) and a README section showing where the obvious Excel formula goes wrong on the sample.

## Revisions
- `classifyCell` lives in `src/engine/classify.ts` and file reading entry point in `src/engine/read.ts` (not `normalise.ts`) — keeps the never-guess rule in one small, separately tested module.
- Edge-case .xlsx/.csv fixtures are generated inside the tests (`src/engine/test-helpers.ts`) instead of stored in `tests/fixtures/` — same coverage, no binary files to keep in sync.
- A number stored as text ("75 %", "10 ") always goes to Needs review, even when its parsed value fails — the PRD says "parse AND flag Needs review", so such a value never decides on its own; the reason adds what the parsed value would mean.
- Excel's plain `0` number format was being mistaken for zero-padding and showed 74.6 as "75" — caught by the slice-1 test; only formats of two or more zeros now count as padding.
- CSV read progress is shown as a percentage of the file ("Reading file… 62%") rather than "32,000 of 51,200" rows — the row total of a CSV is unknown until it has been read; checking progress does show "N of N".
- A semicolon CSV opened in Excel and re-saved arrives with every line in column A (seen at the slice-3 checkpoint) — the engine now detects a single filled column whose header holds a delimiter, splits it, and tells the user (`splitSingleColumn` in `src/engine/read.ts`).
- Rules screen redesigned after checkpoint feedback ("not aligned, dull, not responsive, not understandable") — rules as cards on a fixed grid (no long option can widen a field), a live plain-English "Your check" panel with the Check button beside the rules from 900px and right under them on narrow screens, titled register-style sections, a worked example on the File screen, a proportion bar on Results, and each stage opens scrolled to the top. Same `prd.md > Look and Feel` direction, applied more fully.
- Results of 200 rows or fewer render in full; only larger results are virtualised — full rendering is simpler for screen readers and print, and lets the jsdom UI tests see rows. Verified virtualisation separately on 60,000 rows in Edge (about 24 rows in the DOM, search in ~110 ms).
- Rule impact moved from a side panel to a strip above the results table, and column widths now follow content — at 1280px the side panel squeezed the table and clipped the Reason column, the most important one.
- The "75%"-style trap is `12%` in G3 (a percentage in a 0–20 grade column), and the sample keeps all 33 source columns so the row detail shows a full real record.
- The page imports a light engine entry (`src/engine/core.ts`) and loads the .xlsx exporter and the in-thread fallback on demand — the build showed SheetJS bundled into the page (833 KB); the page is now 325 KB and SheetJS loads only in the worker or on Download.
- `npm ci` cannot run in the working folder while dev/preview servers hold native files open on Windows; CI steps were verified instead in a fresh clone (npm ci, type-check, lint, 138 tests, build).
- Deployment target changed from GitHub Pages to Vercel at ship time, at the learner's request (`vercel.json`; the Pages workflow was removed). The spec allowed either.
- The print report is now built only while printing (beforeprint/afterprint) — it had been rendering every shown row hidden in the page, which made search on 60,000 rows take ~20 s; back to ~115 ms.
