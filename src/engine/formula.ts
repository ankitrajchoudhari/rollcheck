// What the usual spreadsheet formula, =IF(AND(rule1, rule2, ...), "Eligible", "Not eligible"),
// would decide for each row, following Excel's comparison rules. Used to show where a formula
// gives a confident answer that Rollcheck would not.
//   - Text compares as greater than any number ("AB" >= 10 is TRUE, "AB" <= 10 is FALSE).
//   - An empty cell compares as 0 with numbers and as "" with text.
//   - "=" ignores case but not spaces; a number never equals text.
//   - A cell holding only spaces is not empty.
// Cells are taken as they are stored in the file: only clean numbers are numbers.
import type { Cell, CheckResult, Rule, Table } from './types'
import { classifyText } from './classify'
import { splitOptions } from './evaluate'

export type FormulaVerdict = 'eligible' | 'not-eligible'

type XlValue = number | string | null

const asExcel = (cell: Cell): XlValue => (cell.raw === '' ? null : cell.kind === 'number' ? cell.value! : cell.raw)

const target = (text: string): XlValue => {
  const t = classifyText(text.trim())
  return t.kind === 'number' ? t.value! : text.trim()
}

function compare(a: XlValue, b: XlValue): number {
  // Excel order: numbers < text; empty takes the type of the other side.
  if (a === null) a = typeof b === 'string' ? '' : 0
  if (b === null) b = typeof a === 'string' ? '' : 0
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'number') return -1
  if (typeof b === 'number') return 1
  const x = a.toLowerCase()
  const y = b.toLowerCase()
  return x === y ? 0 : x < y ? -1 : 1
}

export function formulaPasses(rule: Rule, cell: Cell): boolean {
  const v = asExcel(cell)
  switch (rule.condition) {
    case 'atLeast':
      return compare(v, target(rule.value)) >= 0
    case 'atMost':
      return compare(v, target(rule.value)) <= 0
    case 'equals':
      return compare(v, target(rule.value)) === 0
    case 'isNot':
      return compare(v, target(rule.value)) !== 0
    case 'oneOf':
      return splitOptions(rule.value).some((o) => compare(v, target(o)) === 0)
    case 'notBlank':
      return cell.raw !== ''
  }
}

/** The formula text for these rules, using column names in place of cell references. */
export function formulaText(rules: Rule[]): string {
  const q = (s: string) => `"${s.trim()}"`
  const one = (r: Rule) => {
    const v = r.value.trim()
    const lit = classifyText(v).kind === 'number' ? v : q(v)
    switch (r.condition) {
      case 'atLeast':
        return `${r.column}>=${lit}`
      case 'atMost':
        return `${r.column}<=${lit}`
      case 'equals':
        return `${r.column}=${lit}`
      case 'isNot':
        return `${r.column}<>${lit}`
      case 'oneOf':
        return `OR(${splitOptions(r.value).map((o) => `${r.column}=${classifyText(o).kind === 'number' ? o : q(o)}`).join(', ')})`
      case 'notBlank':
        return `${r.column}<>""`
    }
  }
  const body = rules.length === 1 ? one(rules[0]!) : `AND(${rules.map(one).join(', ')})`
  return `=IF(${body}, "Eligible", "Not eligible")`
}

export interface FormulaComparison {
  verdicts: FormulaVerdict[]
  /** Rows where the formula's answer differs from Rollcheck's group. */
  differ: number[]
  /** The formula said Eligible, Rollcheck did not. */
  passedUnchecked: number
  /** The formula said Not eligible, Rollcheck did not. */
  failedUnchecked: number
}

export function compareWithFormula(table: Table, rules: Rule[], result: CheckResult): FormulaComparison {
  const cols = rules.map((r) => table.headers.indexOf(r.column))
  const verdicts: FormulaVerdict[] = table.rows.map((cells) =>
    rules.every((r, k) => formulaPasses(r, cells[cols[k]!]!)) ? 'eligible' : 'not-eligible',
  )
  const differ: number[] = []
  let passedUnchecked = 0
  let failedUnchecked = 0
  verdicts.forEach((v, i) => {
    const status = result.rows[i]!.status
    if (v === status) return
    differ.push(i)
    if (v === 'eligible') passedUnchecked++
    else failedUnchecked++
  })
  return { verdicts, differ, passedUnchecked, failedUnchecked }
}
