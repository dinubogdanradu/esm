import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, vi } from 'vitest'
import AppRoutes from '@/AppRoutes'
import { DRAFT_KEY, clearDraft } from '@/storage/draft'

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )

const seedDraft = (draft: unknown) => {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

const validPersonal = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  headline: 'Senior Engineer',
  email: 'ada@example.com',
}

beforeEach(() => {
  clearDraft()
})

describe('step routing', () => {
  test('redirects an unknown path to the first step', async () => {
    renderAt('/nowhere')

    expect(
      await screen.findByRole('heading', { name: 'Personal details' }),
    ).toBeVisible()
  })

  test('redirects an unknown step id to the first step', async () => {
    renderAt('/build/not-a-step')

    expect(
      await screen.findByRole('heading', { name: 'Personal details' }),
    ).toBeVisible()
  })

  test('deep links straight to a later step', async () => {
    renderAt('/build/projects')

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeVisible()
    expect(screen.getByText('Step 8 of 9')).toBeVisible()
  })
})

describe('validation gating', () => {
  test('blocks advancing while the step is invalid', async () => {
    const user = userEvent.setup()
    renderAt('/build/personal')

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Fix the highlighted fields before continuing.',
    )
    expect(
      screen.getByRole('heading', { name: 'Personal details' }),
    ).toBeVisible()
  })

  test('advances once the step is valid', async () => {
    seedDraft({ personal: validPersonal })
    const user = userEvent.setup()
    renderAt('/build/personal')

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Profile summary' }),
    ).toBeVisible()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('ignores validation of other steps when advancing', async () => {
    // profile.summary is still empty, which must not block the personal step.
    seedDraft({ personal: validPersonal })
    const user = userEvent.setup()
    renderAt('/build/personal')

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Profile summary' }),
    ).toBeVisible()
  })

  test('a step with no required fields advances freely', async () => {
    const user = userEvent.setup()
    renderAt('/build/projects')

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Review & download' }),
    ).toBeVisible()
  })
})

describe('step navigation', () => {
  test('locks steps beyond the furthest one reached', async () => {
    renderAt('/build/personal')

    expect(await screen.findByRole('button', { name: /Projects/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Personal details/ })).toBeEnabled()
  })

  test('going back leaves the reached steps unlocked', async () => {
    seedDraft({ personal: validPersonal })
    const user = userEvent.setup()
    renderAt('/build/personal')

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('heading', { name: 'Profile summary' })
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(
      await screen.findByRole('heading', { name: 'Personal details' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: /Profile summary/ })).toBeEnabled()
  })

  test('Back is disabled on the first step', () => {
    renderAt('/build/personal')

    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  })

  test('Next is absent on the last step', async () => {
    renderAt('/build/review')

    expect(
      await screen.findByRole('heading', { name: 'Review & download' }),
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
  })
})

describe('draft persistence', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('autosaves form state after the debounce elapses', async () => {
    vi.useFakeTimers()
    renderAt('/build/personal')

    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(600)
    })

    const stored = window.localStorage.getItem(DRAFT_KEY)
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored ?? '{}')).toMatchObject({
      personal: { firstName: '' },
      experience: [],
    })
  })

  test('rehydrates a stored draft into form state', async () => {
    seedDraft({ personal: validPersonal, profile: { summary: 'Builds things.' } })
    const user = userEvent.setup()
    renderAt('/build/personal')

    // Advancing twice only succeeds if both sections were rehydrated.
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('heading', { name: 'Profile summary' })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Qualifications' }),
    ).toBeVisible()
  })
})
