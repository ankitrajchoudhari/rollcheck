---
doc: prd
status: approved
---

# Rollcheck — Product Requirements

Rollcheck checks a student spreadsheet against eligibility rules and sorts every student into Eligible, Not eligible or Needs review, each with a plain-English reason — for non-programmer university office staff (exam cells, scholarship sections, student records) who live in Excel.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. Staff open Rollcheck in a desktop browser. They see the product name, one line on what it does, a large drop zone, a "Try sample data" button and the privacy line.
2. They drop (or pick) a .csv or .xlsx export — or click "Try sample data".
3. Rollcheck reads the file on their computer and moves to **2 · Rules**: file summary, sheet picker if several, detected ID and name columns, a 5-row preview with each column's type.
4. They add 1–5 rules (column + condition + value), adjust the near-limit margin on number rules if needed, or load a saved rule set. They click **Check students**.
5. Rollcheck checks every row and moves to **3 · Results**: "N of N students checked", three counters, rule impact, and a table with Needs review rows first.
6. They click a counter to filter, search for a student, open a row to see all its cells and reasons.
7. They download the result as .xlsx (and optionally save the rule set or print). **Success:** the downloaded file has every original row with Status and Reason, and the counts add up.
8. Next cycle, they come back with a new export and load the saved rule set.

## Screens and Layout
One page, three stages, with a visible stepper at the top: **1 File · 2 Rules · 3 Results**. Completed steps can be clicked to go back; a later step is reachable only once its input exists. Desktop-first, max content width 1200px; on a phone everything stacks to one column and the table scrolls sideways — nothing overlaps or is cut off.

### 1 · File
- Product name and one line: what it does.
- Large drop zone: "Drop a .csv or .xlsx file", also clickable / keyboard-operable as a file picker.
- Secondary button: "Try sample data".
- Privacy line: "Your file is processed on this computer and never uploaded."
- Not a giant centred hero: a calm, left-aligned header with the drop zone as the main element.

### 2 · Rules
- File summary: file name, sheet, row count, column count.
- Sheet picker (only when the .xlsx has several sheets; first sheet by default).
- ID column and name column pickers, pre-filled by auto-detection, changeable.
- 5-row preview with a type tag on each column: number / text / mixed. Mixed columns are highlighted.
- Notices for anything Rollcheck changed while reading (renamed columns, header row found below blank rows).
- "Also match duplicates on": one or more identifying columns (e.g. date of birth, email; age + school for the demo), pre-filled from header names, changeable. Used only for likely-duplicate detection.
- Rule builder: up to 5 rows; each row is column + condition + value, plus margin control on number rules. Add, remove, reorder (move up / move down).
- "Load rule set" and **Check students**.

### 3 · Results
- "N of N students checked", announced to screen readers.
- Three large counters — Eligible / Not eligible / Needs review — each clickable to filter the table (click again or "Show all" to clear).
- Rule impact summary.
- Search box.
- Table: ID, name, rule columns, Status, Reason. Needs review rows first.
- Row detail panel (opens from a row).
- Actions: Download results (.xlsx), Save rule set, Print, Change rules, Start over.

## Look and Feel
Source: `scope.md > Inspiration & Identity`.

- **Feel:** a well-kept office register. Calm, precise, trustworthy; a serious professional tool.
- **Avoid:** purple/indigo gradients, glassmorphism, glowing borders, emoji, sparkle icons, giant centred hero, "AI-powered" badges, heavy rounded cards, default component-library look.
- **Type:** IBM Plex Sans for UI, IBM Plex Mono for values and IDs. Tabular numerals in tables and counters. Type scale 13 / 14 / 16 / 20 / 28.
- **Light colours:** background #FAF9F6, surfaces #FFFFFF, text #1C1B19, muted #6B6860, lines #E4E1DA, accent #1F5F46.
- **Status colours:** Eligible #2F7A4B, Not eligible #A33B2B, Needs review #B7791F — always with a text label and an icon, never colour alone.
- **Dark mode:** follows the system setting, with a manual toggle; colours re-tuned for dark, not inverted.
- **Shape:** max 6px corner radius; 1px borders instead of shadows (one subtle shadow only for popovers and the detail panel); 4px spacing grid.
- **Motion:** 120–180ms, on state changes only; none when the system asks for reduced motion.
- **Copy:** short, calm, specific. No "Oops", no exclamation marks, no "magic".

## Features and Behavior

### Reading the File
Source: `scope.md > The POC Boundary`.
- Accepts .csv and .xlsx, by drop or file picker. The file never leaves the computer.
- CSV delimiter detected automatically (comma, semicolon, tab).
- The header row is the first row about as wide as the table: blank rows and title lines above it are skipped, and the user is told.
- Duplicate or blank column names are renamed ("Column 7", "Attendance (2)") and the user is told which.
- Every cell is shown exactly as it appears in the file: leading-zero IDs keep their zeros, dates stay as displayed, numbers are never rounded or reformatted.
- ID and name columns are auto-detected from header names (e.g. "Roll No", "ID", "Name", "Student Name") and can be changed.
- Each column is tagged number / text / mixed from its contents.
- Large files (50,000+ rows) read without freezing the page, with progress text ("Reading rows… 32,000 of 51,200").
- [ ] Dropping student-mat.csv (semicolon-separated) shows the correct row and column counts and a correct 5-row preview.
- [ ] A sheet with three blank rows above the header uses the fourth row as headers.
- [ ] An ID "00417" displays as "00417", not "417".

### Building Rules
Source: `scope.md > The POC Boundary`.
- 1–5 rules, combined with AND. The "Add rule" button is disabled at 5 with the note "Up to 5 rules".
- Conditions: **is at least**, **is at most**, **equals**, **is not**, **is one of**, **is not blank**.
- "is at least" / "is at most" are number rules. They show "Treat values within [1] of the limit as Needs review" — editable, default 1, 0 allowed (turns the margin off).
- "is one of" takes a list of values.
- "is not blank" takes no value.
- If a number rule targets a column that is mostly not numbers, a warning shows before checking: "Most values in Attendance are not numbers. Results for this rule will mostly be Needs review." The user can still continue.
- Fully keyboard-operable: every control labelled, reorder by buttons not only drag.
- [ ] With 5 rules, "Add rule" is disabled; removing one re-enables it.
- [ ] Choosing "is not blank" hides the value field.
- [ ] Rules can be added, edited, reordered and removed using only the keyboard.

### Checking Students
Source: `scope.md > The Unique Kernel`.
- Each row lands in exactly one group: Eligible, Not eligible, or Needs review.
- Each row gets a reason. If several things apply, all are listed, each as one short sentence.
- **Group precedence:** any clear failure → Not eligible (review notes still listed in the reason); otherwise any review flag → Needs review; otherwise Eligible.
- **Needs review** catches, flagged only — never auto-merged or auto-fixed:
  - Number within the margin of a limit, on either side: "Attendance is 75.4, within 1 of the 75 limit. Confirm before deciding."
  - Text in a number rule column: "Attendance is 'AB', not a number. Check manually." (also "N/A", "-", etc.)
  - Number stored as text with % or spaces ("75 %", "10 "): parsed and flagged: "Attendance is '75 %', a number stored as text. Confirm the value."
  - Comma decimal ("74,6"): flagged, not guessed: "Attendance is '74,6', which uses a comma. Check whether it means 74.6."
  - Blank cell in a rule column: "Attendance is blank."
  - Duplicate ID: "Roll number S017 appears twice (rows 18 and 203)."
  - Likely duplicate student: names match after normalising AND all "Also match duplicates on" columns match. Normalising: lowercase, trim, collapse spaces, remove dots; two names match when each part is equal, or one part is a single letter that is the initial of the other name's part in the same position ("s kumar" ↔ "suresh kumar"): "Possible duplicate: 'S. Kumar' and 'SURESH KUMAR' share date of birth 2004-03-11."
- Clear failures: "Attendance is 72, below the 75 limit." / "Fees status is 'Pending', not 'Cleared'."
- Eligible rows get a reason too: "Meets all 2 rules."
- Row numbers in reasons match the row numbers a user would see in Excel.
- **Invariant:** Eligible + Not eligible + Needs review = total rows. If not, Rollcheck shows an error ("The counts did not add up, so no results are shown. Nothing was changed.") and never shows partial results.
- [ ] Sample data with the demo rules gives "120 of 120 students checked" and the three counters add up to 120.
- [ ] Every inserted trap in the sample data lands in Needs review with its matching reason.
- [ ] Raw values in the table match the file exactly (e.g. "9.6", "AB", "10 ").

### Reviewing Results
- Counters filter the table; the active filter is visibly marked.
- Search matches ID and name (and any cell text).
- Needs review rows sort first, then Not eligible, then Eligible; file order within each group.
- **Rule impact:** per rule, how many students it made Not eligible and how many it sent to Needs review. Plus row-level checks (duplicates) as their own line.
- **Row detail panel:** all original cells of the row, each rule's outcome (passed / failed / needs review, with the value it saw), and every reason. Closes with Esc or a Close button; focus returns to the row.
- Large results scroll smoothly.
- [ ] Clicking "Needs review" shows only those rows and the count matches the counter.
- [ ] Opening a row shows every original column, including ones not in the table.
- [ ] Rule impact numbers for the demo match a manual count of the sample data.

### Comparing With a Spreadsheet Formula
Added after shipping, at the learner's request, to make the kernel visible against the usual alternative.
- "Compare with an Excel formula" on Results shows the formula an office would type for the current rules (e.g. `=IF(AND(absences<=10, G3>=10), "Eligible", "Not eligible")`), what it would decide for every student under Excel's comparison rules, and how many students it decides differently.
- Rows where the formula disagrees are marked; "Show only these" filters to them. The comparison never changes Rollcheck's own result.
- [ ] On the sample data, 29 of 120 students differ, matching `docs/excel-comparison.xlsx`.

### Saving and Sharing Results
- **Download results (.xlsx):**
  - Sheet 1 "Results": all original columns unchanged + Status + Reason, in original row order.
  - Sheet 2 "Rules used": each rule, the margin, timestamp, source file name and sheet, and the three counts plus total.
  - Sheet 3 "Needs review": only Needs review rows, same columns as sheet 1.
- **Save rule set:** downloads a small .json with the rules and margins (no student data). **Load rule set** on the Rules screen restores them. If a rule's column is missing in the current file, Rollcheck says so ("Column 'Attendance %' is not in this file. Choose a column for this rule.") and lets the user pick a replacement.
- **Print:** the browser's print gives a clean results page: file name, date, rules, counts, and the table, without buttons or controls.
- [ ] The downloaded .xlsx opens in Excel with three sheets, original values unchanged, and counts matching the screen.
- [ ] A saved rule set reloads into an empty rule builder and reproduces the same counts on the same file.
- [ ] Print preview shows rules, counts and table with no buttons.

### Sample Data
- "Try sample data" loads a bundled demo sheet (from the public UCI Student Performance dataset, ~120 rows, with an ID column, synthetic names and documented traps), and pre-fills the demo rules: "absences is at most 10" AND "G3 is at least 10".
- [ ] One click on "Try sample data" lands on the Rules screen with both demo rules filled in.

## States and Boundaries
- **First use** — File screen; nothing remembered. Only the theme choice persists between visits.
- **Reading** — progress text while a file is being read; the drop zone is disabled meanwhile.
- **Wrong file type** — "Only .csv and .xlsx files are supported." The user stays on File.
- **Empty file or headers only** — "This file has no student rows."
- **Unreadable / corrupt file** — "This file could not be read. Check that it opens in Excel, then try again."
- **Multi-sheet .xlsx** — sheet picker on Rules, first sheet selected; switching sheets re-reads that sheet and clears rules that reference columns not in it (with a note).
- **Renamed columns** — notice listing each rename.
- **No rules yet** — "Check students" is disabled with "Add at least one rule."
- **Incomplete rule** — the incomplete field is marked and named; "Check students" explains what's missing.
- **Mostly non-numeric column in a number rule** — warning before checking; user can continue.
- **Loaded rule set with a missing column** — message and a column picker for that rule.
- **Checking** — progress text on large files.
- **Invariant failure** — error, no partial results.
- **Search with no matches** — "No students match 'xyz'." with a clear-search action.
- **Filter with zero rows** — e.g. "No students need review."
- **Change rules** — back to Rules with rules kept. **Start over** — back to File; file and rules cleared.
- **Privacy boundary** — the file, results and rule sets never leave the computer; nothing is stored after the tab closes except the theme choice.

## Product Decisions
- Three groups, not pass/fail — the kernel: uncertain cases go to a human, not a guess.
- Flag only, never fix or merge — the office owns the source data.
- Raw values always shown, never rounded — rounding is exactly how 74.6 becomes 75%.
- AND-only, max 5 rules — enough for real eligibility checks, keeps the builder simple.
- Margin default 1, editable — staff decide how cautious to be.
- Count invariant with hard error — a result that doesn't add up can't be trusted.
- Everything stays in the browser — student data must not be uploaded.
- Rule sets as .json files, not in-app storage — reuse next cycle without accounts.
- Product name Rollcheck (chosen by the agent at the learner's request).
- One clear failure decides Not eligible, even when other cells need review — under AND the outcome is already certain; review notes are still listed.
- 74.6 is the near-limit example; clear-failure examples use values outside the margin ("72, below the 75 limit") — follows from margin default 1.
- Duplicate names match on initials in the same position, plus the chosen identifying columns — so "S. Kumar" and "SURESH KUMAR" with the same date of birth are flagged.
- equals / is not / is one of compare case-insensitively, ignoring leading and trailing spaces; number columns compare the number ("75" equals "75.0"). No margin on these. The raw value is always what's displayed.
- Mostly-non-numeric warning when more than half of a column's non-blank cells are not numbers.
- Both rows of a duplicate pair (ID or likely student) are flagged; each reason names the other row number.

## What We're Building
Everything in `## Features and Behavior` and `## States and Boundaries` above, built kernel-first: checking logic → reading the file → rules → results → download / rule sets / print → sample data → dark mode, empty and error states, accessibility, polish.

## Deferred From the POC
- In-app rule-set library — .json files cover reuse without storage or accounts.
- Merging two files (attendance + fees) — needs matching across files; a separate problem.
- OR-logic — makes the builder and reasons much harder to read.
- Remembering the last file or rules between visits — would mean storing student data in the browser.

## Possible Later Enhancements
- Templates for common office checks (exam eligibility, scholarship renewal).
- Export to .csv as well as .xlsx.
- Per-rule margins in percentage terms.

## Non-Goals
- No AI inside the app — rules must be deterministic and explainable.
- No login, server or database — the file never leaves the computer.
- No scheduling — a manual, per-cycle chore.
- No editing data in the app — flag, don't fix.
- No mobile-first design — desktop-first; phones must not break.

## Open Questions
None. All three questions raised at review were resolved (see `## Product Decisions`).
