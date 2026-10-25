import { Download, FileDown, FileUp, Printer } from 'lucide-react'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { detectColumns, parseRuleSet, ruleProblem, serializeRuleSet, type Progress, type Rule } from '../engine/core'
import { download, XLSX_TYPE } from '../io/download'
import { readFileBytes } from '../io/readFile'
import { copy, fmt } from '../ui/copy'
import { FileStage } from '../ui/file/FileStage'
import { CheckPanel } from '../ui/rules/CheckPanel'
import { newRule, RuleBuilder } from '../ui/rules/RuleBuilder'
import { RulesStage } from '../ui/rules/RulesStage'
import { SAMPLE_FILE, sampleColumns, sampleRules } from '../ui/sampleRules'
import { applyTemplate, TEMPLATES } from '../ui/templates'
import { ResultsStage } from '../ui/results/ResultsStage'
import { Footer, Header } from '../ui/shell/Shell'
import { EngineClient } from '../worker/client'
import { initialState, reducer, type Stage } from './state'

const isCancelled = (e: unknown) => e instanceof Error && e.name === 'Cancelled'
const messageOf = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Something went wrong. Nothing was changed.')

export function progressText(p: Progress | undefined): string | undefined {
  if (!p || p.total <= 1) return undefined
  if (p.phase === 'reading') return `${Math.round((p.done / p.total) * 100)}%`
  return `${fmt(p.done)} of ${fmt(p.total)}`
}

export function App({ engine: given }: { engine?: EngineClient }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const engineRef = useRef<EngineClient | null>(given ?? null)
  const engine = () => (engineRef.current ??= new EngineClient())

  const openBytes = useCallback(async (fileName: string, bytes: Uint8Array, rules?: Rule[], columns?: { idColumn: string; nameColumn: string; matchColumns: string[] }) => {
    dispatch({ type: 'busy', label: copy.reading })
    try {
      const { table, sheets } = await engine().read(fileName, bytes, (progress) => dispatch({ type: 'busy', label: copy.reading, progress }))
      const detected = detectColumns(table.headers)
      dispatch({
        type: 'fileRead',
        fileName,
        table,
        sheets,
        idColumn: columns?.idColumn ?? detected.idColumn ?? '',
        nameColumn: columns?.nameColumn ?? detected.nameColumn ?? '',
        matchColumns: columns?.matchColumns ?? detected.matchColumns,
        rules: rules ?? [newRule()],
      })
    } catch (e) {
      if (!isCancelled(e)) dispatch({ type: 'failed', text: messageOf(e) })
    }
  }, [])

  const openFile = useCallback(
    async (file: File) => {
      try {
        await openBytes(file.name, await readFileBytes(file))
      } catch (e) {
        dispatch({ type: 'failed', text: messageOf(e) })
      }
    },
    [openBytes],
  )

  const trySample = async () => {
    dispatch({ type: 'busy', label: copy.reading })
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}sample/${SAMPLE_FILE}`)
      if (!res.ok) throw new Error('The sample file could not be loaded.')
      await openBytes(SAMPLE_FILE, new Uint8Array(await res.arrayBuffer()), sampleRules(), sampleColumns)
    } catch (e) {
      dispatch({ type: 'failed', text: messageOf(e) })
    }
  }

  const chooseSheet = async (sheet: string) => {
    dispatch({ type: 'busy', label: copy.reading })
    try {
      const { table } = await engine().readSheet(sheet)
      dispatch({ type: 'sheetRead', table })
    } catch (e) {
      if (!isCancelled(e)) dispatch({ type: 'failed', text: messageOf(e) })
    }
  }

  const [showProblems, setShowProblems] = useState(false)
  const problems = state.table ? state.rules.map((r, i) => [i, ruleProblem(r, state.table!.headers)] as const).filter(([, p]) => p) : []

  const check = async () => {
    setShowProblems(true)
    if (!state.table || state.rules.length === 0 || problems.length > 0) return
    dispatch({ type: 'busy', label: copy.checking })
    const options = { idColumn: state.idColumn, nameColumn: state.nameColumn, matchColumns: state.matchColumns }
    try {
      const result = await engine().check(state.rules, options, (progress) => dispatch({ type: 'busy', label: copy.checking, progress }))
      setShowProblems(false)
      dispatch({ type: 'checked', result })
    } catch (e) {
      if (!isCancelled(e)) dispatch({ type: 'failed', text: messageOf(e) })
    }
  }

  const startOver = () => {
    engine().reset()
    setShowProblems(false)
    dispatch({ type: 'startOver' })
  }

  const downloadResults = async () => {
    if (!state.table || !state.result || !state.checked) return
    // SheetJS is only needed here, so it loads on the first download.
    const { buildResultsWorkbook, resultsFileName, workbookBytes } = await import('../io/exportXlsx')
    download(resultsFileName(state.table.fileName), workbookBytes(buildResultsWorkbook(state.table, state.result, state.checked, state.decisions)), XLSX_TYPE)
  }

  const saveRuleSet = () => {
    const src = state.stage === 'results' && state.checked ? state.checked : state
    const json = serializeRuleSet({ rules: src.rules, idColumn: src.idColumn, nameColumn: src.nameColumn, matchColumns: src.matchColumns })
    download('rollcheck-rules.json', json, 'application/json')
  }

  const applyTemplateById = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)
    if (!t || !state.table) return
    const { rules, unmatched } = applyTemplate(t, state.table.headers)
    setShowProblems(unmatched.length > 0)
    dispatch({
      type: 'rulesReplaced',
      rules,
      text: unmatched.length
        ? `Template "${t.name}" added. This file has no column that looks like ${unmatched.join(' or ')} — choose one for each marked rule.`
        : `Template "${t.name}" added. Check the columns it picked, then Check students.`,
    })
  }

  const ruleSetInput = useRef<HTMLInputElement>(null)
  const loadRuleSet = async (file: File) => {
    if (!state.table) return
    try {
      const { ruleSet, missingColumns } = parseRuleSet(await file.text(), state.table.headers)
      setShowProblems(missingColumns.length > 0)
      dispatch({
        type: 'ruleSetLoaded',
        rules: ruleSet.rules.map((r) => ({ ...r, id: newRule().id })),
        ...(ruleSet.idColumn ? { idColumn: ruleSet.idColumn } : {}),
        ...(ruleSet.nameColumn ? { nameColumn: ruleSet.nameColumn } : {}),
        matchColumns: ruleSet.matchColumns,
        missingColumns,
      })
    } catch (e) {
      dispatch({ type: 'failed', text: messageOf(e) })
    }
  }

  // Each stage opens at its top, not wherever the last one was scrolled to.
  useEffect(() => {
    window.scrollTo?.({ top: 0 })
  }, [state.stage])

  const reachable = (s: Stage) => s === 'file' || (s === 'rules' && !!state.table) || (s === 'results' && !!state.result)

  return (
    <div className="min-h-screen">
      <Header
        stage={state.stage}
        reachable={reachable}
        onGo={(stage) => dispatch({ type: 'goTo', stage })}
        file={state.table ? { name: state.table.fileName, rows: state.table.rows.length } : null}
      />
      <main className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-6">

        {state.stage === 'file' && (
          <FileStage
            busy={state.busy ? { label: state.busy.label, detail: progressText(state.busy.progress) } : null}
            error={state.message?.tone === 'error' ? state.message.text : null}
            onFile={openFile}
            onSample={trySample}
          />
        )}

        {state.stage === 'rules' && state.table && (
          <RulesStage
            table={state.table}
            sheets={state.sheets}
            idColumn={state.idColumn}
            nameColumn={state.nameColumn}
            matchColumns={state.matchColumns}
            busy={state.busy !== null}
            message={state.message}
            onSheet={chooseSheet}
            onColumns={(c) => dispatch({ type: 'columns', ...c })}
            ruleActions={
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="template" className="sr-only">Start from a template</label>
                <select
                  id="template"
                  className="field field-sm min-w-0 flex-1 sm:max-w-[320px] sm:flex-none"
                  value=""
                  onChange={(e) => e.target.value && applyTemplateById(e.target.value)}
                >
                  <option value="">Start from a template…</option>
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.summary}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn px-2.5 py-1 text-xs" onClick={() => ruleSetInput.current?.click()}>
                  <FileUp size={16} aria-hidden="true" />
                  Load rule set
                </button>
                <input
                  ref={ruleSetInput}
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Load rule set"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) void loadRuleSet(f)
                  }}
                />
              </div>
            }
            aside={
              <CheckPanel
                table={state.table}
                rules={state.rules}
                idColumn={state.idColumn}
                nameColumn={state.nameColumn}
                matchColumns={state.matchColumns}
                busy={state.busy ? { label: state.busy.label, detail: progressText(state.busy.progress) } : null}
                problem={
                  state.rules.length === 0
                    ? copy.needRule
                    : showProblems && problems.length > 0
                      ? problems.length === 1
                        ? `Rule ${problems[0]![0] + 1}: ${problems[0]![1]}`
                        : `${problems.length} rules are incomplete. Each one is marked.`
                      : null
                }
                onCheck={check}
                onStartOver={startOver}
              />
            }
          >
            <RuleBuilder
              table={state.table}
              rules={state.rules}
              showProblems={showProblems}
              missingColumns={state.missingColumns}
              onChange={(rules) => dispatch({ type: 'rules', rules })}
            />
          </RulesStage>
        )}

        {state.stage === 'results' && state.table && state.result && state.checked && (
          <ResultsStage
            table={state.table}
            result={state.result}
            rules={state.checked.rules}
            checked={state.checked}
            actions={
              <>
                <button type="button" className="btn btn-primary" onClick={downloadResults}>
                  <Download size={16} aria-hidden="true" />
                  Download results (.xlsx)
                </button>
                <button type="button" className="btn" onClick={saveRuleSet}>
                  <FileDown size={16} aria-hidden="true" />
                  Save rule set
                </button>
                <button type="button" className="btn" onClick={() => window.print()}>
                  <Printer size={16} aria-hidden="true" />
                  Print
                </button>
              </>
            }
            idColumn={state.checked.idColumn}
            nameColumn={state.checked.nameColumn}
            filter={state.filter}
            search={state.search}
            selectedRow={state.selectedRow}
            onFilter={(filter) => dispatch({ type: 'filter', filter })}
            onSearch={(search) => dispatch({ type: 'search', search })}
            onOpenRow={(index) => dispatch({ type: 'openRow', index })}
            decisions={state.decisions}
            onDecide={(index, decision) => dispatch({ type: 'decide', index, decision })}
            onChangeRules={() => dispatch({ type: 'goTo', stage: 'rules' })}
            onStartOver={startOver}
          />
        )}
      </main>
      <Footer />
    </div>
  )
}
