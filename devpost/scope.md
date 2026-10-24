---
doc: scope
status: approved
---

# Rollcheck

A browser tool that checks a student spreadsheet against eligibility rules and sorts every student into Eligible, Not eligible or Needs review, each with a plain-English reason.

## The Unique Kernel
It refuses to guess. Anything a formula would silently get wrong — 74.6 displayed as 75%, "AB" treated as zero, a blank cell, a comma decimal, the same student entered twice under two spellings — goes to **Needs review** with a sentence saying exactly why, instead of being quietly counted as pass or fail. Raw values are shown exactly as in the file, and the counts must always add up to the total rows.

## Who It's For
Non-programmer university office staff — exam cells, scholarship sections, student records — who live in Excel. Today they apply rules like "attendance at least 75%" or "fees cleared" to exported sheets by hand or with formulas, and errors are silent. A wrong result decides whether a real student sits an exam or gets a scholarship.

## The Core Loop
Upload a sheet → set rules (column + condition + value, combined with AND) → see every student as Eligible / Not eligible / Needs review with a reason → download the result. They come back every exam or scholarship cycle with the next export, reusing a saved rule set.

## Inspiration & Identity
A well-kept office register: calm, precise, trustworthy, a serious tool. IBM Plex Sans/Mono, warm off-white paper, deep green accent, thin rules instead of shadows. Not an "AI app": no gradients, glass, glow, emoji, sparkles or giant hero. Copy is short and calm — no "Oops", no exclamation marks. Full detail goes in `prd.md > Look and Feel`.

## Why This Matters to the Learner
"I work with student data at a university and see these mistakes happen." Practice goal: building a fully tested logic core separately from the UI.

## What "Working" Looks Like
Click "Try sample data" (a public UCI dataset with documented traps), keep the demo rules "absences is at most 10" AND "G3 is at least 10", click "Check students". The counters read "120 of 120 students checked", split across the three groups. **The "oh, that's cool" beat:** the Needs review group surfaces every hidden trap — G3 = 9.6 (within 1 of the 10 limit), absences "AB" ("not a number. Check manually."), the blank cell, "9,8", and "Possible duplicate: … share age and school" — all held for a human instead of silently passed or failed. Download gives an .xlsx with Status and Reason columns plus a "Rules used" sheet.

## The POC Boundary
- Upload .csv (delimiter auto-detected) or .xlsx (sheet picker); summary + 5-row preview; auto-detected ID and name columns.
- 1–5 AND rules; six conditions; editable near-limit margin on number rules.
- Pure, fully unit-tested rule engine separate from the UI, with the count invariant enforced.
- Needs review detection: near-limit, text in number columns, blanks, duplicate IDs, likely duplicate students. Flag only, never fix.
- Results: clickable counters, rule-impact summary, searchable table, row detail panel.
- .xlsx export (results, Rules used, Needs review), save/load rule set as .json, print view.
- Bundled sample data with pre-filled demo rules.
- Runs entirely in the browser; large files (50,000+ rows) stay responsive.
- Light and dark mode; keyboard and screen-reader usable.

Size decision: this boundary is larger than the course's 2–4 hour target. The learner chose to keep all of it, building the kernel slices first (engine → upload → rules → results → export → sample data) so the demo works early. If time runs short, the remaining items move to Later openly, never left half-done.

## Later
- Saved rule-set library inside the app (beyond .json files).
- Merging two files (e.g. attendance + fees exports).
- OR-logic between rules.

## Explicitly Cut
- AI features inside the app — the point is deterministic, explainable rules.
- Login, accounts, any server or database — the file must never leave the computer.
- Scheduling — a manual, per-cycle chore; no need.
- Editing data in the app — the tool flags, the office fixes the source sheet.
- Mobile-first layout — staff work at desktops; phone must not break, nothing more.
