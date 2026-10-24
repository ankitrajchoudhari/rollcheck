import type { CheckResult } from './types'

export class InvariantError extends Error {
  /** Technical detail for debugging; the message is what users read. */
  readonly detail: string
  constructor(detail: string) {
    super('The counts did not add up, so no results are shown. Nothing was changed.')
    this.name = 'InvariantError'
    this.detail = detail
  }
}

/** Eligible + Not eligible + Needs review must equal the rows in the file, each row exactly once, each with a reason. */
export function assertInvariant(result: CheckResult, totalRows: number): void {
  const { counts, rows, order } = result
  const sum = counts.eligible + counts.notEligible + counts.review
  if (counts.total !== totalRows || sum !== totalRows) {
    throw new InvariantError(`${sum} of ${totalRows} rows grouped`)
  }
  if (rows.length !== totalRows || order.length !== totalRows) {
    throw new InvariantError(`${rows.length} results for ${totalRows} rows`)
  }
  const seen = new Uint8Array(totalRows)
  for (const i of order) {
    if (i < 0 || i >= totalRows || seen[i]) throw new InvariantError(`row ${i} placed twice or out of range`)
    seen[i] = 1
  }
  rows.forEach((row, i) => {
    if (row.index !== i) throw new InvariantError(`result ${i} belongs to row ${row.index}`)
    if (row.reasons.length === 0 || row.reasons.some((s) => s.trim() === '')) {
      throw new InvariantError(`row ${i} has no reason`)
    }
  })
}
