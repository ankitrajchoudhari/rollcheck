import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { detectColumns, ruleProblem, type Progress, type Rule } from '../engine'
import { readFileBytes } from '../io/readFile'
import { copy, fmt } from '../ui/copy'
import { FileStage } from '../ui/file/FileStage'
import { CheckPanel } from '../ui/rules/CheckPanel'
import { newRule, RuleBuilder } from '../ui/rules/RuleBuilder'
import { RulesStage } from '../ui/rules/RulesStage'
import { ResultsStage } from '../ui/results/ResultsStage'
import { Header, Stepper } from '../ui/shell/Shell'
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

  // Each stage opens at its top, not wherever the last one was scrolled to.
  useEffect(() => {
    window.scrollTo?.({ top: 0 })
  }, [state.stage])

  const reachable = (s: Stage) => s === 'file' || (s === 'rules' && !!state.table) || (s === 'results' && !!state.result)

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 sm:px-6">
        <Stepper stage={state.stage} reachable={reachable} onGo={(stage) => dispatch({ type: 'goTo', stage })} />

        {state.stage === 'file' && (
          <FileStage
            busy={state.busy ? { label: state.busy.label, detail: progressText(state.busy.progress) } : null}
            error={state.message?.tone === 'error' ? state.message.text : null}
            onFile={openFile}
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
            idColumn={state.checked.idColumn}
            nameColumn={state.checked.nameColumn}
            filter={state.filter}
            onFilter={(filter) => dispatch({ type: 'filter', filter })}
            onChangeRules={() => dispatch({ type: 'goTo', stage: 'rules' })}
            onStartOver={startOver}
          />
        )}
      </main>
    </div>
  )
}
