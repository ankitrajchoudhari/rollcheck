import { CircleCheck, CircleX, FileSpreadsheet, TriangleAlert } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { copy } from '../copy'
import { Section } from '../shell/Section'
import { BusyLine, Notice } from '../shell/Shell'

const EXAMPLES = [
  { id: 'S014', icon: CircleCheck, label: 'Eligible', text: 'text-ok', mark: 'text-ok', bar: 'border-l-ok', reason: 'Meets the rule.' },
  { id: 'S017', icon: CircleX, label: 'Not eligible', text: 'text-no', mark: 'text-no', bar: 'border-l-no', reason: 'Attendance is 72, below the 75 limit.' },
  { id: 'S052', icon: TriangleAlert, label: 'Needs review', text: 'text-review', mark: 'text-review-mark', bar: 'border-l-review-mark', reason: 'Attendance is 74.6, within 1 of the 75 limit. Confirm before deciding.' },
  { id: 'S088', icon: TriangleAlert, label: 'Needs review', text: 'text-review', mark: 'text-review-mark', bar: 'border-l-review-mark', reason: "Attendance is 'AB', not a number. Check manually." },
]

const STEPS = [
  ['Upload', 'A .csv or .xlsx export. It is read on this computer.'],
  ['Set rules', 'Up to five. A student must meet every one.'],
  ['Get every student back', 'Grouped, with a reason, ready to download as .xlsx.'],
] as const

interface Props {
  busy: { label: string; detail?: string | undefined } | null
  error: string | null
  onFile: (file: File) => void
  onSample?: (() => void) | undefined
}

export function FileStage({ busy, error, onFile, onSample }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const disabled = busy !== null

  const drop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    const file = e.dataTransfer.files[0]
    if (file && !disabled) onFile(file)
  }

  return (
    <div className="space-y-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="file-title" className="space-y-5">
          <div>
            <p className="eyebrow">Step 1 of 3</p>
            <h1 id="file-title" className="mt-1 text-xl font-semibold tracking-tight">Check a student sheet</h1>
            <p className="mt-2 max-w-[58ch] text-base text-muted">
              Every student comes back as <span className="text-ok">Eligible</span>, <span className="text-no">Not eligible</span> or{' '}
              <span className="text-review">Needs review</span> — with a plain-English reason. Nothing is guessed.
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              if (!disabled) setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={drop}
            onClick={() => !disabled && input.current?.click()}
            className={`ruled relative flex min-h-[236px] cursor-pointer flex-col items-start justify-center gap-3 rounded-md border py-8 pr-6 pl-16 transition-colors ${
              over ? 'border-accent ring-2 ring-accent/30' : 'border-line-strong hover:border-ink/30'
            } ${disabled ? 'cursor-progress opacity-70' : ''}`}
          >
            <FileSpreadsheet size={26} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
            <p className="text-lg font-semibold">{copy.drop}</p>
            <p className="-mt-2 text-sm text-muted">or choose one from your computer. Large exports are fine.</p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                className="btn btn-primary px-4 py-2"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation()
                  input.current?.click()
                }}
              >
                {copy.chooseFile}
              </button>
              {onSample && (
                <button
                  type="button"
                  className="btn px-4 py-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSample()
                  }}
                  disabled={disabled}
                >
                  {copy.trySample}
                </button>
              )}
            </div>
            <input
              ref={input}
              type="file"
              accept=".csv,.xlsx"
              className="sr-only"
              tabIndex={-1}
              aria-label={copy.chooseFile}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) onFile(file)
              }}
            />
          </div>

          {busy && <BusyLine label={busy.label} detail={busy.detail} />}
          {error && <Notice tone="error">{error}</Notice>}
          <p className="text-xs text-muted">{copy.privacy}</p>
        </section>

        <Section title="What you get back" hint={<>Rule: <span className="font-mono text-ink">Attendance is at least 75</span></>} flush>
          <ul className="divide-y divide-line">
            {EXAMPLES.map((e) => {
              const Icon = e.icon
              return (
                <li key={e.id} className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-l-[3px] px-4 py-3 text-xs ${e.bar}`}>
                  <span className="tnum font-mono text-muted">{e.id}</span>
                  <span className={`flex items-center gap-1.5 font-medium ${e.text}`}>
                    <Icon size={14} className={e.mark} aria-hidden="true" />
                    {e.label}
                  </span>
                  <span />
                  <span className="text-sm text-ink">{e.reason}</span>
                </li>
              )
            })}
          </ul>
          <p className="border-t border-line px-4 py-2.5 text-xs text-muted">Every row lands in exactly one group. The counts always add up.</p>
        </Section>
      </div>

      <ol className="grid overflow-hidden rounded-md border border-line bg-surface sm:grid-cols-3" aria-label="How it works">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="flex gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0">
            <span className="tnum font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-xs text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
