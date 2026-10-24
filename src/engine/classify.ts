import type { Cell, RawCell } from './types'

const NUMBER = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/
const PERCENT = /^(-?(?:\d+(?:\.\d+)?|\.\d+))\s*%$/
const COMMA_DECIMAL = /^-?\d+,\d+\s*%?$/

/**
 * Decide what a cell really is. Never guesses: anything that is not a clean
 * number is either parsed-and-flagged (`text-number`) or not a number at all.
 */
export function classifyCell(cell: RawCell): Cell {
  const { raw } = cell
  const base = cell.shown !== undefined && cell.shown !== raw ? { shown: cell.shown } : {}
  if (cell.num !== undefined) return { raw, value: cell.num, kind: 'number', ...base }

  const trimmed = raw.trim()
  if (trimmed === '') return { raw, value: null, kind: 'blank', ...base }
  if (NUMBER.test(raw)) return { raw, value: Number(raw), kind: 'number', ...base }
  if (NUMBER.test(trimmed)) return { raw, value: Number(trimmed), kind: 'text-number', ...base }
  const pct = PERCENT.exec(trimmed)
  if (pct) return { raw, value: Number(pct[1]), kind: 'text-number', ...base }
  if (COMMA_DECIMAL.test(trimmed)) return { raw, value: null, kind: 'comma-decimal', ...base }
  return { raw, value: null, kind: 'text', ...base }
}

/** Classify a bare string (e.g. a value typed into a rule). */
export function classifyText(raw: string): Cell {
  return classifyCell({ raw })
}

/** Strip floating-point noise from spreadsheet arithmetic (0.746 * 100). */
export function cleanNumber(n: number): number {
  return Number(n.toPrecision(15))
}
