// Builds docs/excel-comparison.xlsx: the sample sheet with the formula an office would typically
// write, next to Rollcheck's result, to show where the formula is silently wrong.
// Usage: node scripts/make-excel-comparison.mjs   (run `npm run sample` first)
//
// Excel's formula results are computed here with Excel's documented comparison rules and also
// stored as the cells' cached values; Excel recalculates them when the file is opened.
//   - In a comparison, text is always greater than any number ("AB" >= 10 is TRUE, "AB" <= 10 is FALSE).
//   - An empty cell compares as 0 (empty <= 10 is TRUE).
import { readFileSync, writeFileSync } from 'node:fs'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const SAMPLE = 'public/sample/rollcheck-sample.csv'
const OUT = 'docs/excel-comparison.xlsx'
const [header, ...rows] = Papa.parse(readFileSync(SAMPLE, 'utf8').trim(), { delimiter: ';' }).data
const AB = header.indexOf('absences')
const G3 = header.indexOf('G3')
const col = (i) => XLSX.utils.encode_col(i)

// How Excel stores what someone typed: clean numbers become numbers; anything else stays text.
const asExcel = (raw) => (raw === '' ? null : /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw)
// Excel's comparison of a cell against a number.
const cmp = (v, op, n) => {
  if (v === null) v = 0
  if (typeof v === 'string') return op === '>=' // text is greater than every number
  return op === '>=' ? v >= n : v <= n
}

// Rollcheck's own results, straight from the engine.
const { readFileToTable, checkTable } = await import('../src/engine/index.ts').catch(() => ({}))
let rollcheck = null
if (readFileToTable) {
  const { table } = readFileToTable('rollcheck-sample.csv', readFileSync(SAMPLE))
  const rules = [
    { id: 'a', column: 'absences', condition: 'atMost', value: '10', margin: 1 },
    { id: 'b', column: 'G3', condition: 'atLeast', value: '10', margin: 1 },
  ]
  rollcheck = checkTable(table, rules, { idColumn: 'Student ID', nameColumn: 'Student Name', matchColumns: ['age', 'school'] })
}
const LABEL = { eligible: 'Eligible', 'not-eligible': 'Not eligible', review: 'Needs review' }

const out = [[...header, 'Formula result', 'Rollcheck', 'Rollcheck reason']]
const ws = {}
const diffs = []
rows.forEach((r, k) => {
  const excelRow = k + 2
  const values = r.map(asExcel)
  const formula = `IF(AND(${col(AB)}${excelRow}<=10,${col(G3)}${excelRow}>=10),"Eligible","Not eligible")`
  const result = cmp(values[AB], '<=', 10) && cmp(values[G3], '>=', 10) ? 'Eligible' : 'Not eligible'
  values.forEach((v, c) => {
    if (v !== null) ws[XLSX.utils.encode_cell({ r: k + 1, c })] = typeof v === 'number' ? { t: 'n', v } : { t: 's', v }
  })
  ws[XLSX.utils.encode_cell({ r: k + 1, c: header.length })] = { t: 's', v: result, f: formula }
  if (rollcheck) {
    const row = rollcheck.rows[k]
    ws[XLSX.utils.encode_cell({ r: k + 1, c: header.length + 1 })] = { t: 's', v: LABEL[row.status] }
    ws[XLSX.utils.encode_cell({ r: k + 1, c: header.length + 2 })] = { t: 's', v: row.reasons.join(' ') }
    if (row.status !== (result === 'Eligible' ? 'eligible' : 'not-eligible')) {
      diffs.push({ row: excelRow, id: r[0], absences: r[AB], G3: r[G3], formula: result, rollcheck: LABEL[row.status], reason: row.reasons.join(' ') })
    }
  }
})
out[0].forEach((h, c) => (ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h }))
ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: out[0].length - 1 } })
ws['!cols'] = out[0].map((h, c) => ({ wch: c >= header.length ? (c === header.length + 2 ? 70 : 16) : Math.max(h.length + 2, 8) }))

const notes = XLSX.utils.aoa_to_sheet([
  ['Same data, two ways'],
  [],
  ['Formula used', `=IF(AND(absences<=10, G3>=10), "Eligible", "Not eligible")  — in column ${col(header.length)}`],
  ['Rollcheck rules', 'absences is at most 10 AND G3 is at least 10, margin 1, duplicates matched on age and school'],
  [],
  ['Why the formula goes wrong', ''],
  ['Text compares as larger than any number', '"AB", "12%", "9,8" all count as ≥ 10 and > 10'],
  ['An empty cell compares as 0', 'a missing absences value passes "≤ 10"'],
  ['No duplicate checks', 'the same student entered twice is counted twice'],
  ['No reasons', 'the result never says why'],
  [],
  ['Rows where the formula and Rollcheck differ', String(diffs.length)],
  [],
  ['Row', 'Student ID', 'absences', 'G3', 'Formula says', 'Rollcheck says', 'Rollcheck reason'],
  ...diffs.map((d) => [String(d.row), d.id, d.absences === '' ? '(blank)' : d.absences, d.G3, d.formula, d.rollcheck, d.reason]),
])
notes['!cols'] = [{ wch: 44 }, { wch: 60 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 80 }]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, notes, 'Read me')
XLSX.utils.book_append_sheet(wb, ws, 'Students')
writeFileSync(OUT, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
console.log(`Wrote ${OUT}: ${diffs.length} rows where the formula and Rollcheck differ.`)
for (const d of diffs) console.log(`  row ${d.row} ${d.id}  absences=${JSON.stringify(d.absences)} G3=${JSON.stringify(d.G3)}  formula: ${d.formula}  →  Rollcheck: ${d.rollcheck}`)
