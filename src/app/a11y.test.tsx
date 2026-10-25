// @vitest-environment jsdom
// Automated accessibility check (axe-core, the engine Lighthouse uses) on every stage.
// Colour contrast is checked separately against the palette; jsdom cannot compute it.
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function violations() {
  const res = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } })
  return res.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target.join(' ')}`)
}

describe('accessibility', () => {
  it('has no axe violations on File, Rules, Results and the row detail', async () => {
    vi.stubGlobal('fetch', async () => new Response(readFileSync('public/sample/rollcheck-sample.csv')))
    const user = userEvent.setup()
    render(<App />)
    expect(await violations()).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Try sample data' }))
    await screen.findByText('Your file, as read')
    expect(await violations()).toEqual([])

    await user.click(screen.getByRole('button', { name: /Check students/ }))
    await screen.findByRole('heading', { name: '120 of 120 students checked' })
    await user.click(screen.getByRole('button', { name: 'Compare with an Excel formula' }))
    expect(await violations()).toEqual([])

    await user.click(screen.getAllByRole('row', { name: /open details/ })[0]!)
    await screen.findByRole('dialog')
    expect(await violations()).toEqual([])
  })
})
