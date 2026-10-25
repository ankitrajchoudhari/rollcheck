import { Check, FileSpreadsheet, Info, Lock, Monitor, Moon, Sun, TriangleAlert } from 'lucide-react'
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
    <button type="button" className="btn btn-quiet btn-icon text-xs" onClick={() => setTheme(next[theme])} aria-label={`Theme: ${label}. Change theme`}>
      <Icon size={16} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

const ORDER: Stage[] = ['file', 'rules', 'results']

interface HeaderProps {
  stage: Stage
  reachable: (s: Stage) => boolean
  onGo: (s: Stage) => void
  /** The open file, shown on every stage once one is loaded. */
  file?: { name: string; rows: number } | null
}

/** One bar for everything: the mark, the three stages as tabs, the open file and the theme. */
export function Header({ stage, reachable, onGo, file }: HeaderProps) {
  const current = ORDER.indexOf(stage)
  return (
    <header className="border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-stretch gap-x-6 px-4 sm:px-6">
        <div className="flex items-center gap-2.5 py-3">
          <Mark />
          <span className="text-base font-semibold tracking-tight">{copy.product}</span>
        </div>

        <nav aria-label="Progress" className="order-last -mx-4 flex w-[calc(100%+2rem)] border-t border-line sm:order-none sm:mx-0 sm:w-auto sm:border-t-0">
          <ol className="flex w-full">
            {ORDER.map((s, i) => {
              const done = i < current
              const here = i === current
              const can = !here && reachable(s)
              const inner = (
                <>
                  <span
                    className={`tnum inline-flex h-5 w-5 items-center justify-center rounded-sm border font-mono text-[11px] ${
                      here ? 'border-accent bg-accent text-accent-ink' : done ? 'border-accent text-accent' : 'border-line-strong text-muted'
                    }`}
                    aria-hidden="true"
                  >
                    {done ? <Check size={12} /> : i + 1}
                  </span>
                  <span className={here ? 'font-medium text-ink' : done ? 'text-ink' : 'text-muted'}>{copy.steps[i]}</span>
                </>
              )
              const base = `flex h-full items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors ${here ? 'border-accent' : 'border-transparent'}`
              return (
                <li key={s} className="flex flex-1 sm:flex-none">
                  {can ? (
                    <button type="button" onClick={() => onGo(s)} className={`${base} w-full hover:border-line-strong hover:bg-bg`}>
                      {inner}
                    </button>
                  ) : (
                    <span className={`${base} w-full`} aria-current={here ? 'step' : undefined}>
                      {inner}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="ml-auto flex items-center gap-3 py-3">
          {file && (
            <span className="hidden max-w-[260px] items-center gap-2 rounded-sm border border-line bg-bg px-2.5 py-1 text-xs md:flex" title={file.name}>
              <FileSpreadsheet size={14} className="shrink-0 text-muted" aria-hidden="true" />
              <span className="truncate font-mono">{file.name}</span>
              <span className="tnum shrink-0 text-muted">· {file.rows.toLocaleString('en-US')} rows</span>
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

/** The same quiet line on every page: what the tool promises, and where the sample data comes from. */
export function Footer() {
  return (
    <footer className="mt-12 border-t border-line print:hidden">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-5 text-xs text-muted sm:px-6">
        <span className="flex items-center gap-1.5">
          <Lock size={14} aria-hidden="true" />
          Runs in your browser. Files are never uploaded.
        </span>
        <span>Sample data: UCI Student Performance (Cortez, 2008), CC BY 4.0, with synthetic names.</span>
        <a className="tap ml-auto underline-offset-2 hover:text-ink hover:underline" href="https://github.com/ankitrajchoudhari/rollcheck">
          Source on GitHub
        </a>
      </div>
    </footer>
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
