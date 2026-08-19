import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from '@/AppRoutes'
import { DRAFT_KEY, clearDraft } from '@/storage/draft'
import {
  EXPERTISE_ENTRIES,
  TOP_LEVEL_ENTRIES,
  ancestorKeys,
  findEntry,
} from '@/schema/skillCatalog'

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
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByText(
        'End date is required unless this is your current role',
      ),
    ).toBeVisible()
  })

  test('a current role advances without an end date', async () => {
    // Achievements are seeded through a draft: typing into the rich text editor is
    // ProseMirror's job, and its behaviour under jsdom is not what this test is about.
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        experience: [
          {
            company: 'Dice',
            position: 'Engineer',
            startDate: '2016-03',
            current: true,
            achievements: 'Shipped the thing',
          },
        ],
      }),
    )
    const user = userEvent.setup()
    renderStep('experience')

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Certifications & Trainings',
      }),
    ).toBeVisible()
  })

  test('edits achievements in a formatted editor', async () => {
    const user = userEvent.setup()
    renderStep('experience')

    await user.click(screen.getByRole('button', { name: '+ Add role' }))

    expect(
      await screen.findByRole('textbox', { name: 'Achievements' }),
    ).toBeVisible()
    for (const control of ['Bold', 'Italic', 'Underline', 'Bullet list']) {
      expect(screen.getByRole('button', { name: control })).toBeVisible()
    }
  })

  test('a role needs at least one achievement', async () => {
    const user = userEvent.setup()
    renderStep('experience')

    await user.click(screen.getByRole('button', { name: '+ Add role' }))
    await user.type(screen.getByLabelText(/Company/), 'Dice')
    await user.type(screen.getByLabelText(/Position/), 'Engineer')
    await user.type(screen.getByLabelText(/^Start/), '2016-03')
    await user.click(screen.getByLabelText('I currently work here'))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Add at least one achievement')).toBeVisible()
  })

  test('shows a stored achievement in the editor', async () => {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        experience: [{ company: 'Dice', achievements: 'Shipped the thing' }],
      }),
    )
    renderStep('experience')

    expect(
      await screen.findByRole('textbox', { name: 'Achievements' }),
    ).toHaveTextContent('Shipped the thing')
  })
})

describe('expertise step', () => {
  // Everything is derived from skills.md: that file is data the user edits, so naming
  // categories here would make these tests break on every edit.
  const groupEntry = TOP_LEVEL_ENTRIES.find((entry) => entry.childKeys.length > 0)
  if (!groupEntry) throw new Error('skills.md needs a top-level category with children')

  const childEntry = findEntry(groupEntry.childKeys[0] ?? '')
  if (!childEntry) throw new Error('missing child category')

  const rated = EXPERTISE_ENTRIES.find(
    (entry) => entry.options.length > 0 && ancestorKeys(entry.key).length > 0,
  )
  const nestedOpen = EXPERTISE_ENTRIES.find(
    (entry) => entry.open && entry.depth > 1,
  )
  const topOpen = TOP_LEVEL_ENTRIES.find((entry) => entry.open)
  if (!rated || !nestedOpen || !topOpen) {
    throw new Error('skills.md needs a nested rated category, a nested open one, and a top-level open one')
  }

  const leafName = rated.options[0] ?? ''

  /**
   * Checks a category and every ancestor above it, top down, returning the innermost
   * group. Each step is scoped to its parent because names repeat across the tree —
   * "Other" appears at several levels — so a global lookup would be ambiguous.
   */
  const openTo = async (
    user: ReturnType<typeof userEvent.setup>,
    key: string,
  ): Promise<HTMLElement> => {
    let scope: HTMLElement | undefined

    for (const step of [...ancestorKeys(key).reverse(), key]) {
      const entry = findEntry(step)
      if (!entry) continue

      const where = scope ? within(scope) : screen
      await user.click(where.getByRole('checkbox', { name: entry.name }))
      scope = where.getByRole('group', { name: entry.name })
    }

    if (!scope) throw new Error(`nothing opened for "${key}"`)
    return scope
  }

  test('offers only the top-level categories, all at the same level', () => {
    renderStep('expertise')

    expect(screen.getAllByRole('checkbox')).toHaveLength(TOP_LEVEL_ENTRIES.length)
    for (const entry of TOP_LEVEL_ENTRIES) {
      expect(screen.getByRole('checkbox', { name: entry.name })).not.toBeChecked()
    }
    expect(screen.queryByRole('checkbox', { name: childEntry.name })).toBeNull()
  })

  test('a category reveals its leaf skills and sub-categories in file order', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: groupEntry.name }))

    const group = screen.getByRole('group', { name: groupEntry.name })
    const labels = within(group)
      .getAllByRole('checkbox')
      .map((box) => box.getAttribute('id'))
      .map((id) => group.querySelector(`label[for="${id}"]`)?.textContent)

    const expected = groupEntry.items.map((item) =>
      item.kind === 'skill' ? item.name : (findEntry(item.key)?.name ?? ''),
    )
    expect(labels).toEqual(expected)
  })

  test('a leaf skill opens its own attributes, not a skill list', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    const category = await openTo(user, rated.key)
    expect(screen.queryByLabelText(/Proficiency/)).toBeNull()

    await user.click(within(category).getByRole('checkbox', { name: leafName }))

    const leaf = within(category).getByRole('group', { name: leafName })
    expect(within(leaf).getByLabelText(/Proficiency/)).toBeVisible()
    expect(within(leaf).getByLabelText(/Last used/)).toBeVisible()
    // The leaf names itself, so there is nothing to type and nothing to add.
    expect(screen.queryByLabelText(/^Skill/)).toBeNull()
  })

  test('a category with no sub-items lets the user name its skills', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: topOpen.name }))

    const group = screen.getByRole('group', { name: topOpen.name })
    expect(within(group).getByRole('button', { name: '+ Add skill' })).toBeVisible()
  })

  test('a nested open category sits inside its parent', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    const own = await openTo(user, nestedOpen.key)

    expect(within(own).getByRole('button', { name: '+ Add skill' })).toBeVisible()
  })

  test('each level nests inside the one above it', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    const category = await openTo(user, rated.key)
    await user.click(within(category).getByRole('checkbox', { name: leafName }))

    // openTo descended through every level, so the leaf being inside its category
    // proves the nesting.
    expect(within(category).getByRole('group', { name: leafName })).toBeVisible()
  })

  test('unchecking a category hides its subtree but keeps the data', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    const category = await openTo(user, rated.key)
    await user.click(within(category).getByRole('checkbox', { name: leafName }))
    await user.selectOptions(screen.getByLabelText(/Proficiency/), '5')

    await user.click(screen.getByRole('checkbox', { name: groupEntry.name }))
    expect(screen.queryByRole('checkbox', { name: leafName })).toBeNull()

    await user.click(screen.getByRole('checkbox', { name: groupEntry.name }))
    expect(screen.getByRole('checkbox', { name: leafName })).toBeChecked()
    expect(screen.getByLabelText(/Proficiency/)).toHaveValue('5')
  })

  test('a checked category needs a skill or a sub-category checked', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: groupEntry.name }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByText(
        'Select or add at least one skill, or uncheck this group',
      ),
    ).toBeVisible()
  })

  test('a checked leaf skill still needs its recency', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    const category = await openTo(user, rated.key)
    await user.click(within(category).getByRole('checkbox', { name: leafName }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByText('Select when you last used this skill'),
    ).toBeVisible()
  })

  test('a fully filled leaf skill advances', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    const category = await openTo(user, rated.key)
    await user.click(within(category).getByRole('checkbox', { name: leafName }))
    await user.selectOptions(
      screen.getByLabelText(/Last used/),
      'Within last month',
    )
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Experience summary' }),
    ).toBeVisible()
  })

  test('an incomplete subtree under an unchecked parent does not block the step', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await openTo(user, rated.key)
    await user.click(screen.getByRole('checkbox', { name: groupEntry.name }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Experience summary' }),
    ).toBeVisible()
  })

  test('an open category reports its error on the skill list', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    await user.click(screen.getByRole('checkbox', { name: topOpen.name }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByText(
        'Select or add at least one skill, or uncheck this group',
      ),
    ).toBeVisible()
  })

  test('collects experience, recency and certification links for a leaf skill', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    const category = await openTo(user, rated.key)
    await user.click(within(category).getByRole('checkbox', { name: leafName }))

    await user.selectOptions(
      screen.getByLabelText(/Last used/),
      'Within last year',
    )
    await user.clear(screen.getByLabelText(/Experience \(in months\)/))
    await user.type(screen.getByLabelText(/Experience \(in months\)/), '48')

    await user.click(screen.getByRole('button', { name: '+ Add certification link' }))
    await user.type(
      screen.getByLabelText(/Certification URL/),
      'https://example.com/cert',
    )
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByRole('heading', { name: 'Experience summary' }),
    ).toBeVisible()
  })

  test('rejects a malformed certification link', async () => {
    const user = userEvent.setup()
    renderStep('expertise')

    const category = await openTo(user, rated.key)
    await user.click(within(category).getByRole('checkbox', { name: leafName }))
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
