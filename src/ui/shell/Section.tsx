import type { ReactNode } from 'react'

/** A register-style card: a ruled header strip with a number and title, then the body. */
export function Section({
  n,
  title,
  hint,
  action,
  children,
  id,
  flush = false,
}: {
  n?: string
  title: string
  hint?: ReactNode
  action?: ReactNode
  children: ReactNode
  id?: string
  /** No body padding, for tables that run edge to edge. */
  flush?: boolean
}) {
  const headingId = id ? `${id}-title` : undefined
  return (
    <section aria-labelledby={headingId} className="overflow-hidden rounded-md border border-line bg-surface">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-bg/60 px-4 py-3 sm:px-5">
        {n && <span className="tnum pt-0.5 font-mono text-xs text-muted">{n}</span>}
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="text-base font-semibold">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={flush ? '' : 'px-4 py-4 sm:px-5'}>{children}</div>
    </section>
  )
}
