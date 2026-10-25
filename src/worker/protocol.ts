import type { CheckOptions, CheckResult, Progress, Rule, Table } from '../engine/core'

export type Request =
  | { id: number; type: 'read'; fileName?: string; bytes?: Uint8Array; sheet?: string }
  | { id: number; type: 'check'; rules: Rule[]; options: CheckOptions }
  | { id: number; type: 'reset' }

export interface ReadReply {
  table: Table
  sheets: string[]
}

export type Reply =
  | { id: number; type: 'progress'; progress: Progress }
  | { id: number; type: 'read'; result: ReadReply }
  | { id: number; type: 'check'; result: CheckResult }
  | { id: number; type: 'reset' }
  | { id: number; type: 'error'; error: EngineFailure }

/** Errors cross the worker boundary as plain data. */
export interface EngineFailure {
  name: string
  message: string
}

export const toFailure = (e: unknown): EngineFailure =>
  e instanceof Error
    ? { name: e.name, message: e.message }
    : { name: 'Error', message: 'Something went wrong while checking. Nothing was changed.' }
