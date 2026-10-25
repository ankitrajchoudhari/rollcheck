// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { App } from './App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const csv = (name: string, text: string) => new File([text], name, { type: 'text/csv' })
const UCI = () => new File([readFileSync('data/source/student-mat.csv')], 'student-mat.csv', { type: 'text/csv' })

async function openFile(file: File) {
  const user = userEvent.setup()
  render(<App />)
  await user.upload(screen.getByLabelText('Choose a file'), file)
  return user
}

async function setRule(user: ReturnType<typeof userEvent.setup>, n: number, column: string, condition: string, value: string) {
  await user.selectOptions(screen.getByLabelText('Column', { selector: `#rule-${n}-col` }), column)
  await user.selectOptions(screen.getByLabelText('Condition', { selector: `#rule-${n}-cond` }), condition)
  const input = screen.getByLabelText(/Limit|Value/, { selector: `#rule-${n}-val` })
  await user.clear(input)
  await user.type(input, value)
}

describe('main flow', () => {
  it('reads a file, checks the demo rules, and the counters add up', async () => {
    const user = await openFile(UCI())
    expect(await screen.findByText('Your file, as read')).toBeInTheDocument()
    expect(screen.getAllByText('395').length).toBeGreaterThan(0)

    await setRule(user, 1, 'absences', 'is at most', '10')
    await user.click(screen.getByRole('button', { name: 'Add rule' }))
    await setRule(user, 2, 'G3', 'is at least', '10')
    await user.click(screen.getByRole('button', { name: /Check students/ }))

    expect(await screen.findByRole('heading', { name: '395 of 395 students checked' })).toBeInTheDocument()
    const counters = within(screen.getByRole('group', { name: 'Filter by group' }))
    const n = (label: string) => Number(counters.getByRole('button', { name: new RegExp(label) }).querySelector('[data-count]')!.getAttribute('data-count'))
    expect(n('^Eligible') + n('Not eligible') + n('Needs review')).toBe(395)
    expect(n('^Eligible')).toBe(169)
    expect(n('Needs review')).toBe(60)
  })

  it('shows an error for the wrong file type and stays on File', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<App />)
    await user.upload(screen.getByLabelText('Choose a file'), new File(['x'], 'notes.txt'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only .csv and .xlsx files are supported.')
  })

  it('explains an incomplete rule instead of checking', async () => {
    const user = await openFile(csv('a.csv', 'ID,Score\nS1,5\n'))
    await screen.findByText('Your file, as read')
    await user.click(screen.getByRole('button', { name: /Check students/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Rule 1: Choose a column.')
  })

  it('limits rules to five and can remove one again', async () => {
    const user = await openFile(csv('a.csv', 'ID,Score\nS1,5\n'))
    await screen.findByText('Your file, as read')
    const add = screen.getByRole('button', { name: 'Add rule' })
    for (let i = 0; i < 4; i++) await user.click(add)
    expect(add).toBeDisabled()
    expect(screen.getByText('Up to 5 rules')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove rule 5' }))
    expect(add).toBeEnabled()
  })

  it('hides the value for "is not blank" and shows the margin only for number rules', async () => {
    const user = await openFile(csv('a.csv', 'ID,Score\nS1,5\n'))
    await screen.findByText('Your file, as read')
    expect(screen.getByText('of the limit as Needs review')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Condition'), 'is not blank')
    expect(screen.queryByLabelText(/Limit|Value/)).not.toBeInTheDocument()
    expect(screen.queryByText('of the limit as Needs review')).not.toBeInTheDocument()
  })

  it('moves rules with the keyboard', async () => {
    const user = await openFile(csv('a.csv', 'ID,Score\nS1,5\n'))
    await screen.findByText('Your file, as read')
    await user.selectOptions(screen.getByLabelText('Column', { selector: '#rule-1-col' }), 'ID')
    await user.click(screen.getByRole('button', { name: 'Add rule' }))
    await user.selectOptions(screen.getByLabelText('Column', { selector: '#rule-2-col' }), 'Score')
    screen.getByRole('button', { name: 'Move rule 2 up' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Column', { selector: '#rule-1-col' })).toHaveValue('Score')
    expect(screen.getByLabelText('Column', { selector: '#rule-2-col' })).toHaveValue('ID')
  })

  it('filters by counter, searches, and opens a student with every cell', async () => {
    const user = await openFile(
      csv(
        'a.csv',
        ['Roll No,Student Name,DOB,Attendance,Fees', 'S1,Ana Silva,2004-01-01,80,Cleared', 'S2,Rui Costa,2004-02-02,AB,Cleared', 'S3,R. Costa,2004-02-02,90,Cleared', 'S4,Eva Lima,2004-03-03,60,Cleared'].join('\n'),
      ),
    )
    await screen.findByText('Your file, as read')
    // ID, name and DOB are detected from the headers.
    expect(screen.getByLabelText('ID column')).toHaveValue('Roll No')
    expect(screen.getByLabelText('Name column')).toHaveValue('Student Name')
    expect(screen.getByRole('button', { name: 'Stop matching on DOB' })).toBeInTheDocument()
    await setRule(user, 1, 'Attendance', 'is at least', '75')
    await user.click(screen.getByRole('button', { name: /Check students/ }))
    await screen.findByRole('heading', { name: '4 of 4 students checked' })

    await user.click(screen.getByRole('button', { name: /^Needs review/ }))
    expect(screen.getByText(/Showing 2 of 4/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Search students'), 'zzz')
    expect(await screen.findByText(/No students match/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    await user.click(screen.getByRole('button', { name: 'Show all' }))
    expect(screen.getByText(/Showing 4 of 4/)).toBeInTheDocument()

    await user.click(screen.getByRole('row', { name: 'Row 3, open details' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('All 5 cells, exactly as in the file')).toBeInTheDocument()
    expect(within(dialog).getByText("Attendance is 'AB', not a number. Check manually.")).toBeInTheDocument()
    expect(within(dialog).getByText(/Possible duplicate of row 4/)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Try sample data loads the demo sheet with the demo rules, and every trap is caught', async () => {
    const bytes = readFileSync('public/sample/rollcheck-sample.csv')
    vi.stubGlobal('fetch', async () => new Response(bytes))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Try sample data' }))
    await screen.findByText('Your file, as read')
    expect(screen.getByLabelText('Column', { selector: '#rule-1-col' })).toHaveValue('absences')
    expect(screen.getByLabelText('Column', { selector: '#rule-2-col' })).toHaveValue('G3')
    expect(screen.getByLabelText('ID column')).toHaveValue('Student ID')
    await user.click(screen.getByRole('button', { name: /Check students/ }))
    expect(await screen.findByRole('heading', { name: '120 of 120 students checked' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Needs review/ }))
    for (const text of ['G3 is 9.6, within 1', "absences is 'AB', not a number", 'absences is blank.', "G3 is '9,8', which uses a comma", 'Possible duplicate of row', 'appears twice']) {
      expect(screen.getAllByText((content) => content.includes(text)).length).toBeGreaterThan(0)
    }
  })

  it('the whole journey works with the keyboard only', async () => {
    const bytes = readFileSync('public/sample/rollcheck-sample.csv')
    vi.stubGlobal('fetch', async () => new Response(bytes))
    const user = userEvent.setup()
    render(<App />)
    const tabTo = async (match: (el: Element) => boolean) => {
      for (let i = 0; i < 300 && !(document.activeElement && match(document.activeElement)); i++) await user.tab()
      expect(document.activeElement && match(document.activeElement)).toBe(true)
    }
    const named = (re: RegExp) => (el: Element) => re.test(el.getAttribute('aria-label') ?? el.textContent ?? '')

    await tabTo(named(/^Try sample data$/))
    await user.keyboard('{Enter}')
    await screen.findByText('Your file, as read')
    await tabTo(named(/^Check students/))
    await user.keyboard('{Enter}')
    await screen.findByRole('heading', { name: '120 of 120 students checked' })
    await tabTo(named(/^Needs review/))
    await user.keyboard(' ')
    expect(screen.getByText(/Showing 29 of 120/)).toBeInTheDocument()
    await tabTo((el) => el.getAttribute('role') === 'row')
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement?.getAttribute('role')).toBe('row')
  })

  it('compares with the usual Excel formula and shows where it differs', async () => {
    const bytes = readFileSync('public/sample/rollcheck-sample.csv')
    vi.stubGlobal('fetch', async () => new Response(bytes))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Try sample data' }))
    await screen.findByText('Your file, as read')
    await user.click(screen.getByRole('button', { name: /Check students/ }))
    await screen.findByRole('heading', { name: '120 of 120 students checked' })
    await user.click(screen.getByRole('button', { name: 'Compare with an Excel formula' }))
    expect(screen.getByText('=IF(AND(absences<=10, G3>=10), "Eligible", "Not eligible")')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show only these 29' }))
    expect(screen.getByText(/Showing 29 of 120/)).toBeInTheDocument()
    expect(screen.getAllByText('(differs from Rollcheck)').length).toBe(29)
    await user.click(screen.getByRole('button', { name: /Hide comparison/ }))
    expect(screen.getByText(/Showing 120 of 120/)).toBeInTheDocument()
  })
})

