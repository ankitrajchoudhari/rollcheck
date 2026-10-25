import { Check, Info, Monitor, Moon, Sun, TriangleAlert } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { Stage } from '../../app/state'
import { copy } from '../copy'

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <rect x="1.5" y="1.5" width="19" height="19" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 8h10M6 11h10M6 14h6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 15l1.6 1.6 3-3.4" stroke="var(--accent)" strokeWidth="1.8" fill="none" />
    </svg>
  )
}

type Theme = 'system' | 'light' | 'dark'
const THEME_KEY = 'rollcheck-theme'

export function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(theme: Theme) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)
  useEffect(() => {
    applyTheme(theme)
    try {
      if (theme === 'system') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* storage blocked: theme still applies for this visit */
    }
  }, [theme])
  const next: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  const label = theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'
  return (
    <button type="button" className="btn btn-quiet text-xs" onClick={() => setTheme(next[theme])} aria-label={`Theme: ${label}. Change theme`}>
      <Icon size={16} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

export function Header() {
  return (
    <header className="border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Mark />
          <span className="text-base font-semibold tracking-tight">{copy.product}</span>
        </div>
        <span className="hidden text-xs text-muted md:inline">{copy.tagline}</span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

const ORDER: Stage[] = ['file', 'rules', 'results']

export function Stepper({ stage, reachable, onGo }: { stage: Stage; reachable: (s: Stage) => boolean; onGo: (s: Stage) => void }) {
  const current = ORDER.indexOf(stage)
  return (
    <nav aria-label="Progress" className="print:hidden">
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {ORDER.map((s, i) => {
          const done = i < current
          const here = i === current
          const can = !here && reachable(s)
          const body = (
            <>
              <span
                className={`tnum inline-flex h-5 w-5 items-center justify-center rounded-sm border font-mono text-[11px] ${
                  here ? 'border-accent bg-accent text-accent-ink' : done ? 'border-accent text-accent' : 'border-line-strong text-muted'
                }`}
                aria-hidden="true"
              >
                {done ? <Check size={12} /> : i + 1}
              </span>
              <span className={here ? 'font-medium text-ink' : 'text-muted'}>{copy.steps[i]}</span>
            </>
          )
          return (
            <li key={s} className="flex items-center gap-1">
              {i > 0 && <span className="mx-1 h-px w-6 bg-line-strong" aria-hidden="true" />}
              {can ? (
                <button type="button" onClick={() => onGo(s)} className="flex items-center gap-2 rounded-sm px-1.5 py-1 hover:bg-accent-soft">
                  {body}
                </button>
              ) : (
                <span className="flex items-center gap-2 px-1.5 py-1" aria-current={here ? 'step' : undefined}>
                  {body}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function Notice({ tone, children }: { tone: 'error' | 'info' | 'warning'; children: ReactNode }) {
  const styles = {
    error: 'border-no/40 bg-no-soft text-no',
    warning: 'border-review-mark/50 bg-review-soft text-review',
    info: 'border-line bg-surface text-ink',
  }[tone]
  const Icon = tone === 'info' ? Info : TriangleAlert
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${styles}`}>
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

export function BusyLine({ label, detail }: { label: string; detail?: string | undefined }) {
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-line-strong border-t-accent motion-reduce:animate-none" aria-hidden="true" />
      {label}
      {detail && <span className="tnum">{detail}</span>}
    </p>
  )
}
