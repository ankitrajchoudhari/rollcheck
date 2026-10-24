import type { Table } from './types'

export type ColumnType = 'number' | 'text' | 'mixed'

export interface ColumnStats {
  number: number
  textNumber: number
  commaDecimal: number
  text: number
  blank: number
}

export function columnStats(table: Table, column: string): ColumnStats {
  const i = table.headers.indexOf(column)
  const s: ColumnStats = { number: 0, textNumber: 0, commaDecimal: 0, text: 0, blank: 0 }
  if (i === -1) return s
  for (const row of table.rows) {
    const kind = row[i]!.kind
    if (kind === 'number') s.number++
    else if (kind === 'text-number') s.textNumber++
    else if (kind === 'comma-decimal') s.commaDecimal++
    else if (kind === 'text') s.text++
    else s.blank++
  }
  return s
}

/** number: every filled cell is a clean number. text: none is. mixed: anything in between. */
export function columnType(s: ColumnStats): ColumnType {
  const filled = s.number + s.textNumber + s.commaDecimal + s.text
  if (filled > 0 && s.number === filled) return 'number'
  if (s.number + s.textNumber === 0) return 'text'
  return 'mixed'
}

/** More than half of the filled cells cannot be read as numbers. */
export function isMostlyNonNumeric(s: ColumnStats): boolean {
  const filled = s.number + s.textNumber + s.commaDecimal + s.text
  if (filled === 0) return true
  return (s.commaDecimal + s.text) / filled > 0.5
}

const ID_HEADER = /\b(roll|id|reg(istration)?|enrol+(ment)?|admission|student\s*(no|number|code))\b/i
const NAME_HEADER = /\bname\b/i
const MATCH_HEADER = /\b(dob|date\s*of\s*birth|birth\s*date|birthday|e-?mail)\b/i

export interface DetectedColumns {
  idColumn?: string
  nameColumn?: string
  matchColumns: string[]
}

/** Guess the ID, name and duplicate-matching columns from header names. The user can change them. */
export function detectColumns(headers: string[]): DetectedColumns {
  const idColumn = headers.find((h) => ID_HEADER.test(h))
  const names = headers.filter((h) => NAME_HEADER.test(h) && h !== idColumn)
  const nameColumn = names.find((h) => /student|full/i.test(h)) ?? names.find((h) => !/school|father|mother|parent|guardian/i.test(h))
  const matchColumns = headers.filter((h) => MATCH_HEADER.test(h))
  return {
    ...(idColumn !== undefined ? { idColumn } : {}),
    ...(nameColumn !== undefined ? { nameColumn } : {}),
    matchColumns,
  }
}
