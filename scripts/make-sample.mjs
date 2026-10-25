// Builds the demo sheet for "Try sample data" from the UCI Student Performance dataset.
// Deterministic: the same input always gives the same output. Usage: npm run sample
//
// Source: Cortez, P. (2008). Student Performance [Dataset]. UCI Machine Learning Repository.
// https://doi.org/10.24432/C5TG7T — licensed CC BY 4.0. Changes are listed in DATA_SOURCES.md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import Papa from 'papaparse'

const SOURCE = 'data/source/student-mat.csv'
const OUT = 'public/sample/rollcheck-sample.csv'
const MANIFEST = 'data/sample-traps.json'
const KEEP = 118 // + 2 inserted rows = 120 students

const parsed = Papa.parse(readFileSync(SOURCE, 'utf8').trim(), { delimiter: ';' })
const [header, ...source] = parsed.data
const SEX = header.indexOf('sex')

// Synthetic names (the schools in the dataset are Portuguese). No real students.
const FIRST_F = ['Ana', 'Beatriz', 'Carolina', 'Daniela', 'Inês', 'Joana', 'Leonor', 'Mariana', 'Marta', 'Rita', 'Sara', 'Sofia', 'Teresa', 'Catarina', 'Helena']
const FIRST_M = ['André', 'Bruno', 'Diogo', 'Duarte', 'Filipe', 'Gonçalo', 'Hugo', 'João', 'Miguel', 'Nuno', 'Pedro', 'Rafael', 'Rui', 'Tiago', 'Vasco']
const LAST = ['Almeida', 'Barbosa', 'Cardoso', 'Carvalho', 'Costa', 'Ferreira', 'Gomes', 'Lopes', 'Marques', 'Martins', 'Mendes', 'Oliveira', 'Pereira', 'Pinto', 'Ribeiro', 'Rocha', 'Santos', 'Sousa', 'Teixeira', 'Vieira']

const rows = source.slice(0, KEEP).map((r, i) => {
  const firsts = r[SEX] === 'F' ? FIRST_F : FIRST_M
  // Step through first and last names so no two students share a full name.
  const name = `${firsts[i % firsts.length]} ${LAST[(i * 7 + Math.floor(i / firsts.length)) % LAST.length]}`
  return [`S${String(i + 1).padStart(3, '0')}`, name, ...r]
})
const OUT_HEADER = ['Student ID', 'Student Name', ...header]
const C = (name) => OUT_HEADER.indexOf(name)

// A trap goes on a row that would otherwise be clearly eligible, so its reason stands alone.
const used = new Set()
const clean = (from) => {
  for (let i = from; i < rows.length; i++) {
    const r = rows[i]
    if (!used.has(i) && Number(r[C('absences')]) <= 6 && Number(r[C('G3')]) >= 12) {
      used.add(i)
      return i
    }
  }
  throw new Error('No clean row left')
}

const traps = []
const set = (i, column, value, what, expect) => {
  traps.push({ row: i + 2, id: rows[i][0], column, from: rows[i][C(column)], to: value, what, expect })
  rows[i][C(column)] = value
}

set(clean(10), 'G3', '9.6', 'Decimal grade just under the limit', 'G3 is 9.6, within 1 of the 10 limit.')
set(clean(20), 'absences', 'AB', '"AB" (absent) instead of a number', "absences is 'AB', not a number.")
set(clean(30), 'absences', '', 'Blank cell in a rule column', 'absences is blank.')
set(clean(40), 'absences', '10 ', 'Number with a trailing space, stored as text', "absences is '10 ', a number stored as text.")
set(clean(50), 'G3', '12%', 'Number stored as text with a percent sign', "G3 is '12%', a number stored as text.")
set(clean(60), 'G3', '9,8', 'Comma used as the decimal mark', "G3 is '9,8', which uses a comma.")

// The same student entered twice: a new ID, the name spelled differently, the same age and school.
const twin = clean(70)
const [first, ...rest] = rows[twin][1].split(' ')
rows[twin][1] = `${first} ${rest.join(' ')}`
const copy = [...rows[twin]]
copy[0] = `S${String(rows.length + 1).padStart(3, '0')}`
copy[1] = `${first[0]}. ${rest.join(' ').toUpperCase()}`
rows.push(copy)
traps.push({
  row: twin + 2,
  id: rows[twin][0],
  column: 'Student Name',
  from: '',
  to: rows[twin][1],
  what: `Same student entered again as ${copy[0]} "${copy[1]}" (row ${rows.length + 1}), same age and school`,
  expect: `Possible duplicate of row ${rows.length + 1}`,
})
traps.push({
  row: rows.length + 1,
  id: copy[0],
  column: 'Student Name',
  from: '',
  to: copy[1],
  what: `Inserted copy of ${rows[twin][0]} with the name spelled "${copy[1]}"`,
  expect: `Possible duplicate of row ${twin + 2}`,
})

// One ID typed twice: a different student given an ID that is already used.
const dupOf = clean(80)
const other = [...rows[clean(90)]]
used.add(rows.length)
other[0] = rows[dupOf][0]
other[1] = 'Vasco Nunes'
rows.push(other)
traps.push({
  row: dupOf + 2,
  id: rows[dupOf][0],
  column: 'Student ID',
  from: '',
  to: rows[dupOf][0],
  what: `Student ID also given to a different student in row ${rows.length + 1}`,
  expect: `Student ID ${rows[dupOf][0]} appears twice (rows ${dupOf + 2} and ${rows.length + 1}).`,
})
traps.push({
  row: rows.length + 1,
  id: other[0],
  column: 'Student ID',
  from: '',
  to: other[0],
  what: `Inserted student "Vasco Nunes" given the existing ID ${other[0]}`,
  expect: `Student ID ${other[0]} appears twice (rows ${dupOf + 2} and ${rows.length + 1}).`,
})

if (rows.length !== 120) throw new Error(`Expected 120 rows, got ${rows.length}`)
if (new Set(rows.map((r) => r[1])).size !== rows.length) throw new Error('Synthetic names must be unique')

mkdirSync('public/sample', { recursive: true })
writeFileSync(OUT, Papa.unparse([OUT_HEADER, ...rows], { delimiter: ';', newline: '\n' }) + '\n')
writeFileSync(MANIFEST, JSON.stringify({ source: SOURCE, output: OUT, students: rows.length, traps }, null, 2) + '\n')
console.log(`Wrote ${OUT} (${rows.length} students) and ${MANIFEST} (${traps.length} trap rows).`)
for (const t of traps) console.log(`  row ${t.row} ${t.id} · ${t.column}: ${t.what}${t.to !== '' || t.from !== '' ? ` ("${t.from}" → "${t.to}")` : ''}`)
