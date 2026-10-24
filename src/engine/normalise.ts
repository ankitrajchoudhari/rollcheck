import { classifyCell } from './classify'
import type { ParsedGrid } from './parse'
import type { Notice, RawCell, Table } from './types'

export class NoRowsError extends Error {
  constructor() {
    super('This file has no student rows.')
    this.name = 'NoRowsError'
  }
}

const isBlankRow = (row: RawCell[]) => row.every((c) => c.raw.trim() === '')

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
  const headerAt = grid.findIndex((row) => !isBlankRow(row))
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
    notices.unshift({
      kind: 'header-row',
      message: `The first ${headerAt} row${headerAt === 1 ? ' was' : 's were'} empty. Row ${firstRowNumber + headerAt} is used as the header.`,
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
