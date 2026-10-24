// Helpers shared by engine tests. Not used by the app.
import * as XLSX from 'xlsx'
import { classifyCell } from './classify'
import type { Rule, Table } from './types'

export const enc = (text: string) => new TextEncoder().encode(text)

/** A table straight from strings: first row is the header. */
export function tableOf(rows: string[][], fileName = 'test.csv'): Table {
  const [headers, ...body] = rows
  return {
    fileName,
    headers: headers!,
    rows: body.map((r) => headers!.map((_, i) => classifyCell({ raw: r[i] ?? '' }))),
    rowNumbers: body.map((_, i) => i + 2),
    notices: [],
  }
}

let n = 0
export function rule(column: string, condition: Rule['condition'], value = '', margin = 1): Rule {
  return { id: `t${++n}`, column, condition, value, margin }
}

/** Build an .xlsx in memory. Cells may be plain values or full SheetJS cell objects (to set formats). */
export function xlsxOf(sheets: Record<string, (string | number | null | XLSX.CellObject)[][]>): Uint8Array {
  const wb = XLSX.utils.book_new()
  for (const [name, rows] of Object.entries(sheets)) {
    const ws: XLSX.WorkSheet = {}
    let maxC = 0
    rows.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v === null) return
        maxC = Math.max(maxC, c)
        const cell: XLSX.CellObject = typeof v === 'object' ? v : typeof v === 'number' ? { t: 'n', v } : { t: 's', v }
        ws[XLSX.utils.encode_cell({ r, c })] = cell
      })
    })
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length - 1, 0), c: maxC } })
    XLSX.utils.book_append_sheet(wb, ws, name)
  }
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
}
