import * as XLSX from 'xlsx'
import type { CheckResult, Table } from '../engine/core'
import type { CheckedWith } from './time'
import { conditionLabel, statusLabel } from '../ui/copy'
import { finalStatus, type Decisions } from './decisions'
import { localTime } from './time'
export type { CheckedWith } from './time'


/** Every cell is written as text, exactly as read, so Excel cannot round or reformat it. */
const textSheet = (rows: string[][]) => {
  const ws = XLSX.utils.aoa_to_sheet(rows.map((r) => r.map((v) => ({ t: 's', v }) as XLSX.CellObject)))
  ws['!cols'] = rows[0]?.map((h) => ({ wch: Math.min(Math.max(h.length + 2, 10), 60) }))
  return ws
}


export function buildResultsWorkbook(table: Table, result: CheckResult, checked: CheckedWith, decisions: Decisions = {}): XLSX.WorkBook {
  const header = [...table.headers, 'Status', 'Reason', 'Final decision', 'Decision note']
  const line = (i: number) => {
    const r = result.rows[i]!
    const d = decisions[i]
    return [...table.rows[i]!.map((c) => c.raw), statusLabel[r.status], r.reasons.join(' '), statusLabel[finalStatus(r.status, d)], d ? (d.note.trim() || 'Decided by hand') : '']
  }
  const all = table.rows.map((_, i) => line(i))
  const review = table.rows.map((_, i) => i).filter((i) => result.rows[i]!.status === 'review').map(line)

  const { counts } = result
  const rulesUsed: string[][] = [
    ['Rollcheck results'],
    [],
    ['File', table.fileName],
    ['Sheet', table.sheetName ?? '—'],
    ['Checked', localTime(checked.at)],
    [],
    ['Rule', 'Column', 'Condition', 'Value', 'Near-limit margin'],
    ...checked.rules.map((r, k) => [
      String(k + 1),
      r.column,
      conditionLabel[r.condition],
      r.condition === 'notBlank' ? '' : r.value.trim(),
      r.condition === 'atLeast' || r.condition === 'atMost' ? String(r.margin) : '',
    ]),
    ['', 'All rules must be met (AND).'],
    [],
    ['ID column', checked.idColumn || 'None'],
    ['Name column', checked.nameColumn || 'None'],
    ['Duplicates also matched on', checked.matchColumns.join(', ') || 'None'],
    [],
    ['Group', 'Students'],
    ['Eligible', String(counts.eligible)],
    ['Not eligible', String(counts.notEligible)],
    ['Needs review', String(counts.review)],
    ['Total', String(counts.total)],
    [],
    ['Needs review decided by hand', `${Object.keys(decisions).length} of ${counts.review}`],
    ['', 'Final decision = the person\'s decision for a decided Needs review row, otherwise Rollcheck\'s group.'],
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, textSheet([header, ...all]), 'Results')
  const rulesSheet = textSheet(rulesUsed)
  rulesSheet['!cols'] = [{ wch: 26 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, rulesSheet, 'Rules used')
  XLSX.utils.book_append_sheet(wb, textSheet([header, ...review]), 'Needs review')
  return wb
}

export function resultsFileName(fileName: string) {
  return `${fileName.replace(/\.(csv|xlsx)$/i, '')}-rollcheck.xlsx`
}

export function workbookBytes(wb: XLSX.WorkBook): Uint8Array {
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
}
