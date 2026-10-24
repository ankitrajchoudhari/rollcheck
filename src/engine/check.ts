import { evaluateRule, ruleProblem } from './evaluate'
import { decideStatus, groupResults, rowReasons } from './group'
import { assertInvariant } from './invariant'
import { detectReviewCases } from './review'
import type { CheckOptions, CheckResult, OnProgress, RowResult, Rule, Table } from './types'

export const MAX_RULES = 5

export class RuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RuleError'
  }
}

/** The single entry point: evaluate → review → group → invariant. Throws rather than return partial results. */
export function checkTable(table: Table, rules: Rule[], options: CheckOptions = {}, onProgress?: OnProgress): CheckResult {
  if (rules.length === 0) throw new RuleError('Add at least one rule.')
  if (rules.length > MAX_RULES) throw new RuleError(`Up to ${MAX_RULES} rules.`)
  for (const [k, rule] of rules.entries()) {
    const problem = ruleProblem(rule, table.headers)
    if (problem) throw new RuleError(`Rule ${k + 1}: ${problem}`)
  }

  const columns = rules.map((rule) => table.headers.indexOf(rule.column))
  const review = detectReviewCases(table, options)
  const total = table.rows.length
  const rows: RowResult[] = new Array(total)

  for (let i = 0; i < total; i++) {
    const cells = table.rows[i]!
    const outcomes = rules.map((rule, k) => evaluateRule(rule, cells[columns[k]!]!))
    const flags = review.flags.get(i) ?? []
    const status = decideStatus(outcomes, flags)
    rows[i] = { index: i, status, reasons: rowReasons(status, outcomes, flags, rules.length), outcomes }
    if (onProgress && (i + 1) % 5000 === 0) onProgress({ phase: 'checking', done: i + 1, total })
  }
  onProgress?.({ phase: 'checking', done: total, total })

  const result = groupResults(rows, rules, review.duplicateIdRows, review.likelyDuplicateRows)
  assertInvariant(result, total)
  return result
}
