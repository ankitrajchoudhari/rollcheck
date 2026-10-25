// User-facing text. Short, calm, specific. No exclamation marks.
import type { Condition, Status } from '../engine'

export const copy = {
  product: 'Rollcheck',
  tagline: 'Check a student sheet against eligibility rules. Every student gets a group and a reason.',
  privacy: 'Your file is processed on this computer and never uploaded.',
  drop: 'Drop a .csv or .xlsx file',
  chooseFile: 'Choose a file',
  trySample: 'Try sample data',
  steps: ['File', 'Rules', 'Results'] as const,
  reading: 'Reading file…',
  checking: 'Checking students…',
  checkStudents: 'Check students',
  addRule: 'Add rule',
  maxRules: 'Up to 5 rules',
  needRule: 'Add at least one rule.',
  changeRules: 'Change rules',
  startOver: 'Start over',
  marginLabel: (n: string) => `Treat values within ${n} of the limit as Needs review`,
}

export const statusLabel: Record<Status, string> = {
  eligible: 'Eligible',
  'not-eligible': 'Not eligible',
  review: 'Needs review',
}

export const conditionLabel: Record<Condition, string> = {
  atLeast: 'is at least',
  atMost: 'is at most',
  equals: 'equals',
  isNot: 'is not',
  oneOf: 'is one of',
  notBlank: 'is not blank',
}

export const fmt = (n: number) => n.toLocaleString('en-US')
