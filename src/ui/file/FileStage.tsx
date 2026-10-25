import { CircleCheck, CircleX, FileSpreadsheet, Lock, TriangleAlert } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { copy } from '../copy'
import { BusyLine, Notice } from '../shell/Shell'

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
    <section aria-labelledby="file-title" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div>
          <h1 id="file-title" className="text-xl font-semibold tracking-tight">
            Check a student sheet
          </h1>
          <p className="mt-1 max-w-[60ch] text-base text-muted">
            Upload an export, set the eligibility rules, and see every student as Eligible, Not eligible or Needs review — each with a plain-English reason.
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
          className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-[1.5px] border-dashed px-6 py-10 text-center transition-colors ${
            over ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface hover:border-ink/30'
          } ${disabled ? 'cursor-progress opacity-70' : ''}`}
        >
          <FileSpreadsheet size={28} strokeWidth={1.5} className="text-muted" aria-hidden="true" />
          <p className="text-base font-medium">{copy.drop}</p>
          <button
            type="button"
            className="btn"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              input.current?.click()
            }}
          >
            {copy.chooseFile}
          </button>
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
          <p className="text-xs text-muted">.csv or .xlsx · large files are fine</p>
        </div>

        {busy && <BusyLine label={busy.label} detail={busy.detail} />}
        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {onSample && (
            <button type="button" className="btn" onClick={onSample} disabled={disabled}>
              {copy.trySample}
            </button>
          )}
          <p className="flex items-center gap-2 text-xs text-muted">
            <Lock size={14} aria-hidden="true" />
            {copy.privacy}
          </p>
        </div>
      </div>

      <aside aria-label="How students are sorted" className="self-start rounded-md border border-line bg-surface">
        <p className="eyebrow border-b border-line px-4 py-2.5">Every row lands in one group</p>
        <ul className="divide-y divide-line text-sm">
          <li className="flex gap-3 px-4 py-3">
            <CircleCheck size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
            <span><b className="font-medium text-ok">Eligible</b> — meets every rule.</span>
          </li>
          <li className="flex gap-3 px-4 py-3">
            <CircleX size={16} className="mt-0.5 shrink-0 text-no" aria-hidden="true" />
            <span><b className="font-medium text-no">Not eligible</b> — clearly fails a rule.</span>
          </li>
          <li className="flex gap-3 px-4 py-3">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-review-mark" aria-hidden="true" />
            <span>
              <b className="font-medium text-review">Needs review</b> — too close to call, not a number, blank, or a possible duplicate. Never guessed.
            </span>
          </li>
        </ul>
        <p className="border-t border-line px-4 py-2.5 text-xs text-muted">The counts always add up to the rows in your file.</p>
      </aside>
    </section>
  )
}
