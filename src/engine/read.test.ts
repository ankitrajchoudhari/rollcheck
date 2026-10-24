import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { NoRowsError } from './normalise'
import { UnreadableFileError, UnsupportedFileError } from './parse'
import { readFileToTable } from './read'
import { enc, xlsxOf } from './test-helpers'

const read = (name: string, text: string) => readFileToTable(name, enc(text)).table

describe('reading .csv', () => {
  it.each([
    ['comma', 'ID,Name,Attendance\nS001,Ana,80\nS002,Rui,70\n'],
    ['semicolon', 'ID;Name;Attendance\nS001;Ana;80\nS002;Rui;70\n'],
    ['tab', 'ID\tName\tAttendance\nS001\tAna\t80\nS002\tRui\t70\n'],
  ])('detects the %s delimiter', (_, text) => {
    const t = read('a.csv', text)
    expect(t.headers).toEqual(['ID', 'Name', 'Attendance'])
    expect(t.rows).toHaveLength(2)
    expect(t.rows[1]![2]).toMatchObject({ raw: '70', value: 70, kind: 'number' })
  })

  it('reads the real UCI student-mat.csv (semicolon, quoted values)', () => {
    const t = readFileToTable('student-mat.csv', readFileSync('data/source/student-mat.csv')).table
    expect(t.rows).toHaveLength(395)
    expect(t.headers).toHaveLength(33)
    expect(t.headers.slice(-4)).toEqual(['absences', 'G1', 'G2', 'G3'])
    expect(t.rows[0]![t.headers.indexOf('G3')]).toMatchObject({ raw: '6', kind: 'number' })
  })

  it('uses the first non-empty row as the header and says so', () => {
    const t = read('a.csv', '\n,,\n\nID,Score\nS1,5\n')
    expect(t.headers).toEqual(['ID', 'Score'])
    expect(t.rowNumbers).toEqual([5])
    expect(t.notices[0]!.message).toBe('The first 3 rows were empty. Row 4 is used as the header.')
  })

  it('renames blank and duplicate column names and tells the user', () => {
    const t = read('a.csv', 'ID,,Score,Score,score\n1,2,3,4,5\n')
    expect(t.headers).toEqual(['ID', 'Column 2', 'Score', 'Score (2)', 'score (3)'])
    expect(t.notices.map((n) => n.message)).toEqual([
      'Column 2 had no name. It is called "Column 2" here.',
      'Two columns were called "Score". The second is called "Score (2)" here.',
      'Two columns were called "score". The second is called "score (3)" here.',
    ])
  })

  it('keeps leading-zero IDs and dates exactly as text', () => {
    const t = read('a.csv', 'ID,DOB\n00417,2004-03-11\n')
    expect(t.rows[0]![0]!.raw).toBe('00417')
    expect(t.rows[0]![1]).toMatchObject({ raw: '2004-03-11', kind: 'text' })
  })

  it('keeps blank rows in the middle as students but drops trailing blank rows', () => {
    const t = read('a.csv', 'ID,Score\nS1,5\n,\nS3,7\n\n\n')
    expect(t.rows).toHaveLength(3)
    expect(t.rows[1]![1]!.kind).toBe('blank')
  })

  it.each([
    ['empty', ''],
    ['blank lines only', '\n\n  \n'],
    ['headers only', 'ID,Name,Score\n'],
    ['headers then blank lines', 'ID,Name,Score\n\n\n'],
  ])('refuses a file with no student rows (%s)', (_, text) => {
    expect(() => read('a.csv', text)).toThrow(NoRowsError)
    expect(() => read('a.csv', text)).toThrow('This file has no student rows.')
  })

  it('reads 60,000 rows and reports progress', () => {
    const lines = ['ID,Score']
    for (let i = 0; i < 60000; i++) lines.push(`S${i},${i % 20}`)
    const seen: number[] = []
    const { table } = readFileToTable('big.csv', enc(lines.join('\n')), undefined, (p) => seen.push(p.done))
    expect(table.rows).toHaveLength(60000)
    expect(seen.length).toBeGreaterThan(5)
  })
})

describe('file type', () => {
  it.each(['a.xls', 'a.txt', 'a.pdf', 'noext'])('rejects %s', (name) => {
    expect(() => readFileToTable(name, enc('x'))).toThrow(UnsupportedFileError)
    expect(() => readFileToTable(name, enc('x'))).toThrow('Only .csv and .xlsx files are supported.')
  })

  it('reports a fake .xlsx as unreadable', () => {
    expect(() => readFileToTable('a.xlsx', enc('not a zip'))).toThrow(UnreadableFileError)
  })

  it('reports binary content in a .csv as unreadable', () => {
    expect(() => readFileToTable('a.csv', new Uint8Array([0x50, 0, 0x41]))).toThrow(UnreadableFileError)
  })
})

describe('reading .xlsx', () => {
  it('lists every sheet, reads the first by default and the chosen one on request', () => {
    const bytes = xlsxOf({ Year1: [['ID'], ['A']], Year2: [['ID'], ['B'], ['C']] })
    const first = readFileToTable('a.xlsx', bytes)
    expect(first.sheets).toEqual(['Year1', 'Year2'])
    expect(first.table.sheetName).toBe('Year1')
    expect(first.table.rows).toHaveLength(1)
    const second = readFileToTable('a.xlsx', bytes, 'Year2')
    expect(second.table.rows).toHaveLength(2)
  })

  it('shows the real stored value, not the rounded display', () => {
    const bytes = xlsxOf({ S: [['Attendance'], [{ t: 'n', v: 74.6, z: '0' }]] })
    const cell = readFileToTable('a.xlsx', bytes).table.rows[0]![0]!
    expect(cell).toMatchObject({ raw: '74.6', value: 74.6, kind: 'number', shown: '75' })
  })

  it('keeps zero-padded IDs, dates as displayed, and text exactly', () => {
    const bytes = xlsxOf({
      S: [
        ['ID', 'DOB', 'Absences', 'Code'],
        [{ t: 'n', v: 417, z: '00000' }, { t: 'n', v: 38057, z: 'yyyy-mm-dd' }, '10 ', '00418'],
      ],
    })
    const row = readFileToTable('a.xlsx', bytes).table.rows[0]!
    expect(row[0]).toMatchObject({ raw: '00417', kind: 'number', value: 417 })
    expect(row[1]).toMatchObject({ raw: '2004-03-11', kind: 'text' })
    expect(row[2]).toMatchObject({ raw: '10 ', kind: 'text-number' })
    expect(row[3]!.raw).toBe('00418')
  })

  it('compares percent-formatted numbers as percent and tells the user', () => {
    const bytes = xlsxOf({ S: [['Attendance'], [{ t: 'n', v: 0.746, z: '0%' }]] })
    const { table } = readFileToTable('a.xlsx', bytes)
    expect(table.rows[0]![0]).toMatchObject({ raw: '74.6%', value: 74.6, kind: 'number', shown: '75%' })
    expect(table.notices[0]!.kind).toBe('percent-format')
  })

  it('finds the header below blank rows and numbers rows like Excel', () => {
    const bytes = xlsxOf({ S: [[null], [null], ['ID', 'Score'], ['S1', 5]] })
    const { table } = readFileToTable('a.xlsx', bytes)
    expect(table.headers).toEqual(['ID', 'Score'])
    expect(table.rowNumbers).toEqual([4])
  })

  it('refuses a sheet with headers only', () => {
    expect(() => readFileToTable('a.xlsx', xlsxOf({ S: [['ID', 'Score']] }))).toThrow(NoRowsError)
  })
})
