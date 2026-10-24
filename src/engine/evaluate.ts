import { classifyText } from './classify'
import { reasons as r } from './reasons'
import type { Cell, Condition, Rule, RuleOutcome } from './types'

export const NUMBER_CONDITIONS: Condition[] = ['atLeast', 'atMost']
export const isNumberRule = (c: Condition) => NUMBER_CONDITIONS.includes(c)

/** "is one of" values: one per line or separated by ";" (never commas, so "74,6" stays one value). */
export const splitOptions = (value: string) =>
  value
    .split(/[\n;]/)
    .map((v) => v.trim())
    .filter((v) => v !== '')

const EPSILON = 1e-9

/** Why a rule can't run yet, or null when it's complete. */
export function ruleProblem(rule: Rule, headers: string[]): string | null {
  if (!rule.column) return 'Choose a column.'
  if (!headers.includes(rule.column)) return `Column '${rule.column}' is not in this file. Choose a column for this rule.`
  if (rule.condition === 'notBlank') return null
  if (isNumberRule(rule.condition)) {
    if (classifyText(rule.value.trim()).kind !== 'number') return 'Enter a number for the limit.'
    if (!(Number.isFinite(rule.margin) && rule.margin >= 0)) return 'The margin must be 0 or more.'
    return null
  }
  if (rule.condition === 'oneOf') return splitOptions(rule.value).length ? null : 'Enter at least one value.'
  return rule.value.trim() === '' ? 'Enter a value.' : null
}

const norm = (s: string) => s.trim().toLowerCase()

function sameValue(cell: Cell, target: string): boolean {
  const t = classifyText(target.trim())
  if (cell.value !== null && t.value !== null && (cell.kind === 'number' || cell.kind === 'text-number')) {
    return Math.abs(cell.value - t.value) < EPSILON
  }
  return norm(cell.raw) === norm(target)
}

function evaluateNumber(rule: Rule, cell: Cell): RuleOutcome {
  const col = rule.column
  const limitText = rule.value.trim()
  const limit = Number(limitText)
  const out = (result: RuleOutcome['result'], ...reasons: string[]): RuleOutcome => ({ ruleId: rule.id, result, reasons })

  if (cell.kind === 'blank') return out('review', r.blank(col))
  if (cell.kind === 'text') return out('review', r.notANumber(col, cell))
  if (cell.kind === 'comma-decimal') return out('review', r.commaDecimal(col, cell))

  const v = cell.value!
  const passes = rule.condition === 'atLeast' ? v >= limit : v <= limit
  // Strict boundary: near-limit means closer than the margin, never exactly at it.
  const near = rule.margin > 0 && Math.abs(v - limit) < rule.margin - EPSILON
  const failReason = () => (rule.condition === 'atLeast' ? r.below(col, cell, limitText) : r.above(col, cell, limitText))

  // A number stored as text is read, but never decides on its own.
  if (cell.kind === 'text-number') {
    const extra = near
      ? [r.readAs(v, 'near', limitText)]
      : passes
        ? []
        : [r.readAs(v, rule.condition === 'atLeast' ? 'below' : 'above', limitText)]
    return out('review', r.storedAsText(col, cell), ...extra)
  }
  if (near) return out('review', r.nearLimit(col, cell, rule.margin, limitText))
  return passes ? out('pass') : out('fail', failReason())
}

/** Apply one rule to one cell. */
export function evaluateRule(rule: Rule, cell: Cell): RuleOutcome {
  const out = (result: RuleOutcome['result'], ...reasons: string[]): RuleOutcome => ({ ruleId: rule.id, result, reasons })
  const col = rule.column

  switch (rule.condition) {
    case 'atLeast':
    case 'atMost':
      return evaluateNumber(rule, cell)
    case 'notBlank':
      return cell.kind === 'blank' ? out('fail', r.blank(col)) : out('pass')
    case 'equals':
      if (cell.kind === 'blank') return out('review', r.blank(col))
      return sameValue(cell, rule.value) ? out('pass') : out('fail', r.notEqual(col, cell, rule.value.trim()))
    case 'isNot':
      if (cell.kind === 'blank') return out('review', r.blank(col))
      return sameValue(cell, rule.value) ? out('fail', r.excluded(col, cell)) : out('pass')
    case 'oneOf': {
      if (cell.kind === 'blank') return out('review', r.blank(col))
      const options = splitOptions(rule.value)
      return options.some((o) => sameValue(cell, o)) ? out('pass') : out('fail', r.notOneOf(col, cell, options))
    }
  }
}
