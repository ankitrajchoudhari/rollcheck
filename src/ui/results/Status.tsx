import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import type { Status } from '../../engine/core'
import { statusLabel } from '../copy'

export const STATUS_ICON = { eligible: CircleCheck, 'not-eligible': CircleX, review: TriangleAlert } as const
export const STATUS_TEXT = { eligible: 'text-ok', 'not-eligible': 'text-no', review: 'text-review' } as const
export const STATUS_ICON_COLOR = { eligible: 'text-ok', 'not-eligible': 'text-no', review: 'text-review-mark' } as const
export const STATUS_SOFT = { eligible: 'bg-ok-soft', 'not-eligible': 'bg-no-soft', review: 'bg-review-soft' } as const

/** Always an icon and a text label — never colour alone. */
export function StatusBadge({ status }: { status: Status }) {
  const Icon = STATUS_ICON[status]
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium whitespace-nowrap ${STATUS_TEXT[status]}`}>
      <Icon size={16} className={STATUS_ICON_COLOR[status]} aria-hidden="true" />
      {statusLabel[status]}
    </span>
  )
}
