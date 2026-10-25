import type { Status } from '../engine/core'

/** A person's decision on a Needs review row. Recorded next to Rollcheck's result, never instead of it. */
export interface Decision {
  status: Exclude<Status, 'review'>
  note: string
}

export type Decisions = Record<number, Decision>

/** The final answer for a row: the person's decision for a decided Needs review row, otherwise Rollcheck's group. */
export const finalStatus = (status: Status, decision: Decision | undefined): Status => (status === 'review' && decision ? decision.status : status)
