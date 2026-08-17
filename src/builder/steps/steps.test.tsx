import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from '@/AppRoutes'
import { SKILL_CONTAINERS } from '@/schema/skillCatalog'
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
  test('offers every container as a checkbox with no fieldsets shown', () => {
    renderStep('expertise')

    for (const container of SKILL_CONTAINERS) {
      expect(
        screen.getByRole('checkbox', { name: container.name }),
      ).not.toBeChecked()
    }

    expect(screen.queryByRole('button', { name: '+ Add skill' })).toBeNull()
  })

  test('groups level-2 containers under their level-1 heading', () => {
    renderStep('expertise')

    expect(screen.getByText('Programming')).toBeVisible()
    // A level-1 leaf is its own container, so it appears once as a checkbox only.
    expect(screen.getByRole('checkbox', { name: 'Testing' })).toBeVisible()
    expect(screen.queryByText('Testing', { selector: 'p' })).toBeNull()
  })

  test('checking a container reveals its fieldset', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Python' }))

    expect(screen.getByRole('group', { name: 'Programming — Python' })).toBeVisible()
    expect(screen.getByRole('button', { name: '+ Add skill' })).toBeVisible()
    expect(
      screen.queryByRole('group', { name: 'Programming — Java' }),
    ).toBeNull()
  })

  test('a level-1 leaf fieldset is titled by its own name alone', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Infrastructure' }))

    expect(screen.getByRole('group', { name: 'Infrastructure' })).toBeVisible()
  })

  test('unchecking hides the fieldset but keeps what was entered', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Java' }))
    await user.click(screen.getByRole('button', { name: '+ Add skill' }))
    await user.type(screen.getByLabelText(/^Skill/), 'Spring')

    await user.click(screen.getByRole('checkbox', { name: 'Java' }))
    expect(screen.queryByLabelText(/^Skill/)).toBeNull()

    await user.click(screen.getByRole('checkbox', { name: 'Java' }))
    expect(screen.getByLabelText(/^Skill/)).toHaveValue('Spring')
  })

  test('a container with sub-items lists them as checkboxes instead of a text input', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Node.js' }))

    for (const framework of ['React', 'Angular', 'Vue']) {
      expect(screen.getByRole('checkbox', { name: framework })).not.toBeChecked()
    }
    expect(screen.queryByLabelText(/^Skill/)).toBeNull()
    expect(screen.queryByRole('button', { name: '+ Add skill' })).toBeNull()
  })

  test('checking a framework reveals only its own attributes', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Mobile development' }))
    expect(screen.queryByLabelText(/Proficiency/)).toBeNull()

    await user.click(screen.getByRole('checkbox', { name: 'Flutter' }))

    expect(screen.getAllByLabelText(/Proficiency/)).toHaveLength(1)
    expect(screen.getAllByLabelText(/Last used/)).toHaveLength(1)
  })

  test('a checked container needs at least one framework checked', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Node.js' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByText(
        'Select or add at least one skill, or uncheck this group',
      ),
    ).toBeVisible()
  })

  test('a checked framework still needs its recency', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Node.js' }))
    await user.click(screen.getByRole('checkbox', { name: 'React' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByText('Select when you last used this skill'),
    ).toBeVisible()
  })

  test('an unchecked framework does not block the step', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Node.js' }))
    await user.click(screen.getByRole('checkbox', { name: 'React' }))
    await user.selectOptions(
      screen.getByLabelText(/Last used/),
      'Within last month',
    )
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Experience summary' }),
    ).toBeVisible()
  })

  test('an unchecked group with incomplete data does not block the step', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Java' }))
    await user.click(screen.getByRole('button', { name: '+ Add skill' }))
    await user.click(screen.getByRole('checkbox', { name: 'Java' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Experience summary' }),
    ).toBeVisible()
  })

  test('a checked group requires a skill name and a recency', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Java' }))
    await user.click(screen.getByRole('button', { name: '+ Add skill' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Skill name is required')).toBeVisible()
    expect(
      screen.getByText('Select when you last used this skill'),
    ).toBeVisible()
  })

  test('a checked open container with no skills says so', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'AI' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByText(
        'Select or add at least one skill, or uncheck this group',
      ),
    ).toBeVisible()
  })

  test('proficiency is always offered and stored as a number', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Security' }))
    await user.click(screen.getByRole('button', { name: '+ Add skill' }))
    await user.selectOptions(screen.getByLabelText(/Proficiency/), '5')

    expect(screen.getByLabelText(/Proficiency/)).toHaveValue('5')
  })

  test('collects experience, recency and certification links per skill', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Infrastructure' }))
    await user.click(screen.getByRole('button', { name: '+ Add skill' }))

    await user.type(screen.getByLabelText(/^Skill/), 'Kubernetes')
    await user.selectOptions(
      screen.getByLabelText(/Last used/),
      'Within last year',
    )
    await user.clear(screen.getByLabelText(/Experience \(years\)/))
    await user.type(screen.getByLabelText(/Experience \(years\)/), '4')
    await user.clear(screen.getByLabelText(/Experience \(months\)/))
    await user.type(screen.getByLabelText(/Experience \(months\)/), '6')

    await user.click(screen.getByRole('button', { name: '+ Add certification link' }))
    await user.type(
      screen.getByLabelText(/Certification URL/),
      'https://example.com/cka',
    )

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Experience summary' }),
    ).toBeVisible()
  })

  test('rejects a malformed certification link', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Data engineering' }))
    await user.click(screen.getByRole('button', { name: '+ Add skill' }))
    await user.type(screen.getByLabelText(/^Skill/), 'Spark')
    await user.selectOptions(
      screen.getByLabelText(/Last used/),
      'Within last month',
    )
    await user.click(screen.getByRole('button', { name: '+ Add certification link' }))
    await user.type(screen.getByLabelText(/Certification URL/), 'not-a-url')

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Enter a valid URL')).toBeVisible()
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
    // Counts checked groups, not the nine always present in form state.
    expect(screen.getByText('0 groups, 0 skills')).toBeVisible()
  })
})
