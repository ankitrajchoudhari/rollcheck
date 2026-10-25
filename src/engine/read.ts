import Papa from 'papaparse'
import { buildTable, isBlankRow, NoRowsError } from './normalise'
import { detectFileType, parseCsv, readWorkbook, sheetToGrid, type ParsedGrid } from './parse'
import type { Notice, OnProgress, Table } from './types'

export interface ReadResult {
  table: Table
  sheets: string[]
}

const DELIMITERS: [string, string][] = [
  [';', 'semicolons'],
  ['\t', 'tabs'],
  ['|', 'vertical bars'],
  [',', 'commas'],
]

/**
 * A semicolon CSV opened in Excel with comma settings ends up with every line in column A.
 * When every row has a single filled cell and the header holds a delimiter, split it back into columns.
 */
export function splitSingleColumn(parsed: ParsedGrid): { parsed: ParsedGrid; notice?: Notice } {
  const filled = parsed.grid.filter((r) => !isBlankRow(r))
  if (filled.length < 2 || !filled.every((r) => r.slice(1).every((c) => c.raw.trim() === ''))) return { parsed }
  const lines = parsed.grid.map((r) => r[0]?.raw ?? '')
  const header = lines.find((l) => l.trim() !== '')!
  const found = DELIMITERS.find(([d]) => header.includes(d))
  if (!found) return { parsed }
  const [delimiter, name] = found
  const rows = Papa.parse<string[]>(lines.join('\n'), { delimiter, skipEmptyLines: false }).data
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0)
  if (width < 2) return { parsed }
  return {
    parsed: { ...parsed, grid: rows.map((r) => r.map((raw) => ({ raw: raw ?? '' }))), percentColumns: [] },
    notice: { kind: 'split-column', message: `Everything was in one column, separated by ${name}. Rollcheck split it into ${width} columns.` },
  }
}

function toTable(parsed: ParsedGrid, fileName: string): Table {
  const { parsed: fixed, notice } = splitSingleColumn(parsed)
  const table = buildTable(fixed, fileName)
  if (notice) table.notices.unshift(notice)
  return table
}

/** File bytes → table, for the chosen sheet (first sheet by default). */
export function readFileToTable(fileName: string, bytes: Uint8Array, sheet?: string, onProgress?: OnProgress): ReadResult {
  const type = detectFileType(fileName, bytes)
  if (type === 'csv') return { table: toTable(parseCsv(bytes, onProgress), fileName), sheets: [] }
  onProgress?.({ phase: 'reading', done: 0, total: 1 })
  const wb = readWorkbook(bytes)
  const name = sheet && wb.SheetNames.includes(sheet) ? sheet : wb.SheetNames[0]
  if (name === undefined) throw new NoRowsError()
  const table = toTable(sheetToGrid(wb, name), fileName)
  onProgress?.({ phase: 'reading', done: 1, total: 1 })
  return { table, sheets: wb.SheetNames }
}
