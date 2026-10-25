import type { Condition, Rule } from '../engine/core'

/** A common office check, with columns found by name in whatever file is open. */
export interface Template {
  id: string
  name: string
  summary: string
  rules: { label: string; match: RegExp; condition: Condition; value: string; margin: number }[]
}

const ATTENDANCE = /attend|present|\batt\b/i
const FEES = /fee|dues|payment/i
const MARKS = /mark|score|percent|cgpa|gpa|grade|\btotal\b|\bg3\b/i

export const TEMPLATES: Template[] = [
  {
    id: 'exam',
    name: 'Exam eligibility',
    summary: 'Attendance at least 75, fees cleared',
    rules: [
      { label: 'Attendance', match: ATTENDANCE, condition: 'atLeast', value: '75', margin: 1 },
      { label: 'Fees', match: FEES, condition: 'equals', value: 'Cleared', margin: 0 },
    ],
  },
  {
    id: 'scholarship',
    name: 'Scholarship renewal',
    summary: 'Attendance at least 75, marks at least 60, fees cleared',
    rules: [
      { label: 'Attendance', match: ATTENDANCE, condition: 'atLeast', value: '75', margin: 1 },
      { label: 'Marks', match: MARKS, condition: 'atLeast', value: '60', margin: 1 },
      { label: 'Fees', match: FEES, condition: 'equals', value: 'Cleared', margin: 0 },
    ],
  },
  {
    id: 'records',
    name: 'Record complete',
    summary: 'Name and date of birth filled in',
    rules: [
      { label: 'Name', match: /name/i, condition: 'notBlank', value: '', margin: 0 },
      { label: 'Date of birth', match: /dob|birth/i, condition: 'notBlank', value: '', margin: 0 },
    ],
  },
  {
    id: 'sample',
    name: 'Sample data demo',
    summary: 'absences at most 10, G3 at least 10',
    rules: [
      { label: 'absences', match: /^absences$/i, condition: 'atMost', value: '10', margin: 1 },
      { label: 'G3', match: /^g3$/i, condition: 'atLeast', value: '10', margin: 1 },
    ],
  },
]

let seq = 0

/** Fill a template's columns from these headers. Unmatched rules keep an empty column for the user to choose. */
export function applyTemplate(t: Template, headers: string[]): { rules: Rule[]; unmatched: string[] } {
  const used = new Set<string>()
  const unmatched: string[] = []
  const rules = t.rules.map((r) => {
    const column = headers.find((h) => !used.has(h) && r.match.test(h)) ?? ''
    if (column) used.add(column)
    else unmatched.push(r.label)
    return { id: `tpl-${t.id}-${++seq}`, column, condition: r.condition, value: r.value, margin: r.margin }
  })
  return { rules, unmatched }
}
