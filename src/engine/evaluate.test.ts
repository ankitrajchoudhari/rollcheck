import { describe, expect, it } from 'vitest'
import { classifyText } from './classify'
import { evaluateRule, ruleProblem, splitOptions } from './evaluate'
import { rule } from './test-helpers'

const ev = (r: ReturnType<typeof rule>, raw: string) => evaluateRule(r, classifyText(raw))

describe('is at least / is at most', () => {
  const atLeast = rule('Attendance', 'atLeast', '75')
  const atMost = rule('absences', 'atMost', '10')

  it('passes and fails clear values with a reason', () => {
    expect(ev(atLeast, '80').result).toBe('pass')
    expect(ev(atLeast, '72')).toMatchObject({ result: 'fail', reasons: ['Attendance is 72, below the 75 limit.'] })
    expect(ev(atMost, '3').result).toBe('pass')
    expect(ev(atMost, '14')).toMatchObject({ result: 'fail', reasons: ['absences is 14, above the 10 limit.'] })
  })

  it('sends values within the margin to review, on either side', () => {
    expect(ev(atLeast, '74.6')).toMatchObject({
      result: 'review',
      reasons: ['Attendance is 74.6, within 1 of the 75 limit. Confirm before deciding.'],
    })
    expect(ev(atLeast, '75.4').reasons).toEqual(['Attendance is 75.4, within 1 of the 75 limit. Confirm before deciding.'])
  })

  it('uses a strict boundary: exactly the margin away is decided', () => {
    const g3 = rule('G3', 'atLeast', '10')
    expect(ev(g3, '9').result).toBe('fail')
    expect(ev(g3, '9.6').result).toBe('review')
    expect(ev(g3, '10').result).toBe('review')
    expect(ev(g3, '10.4').result).toBe('review')
    expect(ev(g3, '11').result).toBe('pass')
  })

  it('is not fooled by floating point at the edge', () => {
    const r = rule('A', 'atLeast', '75', 0.1)
    expect(ev(r, '75.1').result).toBe('pass')
    expect(ev(r, '74.9').result).toBe('fail')
    expect(ev(r, '75.05').result).toBe('review')
  })

  it('margin 0 turns the near-limit check off', () => {
    const r = rule('A', 'atLeast', '75', 0)
    expect(ev(r, '75').result).toBe('pass')
    expect(ev(r, '74.9').result).toBe('fail')
  })

  it('honours a custom margin', () => {
    const r = rule('A', 'atLeast', '75', 2.5)
    expect(ev(r, '73').reasons).toEqual(['A is 73, within 2.5 of the 75 limit. Confirm before deciding.'])
    expect(ev(r, '72.5').result).toBe('fail')
  })

  it('never treats text, blanks or comma decimals as numbers', () => {
    expect(ev(atLeast, 'AB')).toMatchObject({ result: 'review', reasons: ["Attendance is 'AB', not a number. Check manually."] })
    expect(ev(atLeast, 'N/A').reasons).toEqual(["Attendance is 'N/A', not a number. Check manually."])
    expect(ev(atLeast, '')).toMatchObject({ result: 'review', reasons: ['Attendance is blank.'] })
    expect(ev(atLeast, '74,6')).toMatchObject({
      result: 'review',
      reasons: ["Attendance is '74,6', which uses a comma. Check whether it means 74.6."],
    })
  })

  it('parses numbers stored as text but always flags them', () => {
    expect(ev(atLeast, '80 %')).toMatchObject({
      result: 'review',
      reasons: ["Attendance is '80 %', a number stored as text. Confirm the value."],
    })
    expect(ev(atMost, '10 ').reasons).toEqual([
      "absences is '10 ', a number stored as text. Confirm the value.",
      'Read as 10, it is close to the 10 limit.',
    ])
    expect(ev(atLeast, '50%').reasons).toEqual([
      "Attendance is '50%', a number stored as text. Confirm the value.",
      'Read as 50, it is below the 75 limit.',
    ])
  })
})

describe('equals / is not / is one of', () => {
  it('equals ignores case and outer spaces but quotes the raw value', () => {
    const r = rule('Fees', 'equals', 'Cleared')
    expect(ev(r, '  cleared ').result).toBe('pass')
    expect(ev(r, 'Pending')).toMatchObject({ result: 'fail', reasons: ["Fees is 'Pending', not 'Cleared'."] })
    expect(ev(r, '')).toMatchObject({ result: 'review', reasons: ['Fees is blank.'] })
  })

  it('equals compares numbers as numbers', () => {
    const r = rule('Year', 'equals', '2')
    expect(ev(r, '2.0').result).toBe('pass')
    expect(ev(r, '3').reasons).toEqual(["Year is 3, not '2'."])
  })

  it('is not', () => {
    const r = rule('Fees', 'isNot', 'Pending')
    expect(ev(r, 'Cleared').result).toBe('pass')
    expect(ev(r, 'PENDING')).toMatchObject({ result: 'fail', reasons: ["Fees is 'PENDING', which is not allowed."] })
  })

  it('is one of splits on new lines or semicolons, never commas', () => {
    expect(splitOptions('GEN; SC\nST\n\n')).toEqual(['GEN', 'SC', 'ST'])
    expect(splitOptions('74,6')).toEqual(['74,6'])
    const r = rule('Category', 'oneOf', 'GEN;SC')
    expect(ev(r, 'sc').result).toBe('pass')
    expect(ev(r, 'OBC').reasons).toEqual(["Category is 'OBC', not one of 'GEN' and 'SC'."])
  })
})

describe('is not blank', () => {
  it('is the one rule where blank is a decided failure', () => {
    const r = rule('Fees', 'notBlank')
    expect(ev(r, 'x').result).toBe('pass')
    expect(ev(r, '  ')).toMatchObject({ result: 'fail', reasons: ['Fees is blank.'] })
  })
})

describe('ruleProblem', () => {
  const headers = ['Attendance', 'Fees']
  it.each([
    [rule('', 'atLeast', '75'), 'Choose a column.'],
    [rule('Gone', 'atLeast', '75'), "Column 'Gone' is not in this file. Choose a column for this rule."],
    [rule('Attendance', 'atLeast', 'abc'), 'Enter a number for the limit.'],
    [rule('Attendance', 'atLeast', '75', -1), 'The margin must be 0 or more.'],
    [rule('Fees', 'equals', ' '), 'Enter a value.'],
    [rule('Fees', 'oneOf', ';;'), 'Enter at least one value.'],
  ])('explains an incomplete rule', (r, message) => {
    expect(ruleProblem(r, headers)).toBe(message)
  })
  it('accepts complete rules', () => {
    expect(ruleProblem(rule('Attendance', 'atLeast', '75'), headers)).toBeNull()
    expect(ruleProblem(rule('Fees', 'notBlank'), headers)).toBeNull()
  })
})
