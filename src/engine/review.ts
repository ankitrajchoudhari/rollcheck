import { reasons as r } from './reasons'
import type { CheckOptions, Table } from './types'

export interface ReviewFlags {
  /** Row index → sentences to add to that row's reason. */
  flags: Map<number, string[]>
  duplicateIdRows: number
  likelyDuplicateRows: number
}

const norm = (s: string) => s.trim().toLowerCase()

/** "S. Kumar" → ["s", "kumar"]: lowercase, dots removed, spaces collapsed. */
export function normaliseName(name: string): string[] {
  return name.toLowerCase().replace(/\./g, ' ').trim().split(/\s+/).filter(Boolean)
}

/** Same number of parts; each part equal, or a single letter that is the other's initial. */
export function namesMatch(a: string[], b: string[]): boolean {
  if (a.length === 0 || a.length !== b.length) return false
  return a.every((p, i) => {
    const q = b[i]!
    if (p === q) return true
    if (p.length === 1) return q.startsWith(p)
    if (q.length === 1) return p.startsWith(q)
    return false
  })
}

function add(flags: Map<number, string[]>, row: number, sentence: string) {
  const list = flags.get(row)
  if (list) list.push(sentence)
  else flags.set(row, [sentence])
}

/** Row-level checks that don't belong to any one rule: duplicate IDs and likely duplicate students. */
export function detectReviewCases(table: Table, options: CheckOptions): ReviewFlags {
  const flags = new Map<number, string[]>()
  const { headers, rows, rowNumbers } = table
  const idCol = options.idColumn ? headers.indexOf(options.idColumn) : -1
  const nameCol = options.nameColumn ? headers.indexOf(options.nameColumn) : -1
  const matchCols = (options.matchColumns ?? []).map((c) => headers.indexOf(c)).filter((i) => i !== -1)

  let duplicateIdRows = 0
  if (idCol !== -1) {
    const byId = new Map<string, number[]>()
    rows.forEach((row, i) => {
      const id = norm(row[idCol]!.raw)
      if (id === '') return
      const group = byId.get(id)
      if (group) group.push(i)
      else byId.set(id, [i])
    })
    for (const group of byId.values()) {
      if (group.length < 2) continue
      const numbers = group.map((i) => rowNumbers[i]!)
      for (const i of group) {
        add(flags, i, r.duplicateId(headers[idCol]!, rows[i]![idCol]!.raw.trim(), numbers))
        duplicateIdRows++
      }
    }
  }

  let likelyDuplicateRows = 0
  if (nameCol !== -1 && matchCols.length > 0) {
    // Bucket by part count, first letter of the last part and the matching column values
    // (an initial and the full part share their first letter), then compare within each bucket.
    const buckets = new Map<string, { i: number; parts: string[] }[]>()
    rows.forEach((row, i) => {
      const parts = normaliseName(row[nameCol]!.raw)
      const values = matchCols.map((c) => norm(row[c]!.raw))
      if (parts.length === 0 || values.some((v) => v === '')) return
      const key = [parts.length, parts[parts.length - 1]![0], ...values].join('\u0000')
      const bucket = buckets.get(key)
      if (bucket) bucket.push({ i, parts })
      else buckets.set(key, [{ i, parts }])
    })
    const flagged = new Set<number>()
    for (const bucket of buckets.values()) {
      for (let a = 0; a < bucket.length; a++) {
        for (let b = a + 1; b < bucket.length; b++) {
          const x = bucket[a]!
          const y = bucket[b]!
          if (!namesMatch(x.parts, y.parts)) continue
          if (idCol !== -1) {
            const idX = norm(rows[x.i]![idCol]!.raw)
            if (idX !== '' && idX === norm(rows[y.i]![idCol]!.raw)) continue // already a duplicate ID
          }
          const shared = matchCols.map((c) => `${headers[c]} ${rows[x.i]![c]!.raw.trim()}`)
          const nameX = rows[x.i]![nameCol]!.raw.trim()
          const nameY = rows[y.i]![nameCol]!.raw.trim()
          add(flags, x.i, r.likelyDuplicate(rowNumbers[y.i]!, nameX, nameY, shared))
          add(flags, y.i, r.likelyDuplicate(rowNumbers[x.i]!, nameY, nameX, shared))
          flagged.add(x.i).add(y.i)
        }
      }
    }
    likelyDuplicateRows = flagged.size
  }

  return { flags, duplicateIdRows, likelyDuplicateRows }
}
