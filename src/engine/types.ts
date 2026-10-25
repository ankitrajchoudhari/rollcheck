// Shared engine types. No runtime code lives here.

/** How Rollcheck read a cell. Only `number` is a clean, trusted number. */
export type CellKind = 'number' | 'text-number' | 'comma-decimal' | 'text' | 'blank'

export interface Cell {
  /** Exactly what the file holds, shown everywhere in the UI and export. */
  raw: string
  /** The number read from `raw`, or null when it is not safely a number. */
  value: number | null
  kind: CellKind
  /** What Excel displayed, when it differs from `raw` (e.g. a rounded format). */
  shown?: string
}

/** A cell as it comes out of a parser, before classification. */
export interface RawCell {
  raw: string
  /** Set only for true numeric spreadsheet cells; the value is then trusted. */
  num?: number
  shown?: string
}

export interface Notice {
  kind: 'renamed-column' | 'header-row' | 'percent-format' | 'split-column'
  message: string
}

export interface Table {
  fileName: string
  sheetName?: string
  headers: string[]
  rows: Cell[][]
  /** Row number as a user would see it in Excel, per data row. */
  rowNumbers: number[]
  notices: Notice[]
}

export type Condition = 'atLeast' | 'atMost' | 'equals' | 'isNot' | 'oneOf' | 'notBlank'

export interface Rule {
  id: string
  column: string
  condition: Condition
  /** The limit, the comparison text, or the list (one per line or separated by `;`). */
  value: string
  /** Near-limit margin for atLeast / atMost. 0 turns it off. */
  margin: number
}

export interface CheckOptions {
  idColumn?: string
  nameColumn?: string
  matchColumns?: string[]
}

export type OutcomeResult = 'pass' | 'fail' | 'review'

export interface RuleOutcome {
  ruleId: string
  result: OutcomeResult
  reasons: string[]
}

export type Status = 'eligible' | 'not-eligible' | 'review'

export interface RowResult {
  /** Index into `table.rows`. */
  index: number
  status: Status
  /** One short sentence each, in display order. */
  reasons: string[]
  outcomes: RuleOutcome[]
}

export interface RuleImpact {
  ruleId: string
  failed: number
  review: number
}

export interface Counts {
  eligible: number
  notEligible: number
  review: number
  total: number
}

export interface CheckResult {
  rows: RowResult[]
  /** Row indices in display order: Needs review, Not eligible, Eligible. */
  order: number[]
  counts: Counts
  impact: RuleImpact[]
  duplicateIdRows: number
  likelyDuplicateRows: number
}

export type Progress = { phase: 'reading' | 'checking'; done: number; total: number }
export type OnProgress = (p: Progress) => void
