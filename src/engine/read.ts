import { buildTable, NoRowsError } from './normalise'
import { detectFileType, parseCsv, readWorkbook, sheetToGrid } from './parse'
import type { OnProgress, Table } from './types'

export interface ReadResult {
  table: Table
  sheets: string[]
}

/** File bytes → table, for the chosen sheet (first sheet by default). */
export function readFileToTable(fileName: string, bytes: Uint8Array, sheet?: string, onProgress?: OnProgress): ReadResult {
  const type = detectFileType(fileName, bytes)
  if (type === 'csv') return { table: buildTable(parseCsv(bytes, onProgress), fileName), sheets: [] }
  onProgress?.({ phase: 'reading', done: 0, total: 1 })
  const wb = readWorkbook(bytes)
  const name = sheet && wb.SheetNames.includes(sheet) ? sheet : wb.SheetNames[0]
  if (name === undefined) throw new NoRowsError()
  const table = buildTable(sheetToGrid(wb, name), fileName)
  onProgress?.({ phase: 'reading', done: 1, total: 1 })
  return { table, sheets: wb.SheetNames }
}
