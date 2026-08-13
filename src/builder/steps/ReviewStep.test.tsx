import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, vi } from 'vitest'
import AppRoutes from '@/AppRoutes'
import { DRAFT_KEY, clearDraft } from '@/storage/draft'

const downloadPdf = vi.hoisted(() => vi.fn())

vi.mock('@/preview/downloadPdf', () => ({ downloadPdf }))

const renderReview = () =>
  render(
    <MemoryRouter initialEntries={['/build/review']}>
      <AppRoutes />
    </MemoryRouter>,
  )

beforeEach(() => {
  clearDraft()
  downloadPdf.mockReset()
  downloadPdf.mockResolvedValue(undefined)
})

describe('download', () => {
  test('hands the current form state to the generator', async () => {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ personal: { firstName: 'Ada', lastName: 'Lovelace' } }),
    )
    const user = userEvent.setup()
    renderReview()

    await user.click(screen.getByRole('button', { name: 'Download PDF' }))

    expect(downloadPdf).toHaveBeenCalledTimes(1)
    expect(downloadPdf.mock.calls[0]?.[0]).toMatchObject({
      personal: { firstName: 'Ada', lastName: 'Lovelace' },
    })
  })

  test('surfaces a failure instead of failing silently', async () => {
    downloadPdf.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderReview()

    await user.click(screen.getByRole('button', { name: 'Download PDF' }))

    expect(
      await screen.findByText('The PDF could not be generated.'),
    ).toBeVisible()
  })

  test('re-enables the button after a run completes', async () => {
    const user = userEvent.setup()
    renderReview()

    await user.click(screen.getByRole('button', { name: 'Download PDF' }))

    expect(
      await screen.findByRole('button', { name: 'Download PDF' }),
    ).toBeEnabled()
  })
})
