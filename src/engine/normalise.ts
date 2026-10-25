import { classifyCell } from './classify'
import type { ParsedGrid } from './parse'
import type { Notice, RawCell, Table } from './types'

export class NoRowsError extends Error {
  constructor() {
    super('This file has no student rows.')
    this.name = 'NoRowsError'
  }
}

export const isBlankRow = (row: RawCell[]) => row.every((c) => c.raw.trim() === '')
const filledCount = (row: RawCell[]) => row.reduce((n, c) => n + (c.raw.trim() === '' ? 0 : 1), 0)

/**
 * The header is the first row about as wide as the table. Blank rows and title lines above it
 * ("Exam Cell — Semester 3", a date line) are skipped. Looks at the first 30 filled rows.
 */
export function findHeaderRow(grid: RawCell[][]): number {
  const first = grid.findIndex((row) => !isBlankRow(row))
  if (first === -1) return -1
  let widest = 0
  for (let i = first, seen = 0; i < grid.length && seen < 30; i++) {
    const n = filledCount(grid[i]!)
    if (n > 0) seen++
    widest = Math.max(widest, n)
  }
  const needed = Math.max(2, Math.ceil(widest * 0.6))
  if (widest < 2) return first
  const at = grid.findIndex((row, i) => i >= first && filledCount(row) >= needed)
  return at === -1 ? first : at
}

/** Make header names usable as rule targets: no blanks, no duplicates. */
export function uniqueHeaders(names: string[]): { headers: string[]; notices: Notice[] } {
  const notices: Notice[] = []
  const used = new Set<string>()
  const headers = names.map((name, i) => {
    const trimmed = name.trim()
    let next = trimmed === '' ? `Column ${i + 1}` : trimmed
    if (used.has(next.toLowerCase())) {
      let n = 2
      while (used.has(`${next} (${n})`.toLowerCase())) n++
      next = `${next} (${n})`
    }
    used.add(next.toLowerCase())
    if (next !== trimmed) {
      notices.push({
        kind: 'renamed-column',
        message:
          trimmed === ''
            ? `Column ${i + 1} had no name. It is called "${next}" here.`
            : `Two columns were called "${trimmed}". The second is called "${next}" here.`,
      })
    }
    return next
  })
  return { headers, notices }
}

/** Turn a parsed grid into a table: header row found, names fixed, every cell classified. */
export function buildTable(parsed: ParsedGrid, fileName: string): Table {
  const { grid, firstRowNumber } = parsed
  const headerAt = findHeaderRow(grid)
  if (headerAt === -1) throw new NoRowsError()

  let end = grid.length
  while (end > headerAt + 1 && isBlankRow(grid[end - 1]!)) end--
  const body = grid.slice(headerAt + 1, end)
  if (body.length === 0) throw new NoRowsError()

  const width = body.reduce((w, r) => Math.max(w, r.length), grid[headerAt]!.length)
  const headerCells = grid[headerAt]!
  const names = Array.from({ length: width }, (_, i) => headerCells[i]?.raw ?? '')
  const { headers, notices } = uniqueHeaders(names)

  if (headerAt > 0) {
    const skippedText = grid.slice(0, headerAt).some((row) => !isBlankRow(row))
    const rows = `The first ${headerAt} row${headerAt === 1 ? '' : 's'}`
    notices.unshift({
      kind: 'header-row',
      message: skippedText
        ? `${rows} look${headerAt === 1 ? 's' : ''} like a title, not column names. Row ${firstRowNumber + headerAt} is used as the header.`
        : `${rows} ${headerAt === 1 ? 'was' : 'were'} empty. Row ${firstRowNumber + headerAt} is used as the header.`,
    })
  }
  for (const c of parsed.percentColumns) {
    notices.push({
      kind: 'percent-format',
      message: `"${headers[c]}" is formatted as a percentage in Excel. Values are compared as percent (0.746 is 74.6%).`,
    })
  }

  const rows = body.map((row) => Array.from({ length: width }, (_, i) => classifyCell(row[i] ?? { raw: '' })))
  const rowNumbers = body.map((_, i) => firstRowNumber + headerAt + 1 + i)
  return {
    fileName,
    ...(parsed.sheetName !== undefined ? { sheetName: parsed.sheetName } : {}),
    headers,
    rows,
    rowNumbers,
    notices,
  }
}
