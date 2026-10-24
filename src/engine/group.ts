import { reasons as r } from './reasons'
import type { CheckResult, Counts, RowResult, Rule, RuleImpact, RuleOutcome, Status } from './types'

/**
 * Decide a row's group. Under AND, one clear failure already decides it;
 * otherwise anything uncertain goes to a human.
 */
export function decideStatus(outcomes: RuleOutcome[], rowFlags: string[]): Status {
  if (outcomes.some((o) => o.result === 'fail')) return 'not-eligible'
  if (rowFlags.length > 0 || outcomes.some((o) => o.result === 'review')) return 'review'
  return 'eligible'
}

/** Failures first, then review notes, then duplicate notes. */
export function rowReasons(status: Status, outcomes: RuleOutcome[], rowFlags: string[], ruleCount: number): string[] {
  if (status === 'eligible') return [r.meetsAll(ruleCount)]
  return [
    ...outcomes.filter((o) => o.result === 'fail').flatMap((o) => o.reasons),
    ...outcomes.filter((o) => o.result === 'review').flatMap((o) => o.reasons),
    ...rowFlags,
  ]
}

const STATUS_ORDER: Record<Status, number> = { review: 0, 'not-eligible': 1, eligible: 2 }

export function groupResults(
  rows: RowResult[],
  rules: Rule[],
  duplicateIdRows: number,
  likelyDuplicateRows: number,
): CheckResult {
  const counts: Counts = { eligible: 0, notEligible: 0, review: 0, total: rows.length }
  const impact: RuleImpact[] = rules.map((rule) => ({ ruleId: rule.id, failed: 0, review: 0 }))
  for (const row of rows) {
    if (row.status === 'eligible') counts.eligible++
    else if (row.status === 'not-eligible') counts.notEligible++
    else counts.review++
    row.outcomes.forEach((o, k) => {
      if (o.result === 'fail') impact[k]!.failed++
      else if (o.result === 'review') impact[k]!.review++
    })
  }
  // Stable: file order is kept within each group.
  const order = rows
    .map((row) => row.index)
    .sort((a, b) => STATUS_ORDER[rows[a]!.status] - STATUS_ORDER[rows[b]!.status] || a - b)
  return { rows, order, counts, impact, duplicateIdRows, likelyDuplicateRows }
}
