import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from '@/AppRoutes'
import { clearDraft } from '@/storage/draft'

const renderStep = (stepId: string) =>
  render(
    <MemoryRouter initialEntries={[`/build/${stepId}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )

beforeEach(() => {
  clearDraft()
})

describe('repeatable sections', () => {
  test('start empty so a section can be skipped', async () => {
    const user = userEvent.setup()
    renderStep('qualifications')

    expect(screen.getByText(/No qualifications yet/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Areas of expertise' }),
    ).toBeVisible()
  })

  test('add then remove an item', async () => {
    const user = userEvent.setup()
    renderStep('qualifications')

    await user.click(screen.getByRole('button', { name: '+ Add qualification' }))
    expect(screen.getByLabelText(/Institution/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Remove qualification 1' }))
    expect(screen.queryByLabelText(/Institution/)).toBeNull()
    expect(screen.getByText(/No qualifications yet/)).toBeVisible()
  })

  test('an added item must be completed before advancing', async () => {
    const user = userEvent.setup()
    renderStep('qualifications')

    await user.click(screen.getByRole('button', { name: '+ Add qualification' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Institution is required')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Qualifications' })).toBeVisible()
  })

  test('reordering moves the typed values with the item', async () => {
    const user = userEvent.setup()
    renderStep('qualifications')

    await user.click(screen.getByRole('button', { name: '+ Add qualification' }))
    await user.click(screen.getByRole('button', { name: '+ Add qualification' }))

    const institutions = screen.getAllByLabelText(/Institution/)
    await user.type(institutions[0] as HTMLElement, 'First')
    await user.type(institutions[1] as HTMLElement, 'Second')

    await user.click(
      screen.getByRole('button', { name: 'Move qualification 2 up' }),
    )

    const reordered = screen.getAllByLabelText(/Institution/)
    expect(reordered[0]).toHaveValue('Second')
    expect(reordered[1]).toHaveValue('First')
  })
})

describe('experience step', () => {
  test('marking a role current disables the end date', async () => {
    const user = userEvent.setup()
    renderStep('experience')

    await user.click(screen.getByRole('button', { name: '+ Add role' }))
    expect(screen.getByLabelText(/^End/)).toBeEnabled()

    await user.click(screen.getByLabelText('I currently work here'))

    expect(screen.getByLabelText(/^End/)).toBeDisabled()
  })

  test('a past role requires an end date', async () => {
    const user = userEvent.setup()
    renderStep('experience')

    await user.click(screen.getByRole('button', { name: '+ Add role' }))
    await user.type(screen.getByLabelText(/Company/), 'Dice')
    await user.type(screen.getByLabelText(/Position/), 'Engineer')
    await user.type(screen.getByLabelText(/^Start/), '2016-03')
    await user.type(screen.getByLabelText(/Achievement/), 'Shipped the thing')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByText(
        'End date is required unless this is your current role',
      ),
    ).toBeVisible()
  })

  test('a current role advances without an end date', async () => {
    const user = userEvent.setup()
    renderStep('experience')

    await user.click(screen.getByRole('button', { name: '+ Add role' }))
    await user.type(screen.getByLabelText(/Company/), 'Dice')
    await user.type(screen.getByLabelText(/Position/), 'Engineer')
    await user.type(screen.getByLabelText(/^Start/), '2016-03')
    await user.type(screen.getByLabelText(/Achievement/), 'Shipped the thing')
    await user.click(screen.getByLabelText('I currently work here'))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Certifications & Trainings',
      }),
    ).toBeVisible()
  })

  test('a new role starts with one bullet that must be filled', async () => {
    const user = userEvent.setup()
    renderStep('experience')

    await user.click(screen.getByRole('button', { name: '+ Add role' }))

    expect(screen.getByLabelText(/Achievement/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Remove bullet 1' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Add at least one bullet')).toBeVisible()
  })
})

describe('expertise step', () => {
  test('hides proficiency when the group is not rated', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('button', { name: '+ Add group' }))
    expect(screen.getByLabelText(/Proficiency/)).toBeVisible()

    await user.click(screen.getByLabelText('Show proficiency for this group'))

    expect(screen.queryByLabelText(/Proficiency/)).toBeNull()
    expect(screen.getByLabelText(/^Skill/)).toBeVisible()
  })

  test('stores proficiency as a number', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('button', { name: '+ Add group' }))
    await user.selectOptions(screen.getByLabelText(/Proficiency/), '5')

    expect(screen.getByLabelText(/Proficiency/)).toHaveValue('5')
  })
})

describe('tag inputs', () => {
  test('add tags with Enter and remove them individually', async () => {
    const user = userEvent.setup()
    renderStep('experience')

    await user.click(screen.getByRole('button', { name: '+ Add role' }))
    const input = screen.getByLabelText(/Technologies/)

    await user.type(input, 'React{Enter}Go{Enter}')

    const tags = screen.getByRole('list')
    expect(within(tags).getByText('React')).toBeVisible()
    expect(within(tags).getByText('Go')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Remove React' }))

    expect(screen.queryByText('React')).toBeNull()
    expect(screen.getByText('Go')).toBeVisible()
  })

  test('ignores duplicates', async () => {
    const user = userEvent.setup()
    renderStep('experience')

    await user.click(screen.getByRole('button', { name: '+ Add role' }))
    await user.type(screen.getByLabelText(/Technologies/), 'Go{Enter}Go{Enter}')

    expect(screen.getAllByText('Go')).toHaveLength(1)
  })
})

describe('review step', () => {
  test('summarises what has been filled in', async () => {
    render(
      <MemoryRouter initialEntries={['/build/review']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Review & download' }),
    ).toBeVisible()
    expect(screen.getByText('Name missing')).toBeVisible()
    expect(screen.getByText('Not written yet')).toBeVisible()
    expect(screen.getByText('0 roles')).toBeVisible()
  })
})
