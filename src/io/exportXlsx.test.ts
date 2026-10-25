import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { checkTable } from '../engine'
import { rule, tableOf } from '../engine/test-helpers'
import { buildResultsWorkbook, resultsFileName, workbookBytes } from './exportXlsx'

const table = tableOf([
  ['ID', 'Name', 'absences', 'G3'],
  ['00417', 'Ana', '2', '15'],
  ['S2', 'Rui', 'AB', '12'],
  ['S3', 'Eva', '10 ', '9.6'],
  ['S4', 'Leo', '30', '5'],
])
const rules = [rule('absences', 'atMost', '10'), rule('G3', 'atLeast', '10')]
const result = checkTable(table, rules, { idColumn: 'ID' })
const checked = { rules, idColumn: 'ID', nameColumn: 'Name', matchColumns: [], at: '2026-10-25T10:00:00Z' }

// Round-trip through real .xlsx bytes, as Excel would open them.
const wb = XLSX.read(workbookBytes(buildResultsWorkbook(table, result, checked)), { type: 'array' })
const sheet = (name: string) => XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name]!, { header: 1, raw: false, defval: '' })

describe('results workbook', () => {
  it('has the three sheets', () => {
    expect(wb.SheetNames).toEqual(['Results', 'Rules used', 'Needs review'])
  })

  it('keeps every original value exactly, in file order, with Status and Reason', () => {
    const rows = sheet('Results')
    expect(rows[0]).toEqual(['ID', 'Name', 'absences', 'G3', 'Status', 'Reason', 'Final decision', 'Decision note'])
    expect(rows).toHaveLength(5)
    expect(rows[1]!.slice(0, 5)).toEqual(['00417', 'Ana', '2', '15', 'Eligible'])
    expect(rows[2]![2]).toBe('AB')
    expect(rows[3]!.slice(2, 4)).toEqual(['10 ', '9.6'])
    expect(rows[4]![4]).toBe('Not eligible')
    expect(rows[4]![5]).toBe('absences is 30, above the 10 limit. G3 is 5, below the 10 limit.')
    expect(wb.Sheets['Results']!['A2']!.t).toBe('s')
  })

  it('records the rules, margin, file, time and counts', () => {
    const flat = sheet('Rules used').map((r) => r.filter(Boolean).join(' | '))
    expect(flat).toContain('File | test.csv')
    expect(flat).toContain('1 | absences | is at most | 10 | 1')
    expect(flat).toContain('2 | G3 | is at least | 10 | 1')
    expect(flat).toContain('Eligible | 1')
    expect(flat).toContain('Not eligible | 1')
    expect(flat).toContain('Needs review | 2')
    expect(flat).toContain('Total | 4')
    expect(flat.some((l) => l.startsWith('Checked | '))).toBe(true)
  })

  it('lists only Needs review students on the third sheet', () => {
    const rows = sheet('Needs review')
    expect(rows.slice(1).map((r) => r[0])).toEqual(['S2', 'S3'])
    expect(rows.slice(1).every((r) => r[4] === 'Needs review')).toBe(true)
  })

  it('names the file after the source', () => {
    expect(resultsFileName('Exam Cell March.xlsx')).toBe('Exam Cell March-rollcheck.xlsx')
    expect(resultsFileName('students.csv')).toBe('students-rollcheck.xlsx')
  })

  it("records a person's decision on a Needs review row next to Rollcheck's result", () => {
    const decided = XLSX.read(
      workbookBytes(buildResultsWorkbook(table, result, checked, { 1: { status: 'eligible', note: 'AB was a typo; register shows 3' } })),
      { type: 'array' },
    )
    const rows = XLSX.utils.sheet_to_json<string[]>(decided.Sheets['Results']!, { header: 1, raw: false, defval: '' })
    expect(rows[2]!.slice(4)).toEqual(['Needs review', "absences is 'AB', not a number. Check manually.", 'Eligible', 'AB was a typo; register shows 3'])
    expect(rows[3]!.slice(6)).toEqual(['Needs review', ''])
    expect(rows[1]!.slice(6)).toEqual(['Eligible', ''])
    const used = XLSX.utils.sheet_to_json<string[]>(decided.Sheets['Rules used']!, { header: 1 }).map((r) => r.filter(Boolean).join(' | '))
    expect(used).toContain('Needs review decided by hand | 1 of 2')
  })
})

