import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { cleanNumber } from './classify'
import type { OnProgress, RawCell } from './types'

export { UnreadableFileError, UnsupportedFileError } from './errors'
import { UnreadableFileError, UnsupportedFileError } from './errors'

export type FileType = 'csv' | 'xlsx'

export interface ParsedGrid {
  grid: RawCell[][]
  /** Spreadsheet row number of grid[0]. */
  firstRowNumber: number
  sheetName?: string
  /** Header names (by column index) whose numbers were percent-formatted. */
  percentColumns: number[]
}

export function detectFileType(fileName: string, bytes: Uint8Array): FileType {
  const ext = fileName.toLowerCase().split('.').pop()
  if (ext === 'csv') return 'csv'
  if (ext === 'xlsx') {
    // .xlsx files are zip archives: they start with "PK".
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new UnreadableFileError()
    return 'xlsx'
  }
  throw new UnsupportedFileError()
}

export function parseCsv(bytes: Uint8Array, onProgress?: OnProgress): ParsedGrid {
  if (bytes.includes(0)) throw new UnreadableFileError()
  let text = new TextDecoder('utf-8').decode(bytes)
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const grid: RawCell[][] = []
  const total = text.length
  let errored = false
  Papa.parse<string[]>(text, {
    delimiter: '',
    skipEmptyLines: false,
    step: (res) => {
      grid.push(res.data.map((raw) => ({ raw: raw ?? '' })))
      if (onProgress && grid.length % 5000 === 0) {
        onProgress({ phase: 'reading', done: res.meta.cursor, total })
      }
    },
    error: () => {
      errored = true
    },
  })
  if (errored) throw new UnreadableFileError()
  onProgress?.({ phase: 'reading', done: total, total })
  return { grid, firstRowNumber: 1, percentColumns: [] }
}

export function readWorkbook(bytes: Uint8Array): XLSX.WorkBook {
  try {
    return XLSX.read(bytes, { type: 'array', dense: true, cellNF: true, cellText: true, cellDates: false })
  } catch {
    throw new UnreadableFileError()
  }
}

function toRawCell(c: XLSX.CellObject | undefined): { cell: RawCell; percent: boolean } {
  if (!c || c.t === 'z') return { cell: { raw: '' }, percent: false }
  const shown = typeof c.w === 'string' ? c.w : undefined
  switch (c.t) {
    case 's':
      return { cell: { raw: String(c.v ?? '') }, percent: false }
    case 'n': {
      const v = c.v as number
      const fmt = typeof c.z === 'string' ? c.z : ''
      // Dates keep the text Excel displays; they are never treated as numbers.
      if (fmt && XLSX.SSF.is_date(fmt)) return { cell: { raw: shown ?? String(v) }, percent: false }
      // A percent format stores 0.746 for 74.6%: compare as the percent staff see.
      if (fmt.includes('%')) {
        const pct = cleanNumber(v * 100)
        return { cell: { raw: `${pct}%`, num: pct, shown: shown ?? `${pct}%` }, percent: true }
      }
      // Zero-padded IDs ("00417") keep their padding. A single "0" is a rounding format, not padding.
      if (/^00+$/.test(fmt)) return { cell: { raw: shown ?? String(v), num: v }, percent: false }
      // Everything else: the full stored value, so nothing appears rounded.
      return { cell: { raw: String(v), num: v, ...(shown !== undefined ? { shown } : {}) }, percent: false }
    }
    case 'b':
      return { cell: { raw: shown ?? (c.v ? 'TRUE' : 'FALSE') }, percent: false }
    case 'e':
      return { cell: { raw: shown ?? '#ERROR' }, percent: false }
    default:
      return { cell: { raw: shown ?? String(c.v ?? '') }, percent: false }
  }
}

export function sheetToGrid(wb: XLSX.WorkBook, sheetName: string): ParsedGrid {
  const ws = wb.Sheets[sheetName]
  if (!ws) throw new UnreadableFileError()
  const ref = ws['!ref']
  if (!ref) return { grid: [], firstRowNumber: 1, sheetName, percentColumns: [] }
  const range = XLSX.utils.decode_range(ref)
  const data = (ws['!data'] ?? []) as (XLSX.CellObject | undefined)[][]
  const percent = new Set<number>()
  const grid: RawCell[][] = []
  for (let r = range.s.r; r <= range.e.r; r++) {
    const src = data[r] ?? []
    const row: RawCell[] = []
    for (let c = range.s.c; c <= range.e.c; c++) {
      const { cell, percent: isPct } = toRawCell(src[c])
      if (isPct) percent.add(c - range.s.c)
      row.push(cell)
    }
    grid.push(row)
  }
  return { grid, firstRowNumber: range.s.r + 1, sheetName, percentColumns: [...percent] }
}
