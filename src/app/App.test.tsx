// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { App } from './App'

afterEach(cleanup)

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
})
