import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkTable } from './check'
import { classifyText } from './classify'
import { compareWithFormula, formulaPasses, formulaText } from './formula'
import { readFileToTable } from './read'
import { rule } from './test-helpers'

const pass = (r: ReturnType<typeof rule>, raw: string) => formulaPasses(r, classifyText(raw))

describe('formula semantics (Excel comparison rules)', () => {
  it('text is greater than any number', () => {
    expect(pass(rule('G3', 'atLeast', '10'), '9,8')).toBe(true)
    expect(pass(rule('G3', 'atLeast', '10'), 'AB')).toBe(true)
    expect(pass(rule('a', 'atMost', '10'), 'AB')).toBe(false)
    expect(pass(rule('a', 'atMost', '10'), '10 ')).toBe(false)
  })

  it('an empty cell is 0 against numbers', () => {
    expect(pass(rule('a', 'atMost', '10'), '')).toBe(true)
    expect(pass(rule('a', 'atLeast', '75'), '')).toBe(false)
  })

  it('clean numbers compare normally, with no margin', () => {
    expect(pass(rule('G3', 'atLeast', '10'), '9.6')).toBe(false)
    expect(pass(rule('G3', 'atLeast', '10'), '10')).toBe(true)
  })

  it('= ignores case but not spaces, and a number never equals text', () => {
    expect(pass(rule('Fees', 'equals', 'Cleared'), 'cleared')).toBe(true)
    expect(pass(rule('Fees', 'equals', 'Cleared'), 'Cleared ')).toBe(false)
    expect(pass(rule('Y', 'equals', '2'), '2')).toBe(true)
    expect(pass(rule('Fees', 'isNot', 'Pending'), '')).toBe(true)
    expect(pass(rule('C', 'oneOf', 'GEN;SC'), 'sc')).toBe(true)
  })

  it('a cell of spaces is not blank to a formula', () => {
    expect(pass(rule('Fees', 'notBlank'), '  ')).toBe(true)
    expect(pass(rule('Fees', 'notBlank'), '')).toBe(false)
  })

  it('writes the formula an office would type', () => {
    expect(formulaText([rule('absences', 'atMost', '10'), rule('G3', 'atLeast', '10')])).toBe('=IF(AND(absences<=10, G3>=10), "Eligible", "Not eligible")')
    expect(formulaText([rule('Fees', 'equals', 'Cleared')])).toBe('=IF(Fees="Cleared", "Eligible", "Not eligible")')
    expect(formulaText([rule('Cat', 'oneOf', 'GEN;SC')])).toBe('=IF(OR(Cat="GEN", Cat="SC"), "Eligible", "Not eligible")')
  })
})

describe('on the sample data', () => {
  const { table } = readFileToTable('s.csv', readFileSync('public/sample/rollcheck-sample.csv'))
  const rules = [rule('absences', 'atMost', '10'), rule('G3', 'atLeast', '10')]
  const result = checkTable(table, rules, { idColumn: 'Student ID', nameColumn: 'Student Name', matchColumns: ['age', 'school'] })
  const cmp = compareWithFormula(table, rules, result)
  const at = (row: number) => cmp.verdicts[table.rowNumbers.indexOf(row)]

  it('matches the documented trap rows in docs/excel-comparison.xlsx', () => {
    expect(at(67)).toBe('eligible') // G3 "9,8"
    expect(at(32)).toBe('eligible') // blank absences
    expect(at(44)).toBe('not-eligible') // "10 "
    expect(at(22)).toBe('not-eligible') // "AB"
    expect(cmp.differ).toHaveLength(29)
    expect(cmp.passedUnchecked + cmp.failedUnchecked).toBe(29)
  })
})
