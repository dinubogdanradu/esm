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
  const topLevelNames = [
    'Programming',
    'Infrastructure',
    'Data engineering',
    'Testing',
    'Security',
    'Management',
    'AI',
  ]

  test('offers only the level-1 headings, all at the same level', () => {
    renderStep('expertise')

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.map((box) => box.getAttribute('aria-label') ?? '')).toEqual(
      checkboxes.map(() => ''),
    )
    expect(checkboxes).toHaveLength(topLevelNames.length)

    for (const name of topLevelNames) {
      expect(screen.getByRole('checkbox', { name })).not.toBeChecked()
    }
    // Level-2 items are not offered until their group is checked.
    expect(screen.queryByRole('checkbox', { name: 'Java' })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'Node.js' })).toBeNull()
  })

  test('a level-1 group with sub-items reveals them rather than a skill list', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))

    const group = screen.getByRole('group', { name: 'Programming' })
    expect(group).toBeVisible()
    // The technologies sit inside the group they belong to, not in a separate
    // section further down the step.
    for (const technology of ['Java', 'Python', 'Node.js', 'Mobile development']) {
      expect(
        within(group).getByRole('checkbox', { name: technology }),
      ).not.toBeChecked()
    }
    expect(screen.queryByRole('button', { name: '+ Add skill' })).toBeNull()
  })

  test('each level nests inside the one above it', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
    await user.click(screen.getByRole('checkbox', { name: 'Node.js' }))
    await user.click(screen.getByRole('checkbox', { name: 'React' }))

    const programming = screen.getByRole('group', { name: 'Programming' })
    const nodeJs = within(programming).getByRole('group', { name: 'Node.js' })
    const react = within(nodeJs).getByRole('group', { name: 'React' })

    expect(within(react).getByLabelText(/Proficiency/)).toBeVisible()
  })

  test('a level-1 leaf holds skills directly', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Infrastructure' }))

    expect(screen.getByRole('group', { name: 'Infrastructure' })).toBeVisible()
    expect(screen.getByRole('button', { name: '+ Add skill' })).toBeVisible()
  })

  test('a technology opens its own section nested inside its group', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
    await user.click(screen.getByRole('checkbox', { name: 'Java' }))

    const group = screen.getByRole('group', { name: 'Programming' })
    expect(within(group).getByRole('group', { name: 'Java' })).toBeVisible()
    expect(screen.getByRole('button', { name: '+ Add skill' })).toBeVisible()
  })

  test('unchecking the group hides the technologies but keeps their data', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
    await user.click(screen.getByRole('checkbox', { name: 'Java' }))
    await user.click(screen.getByRole('button', { name: '+ Add skill' }))
    await user.type(screen.getByLabelText(/^Skill/), 'Spring')

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
    expect(screen.queryByRole('checkbox', { name: 'Java' })).toBeNull()
    expect(screen.queryByLabelText(/^Skill/)).toBeNull()

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
    expect(screen.getByRole('checkbox', { name: 'Java' })).toBeChecked()
    expect(screen.getByLabelText(/^Skill/)).toHaveValue('Spring')
  })

  test('a technology with sub-items lists them as checkboxes instead of a text input', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
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

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
    await user.click(screen.getByRole('checkbox', { name: 'Mobile development' }))
    expect(screen.queryByLabelText(/Proficiency/)).toBeNull()

    await user.click(screen.getByRole('checkbox', { name: 'Flutter' }))

    expect(screen.getAllByLabelText(/Proficiency/)).toHaveLength(1)
    expect(screen.getAllByLabelText(/Last used/)).toHaveLength(1)
  })

  test('a checked group needs at least one technology checked', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByText('Select at least one item, or uncheck this group'),
    ).toBeVisible()
  })

  test('a checked technology needs at least one framework checked', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
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

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
    await user.click(screen.getByRole('checkbox', { name: 'Node.js' }))
    await user.click(screen.getByRole('checkbox', { name: 'React' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByText('Select when you last used this skill'),
    ).toBeVisible()
  })

  test('a fully filled framework advances', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
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

  test('an incomplete technology under an unchecked group does not block the step', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
    await user.click(screen.getByRole('checkbox', { name: 'Node.js' }))
    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Experience summary' }),
    ).toBeVisible()
  })

  test('an unchecked technology with incomplete data does not block the step', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
    await user.click(screen.getByRole('checkbox', { name: 'Java' }))
    await user.click(screen.getByRole('button', { name: '+ Add skill' }))
    await user.click(screen.getByRole('checkbox', { name: 'Java' }))
    await user.click(screen.getByRole('checkbox', { name: 'Python' }))
    await user.click(screen.getByRole('button', { name: '+ Add skill' }))
    await user.type(screen.getByLabelText(/^Skill/), 'Django')
    await user.selectOptions(
      screen.getByLabelText(/Last used/),
      'Within last month',
    )
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Experience summary' }),
    ).toBeVisible()
  })

  test('a checked technology requires a skill name and a recency', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: 'Programming' }))
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
