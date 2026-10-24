// Prints the demo-rule counts for a file, straight from the engine.
// Usage: npm run demo [-- path/to/file.csv]
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { checkTable, detectColumns, readFileToTable, type Rule } from '../src/engine/index.ts'

const path = process.argv[2] ?? 'data/source/student-mat.csv'
const { table } = readFileToTable(basename(path), readFileSync(path))
const rules: Rule[] = [
  { id: 'r1', column: 'absences', condition: 'atMost', value: '10', margin: 1 },
  { id: 'r2', column: 'G3', condition: 'atLeast', value: '10', margin: 1 },
]
const detected = detectColumns(table.headers)
const isSample = table.headers.includes('Student ID')
const options = isSample ? { idColumn: 'Student ID', nameColumn: 'Student Name', matchColumns: ['age', 'school'] } : detected
const result = checkTable(table, rules, options)
const { eligible, notEligible, review, total } = result.counts

console.log(`${path}`)
console.log('Rules: absences is at most 10 AND G3 is at least 10 (margin 1)\n')
console.log(`${total} of ${total} students checked`)
console.log(`  Eligible      ${eligible}`)
console.log(`  Not eligible  ${notEligible}`)
console.log(`  Needs review  ${review}`)
console.log(`  (sum ${eligible + notEligible + review})\n`)
console.log('First Needs review rows:')
for (const i of result.order.slice(0, Math.min(8, review))) {
  console.log(`  row ${table.rowNumbers[i]}: ${result.rows[i]!.reasons.join(' ')}`)
}
