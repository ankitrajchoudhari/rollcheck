import type { Rule } from '../engine/core'

/** What a result was produced with: shown on the Rules used sheet and the printout. */
export interface CheckedWith {
  rules: Rule[]
  idColumn: string
  nameColumn: string
  matchColumns: string[]
  at: string
}

export function localTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}
