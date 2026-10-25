import type { Rule } from '../engine/core'

// "Try sample data": the demo rules and columns for public/sample/rollcheck-sample.csv.
export const SAMPLE_FILE = 'rollcheck-sample.csv'

export const sampleRules = (): Rule[] => [
  { id: 'sample-1', column: 'absences', condition: 'atMost', value: '10', margin: 1 },
  { id: 'sample-2', column: 'G3', condition: 'atLeast', value: '10', margin: 1 },
]

export const sampleColumns = { idColumn: 'Student ID', nameColumn: 'Student Name', matchColumns: ['age', 'school'] }
