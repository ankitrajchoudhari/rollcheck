import { describe, expect, it } from 'vitest'
import { applyTemplate, TEMPLATES } from './templates'

const byId = (id: string) => TEMPLATES.find((t) => t.id === id)!

describe('rule templates', () => {
  it('finds columns by name in an exam-cell sheet', () => {
    const { rules, unmatched } = applyTemplate(byId('exam'), ['Roll No', 'Student Name', 'Attendance %', 'Fees Status'])
    expect(rules.map((r) => [r.column, r.condition, r.value])).toEqual([
      ['Attendance %', 'atLeast', '75'],
      ['Fees Status', 'equals', 'Cleared'],
    ])
    expect(unmatched).toEqual([])
  })

  it('leaves a rule for the user to finish when no column matches', () => {
    const { rules, unmatched } = applyTemplate(byId('scholarship'), ['ID', 'Attendance', 'Fee paid'])
    expect(rules[1]!.column).toBe('')
    expect(unmatched).toEqual(['Marks'])
  })

  it('never uses one column for two rules', () => {
    const { rules } = applyTemplate(byId('records'), ['Student Name', 'Date of Birth'])
    expect(rules.map((r) => r.column)).toEqual(['Student Name', 'Date of Birth'])
  })

  it('reproduces the demo rules on the sample columns', () => {
    const { rules } = applyTemplate(byId('sample'), ['Student ID', 'absences', 'G1', 'G3'])
    expect(rules.map((r) => `${r.column} ${r.condition} ${r.value}`)).toEqual(['absences atMost 10', 'G3 atLeast 10'])
  })
})
