import { describe, expect, it } from 'vitest'
import { classifyText } from './classify'

describe('classifyCell — never guess', () => {
  it.each([
    ['75', 75],
    ['74.6', 74.6],
    ['-3', -3],
    ['0', 0],
    ['.5', 0.5],
  ])('reads clean number %s', (raw, value) => {
    expect(classifyText(raw)).toMatchObject({ kind: 'number', value, raw })
  })

  it.each([
    ['10 ', 10],
    [' 75', 75],
    ['75%', 75],
    ['75 %', 75],
    ['74.6 % ', 74.6],
  ])('parses but flags number stored as text %j', (raw, value) => {
    expect(classifyText(raw)).toMatchObject({ kind: 'text-number', value, raw })
  })

  it.each(['74,6', '9,8', '1,234', '74,6%'])('flags comma decimal %s without guessing', (raw) => {
    expect(classifyText(raw)).toMatchObject({ kind: 'comma-decimal', value: null })
  })

  it.each(['AB', 'N/A', '-', 'absent', '7 5', '1e3', '75%%'])('treats %s as text, not a number', (raw) => {
    expect(classifyText(raw)).toMatchObject({ kind: 'text', value: null })
  })

  it.each(['', '   '])('treats %j as blank', (raw) => {
    expect(classifyText(raw)).toMatchObject({ kind: 'blank', value: null })
  })

  it('keeps the raw text exactly, including spaces', () => {
    expect(classifyText('10 ').raw).toBe('10 ')
  })
})
