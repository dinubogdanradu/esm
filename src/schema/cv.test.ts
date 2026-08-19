import {
  cvSchema,
  experienceSchema,
  expertiseSchema,
  personalSchema,
  type ExpertiseGroup,
  type Skill,
} from './cv'
import { blankExperience, blankSkill, defaultCv } from './defaults'
import { emptyRichText, plainRun, richTextFromPlain } from './richText'
import { EXPERTISE_ENTRIES, ancestorKeys } from './skillCatalog'

describe('personalSchema', () => {
  const valid = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    headline: 'Senior Engineer',
    location: '',
    email: 'ada@example.com',
    phone: '',
    website: '',
    linkedin: '',
    photo: '',
  }

  test('accepts required fields with optional ones empty', () => {
    expect(personalSchema.safeParse(valid).success).toBe(true)
  })

  test('rejects whitespace-only required fields', () => {
    const result = personalSchema.safeParse({ ...valid, firstName: '   ' })
    expect(result.success).toBe(false)
  })

  test('rejects a malformed email', () => {
    expect(personalSchema.safeParse({ ...valid, email: 'ada@' }).success).toBe(
      false,
    )
  })

  test('treats an empty optional url as absent but rejects a malformed one', () => {
    expect(personalSchema.safeParse({ ...valid, website: '' }).success).toBe(true)
    expect(
      personalSchema.safeParse({ ...valid, website: 'not a url' }).success,
    ).toBe(false)
  })
})

describe('experienceSchema', () => {
  const base = () => ({
    ...blankExperience(),
    company: 'Dice',
    position: 'Engineer',
    startDate: '2016-03',
    achievements: richTextFromPlain('Shipped the thing'),
  })

  test('requires an end date for a past role', () => {
    const result = experienceSchema.safeParse({
      ...base(),
      current: false,
      endDate: '',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['endDate'])
  })

  test('allows an empty end date for a current role', () => {
    const result = experienceSchema.safeParse({
      ...base(),
      current: true,
      endDate: '',
    })

    expect(result.success).toBe(true)
  })

  test('rejects a date that is not YYYY-MM', () => {
    expect(
      experienceSchema.safeParse({ ...base(), startDate: '2016' }).success,
    ).toBe(false)
    expect(
      experienceSchema.safeParse({ ...base(), startDate: '2016-13' }).success,
    ).toBe(false)
  })

  test('requires at least one achievement', () => {
    const blank = [
      emptyRichText(),
      richTextFromPlain(''),
      // Blocks holding only whitespace do not count as content.
      { blocks: [{ type: 'bullet' as const, runs: [plainRun('   ')] }] },
    ]

    for (const achievements of blank) {
      const result = experienceSchema.safeParse({
        ...base(),
        current: true,
        achievements,
      })

      expect(result.success).toBe(false)
    }
  })

  test('accepts several achievements as blocks of rich text', () => {
    const result = experienceSchema.safeParse({
      ...base(),
      current: true,
      achievements: richTextFromPlain('Shipped the thing\nLed the migration'),
    })

    expect(result.success).toBe(true)
  })

  test('accepts formatting marks on the runs', () => {
    const result = experienceSchema.safeParse({
      ...base(),
      current: true,
      achievements: {
        blocks: [
          {
            type: 'bullet' as const,
            runs: [
              { text: 'Cut deploys ', bold: true, italic: false, underline: false },
              { text: '45min', bold: false, italic: true, underline: true },
            ],
          },
        ],
      },
    })

    expect(result.success).toBe(true)
  })
})

describe('expertiseSchema', () => {
  // Derived from skills.md so edits to that file do not break these tests. The
  // interesting case is a category holding both leaf skills and a sub-category.
  const parent = EXPERTISE_ENTRIES.find(
    (entry) => entry.options.length > 0 && entry.childKeys.length > 0,
  )
  const openCategory = EXPERTISE_ENTRIES.find((entry) => entry.open)
  if (!parent || !openCategory) {
    throw new Error(
      'skills.md needs a category with both kinds of child, and an open one',
    )
  }
  const childKey = parent.childKeys[0] ?? ''
  const ancestors = ancestorKeys(parent.key)
  const parentAt = ancestors.length
  const childAt = parentAt + 1

  const skill = (overrides: Partial<Skill> = {}): Skill => ({
    ...blankSkill(),
    name: 'Java',
    lastUsed: 'Within last month',
    ...overrides,
  })

  const entries = (
    overrides: {
      programming?: Partial<ExpertiseGroup>
      nodeJs?: Partial<ExpertiseGroup>
    } = {},
  ): ExpertiseGroup[] => [
    // Ancestors are present and checked, or the refinement skips the subtree.
    ...ancestors.map((key) => ({ key, selected: true, skills: [] })),
    { key: parent.key, selected: true, skills: [skill()], ...overrides.programming },
    { key: childKey, selected: false, skills: [], ...overrides.nodeJs },
  ]

  /**
   * Issues raised against one entry. Asserting per entry rather than on overall
   * success keeps each test about its own subject: an unchecked link in the chain
   * legitimately raises its own error, which is not what these tests are examining.
   */
  const issuesAt = (value: ExpertiseGroup[], index: number) =>
    expertiseSchema
      .safeParse(value)
      .error?.issues.filter((issue) => issue.path[0] === index) ?? []

  test('accepts a category satisfied by its own leaf skill', () => {
    expect(issuesAt(entries(), parentAt)).toEqual([])
  })

  test('accepts a category satisfied only by a checked sub-category', () => {
    const value = entries({
      programming: { key: parent.key, selected: true, skills: [] },
      nodeJs: { key: childKey, selected: true, skills: [skill({ name: 'React' })] },
    })

    expect(issuesAt(value, parentAt)).toEqual([])
    expect(issuesAt(value, childAt)).toEqual([])
  })

  test('rejects a checked category with neither a skill nor a sub-category', () => {
    const value = entries({
      programming: { key: parent.key, selected: true, skills: [] },
    })

    expect(issuesAt(value, parentAt).map((issue) => issue.path)).toEqual([
      [parentAt, 'selected'],
    ])
  })

  test('reports an open category on its skills rather than its checkbox', () => {
    const value: ExpertiseGroup[] = [
      ...ancestorKeys(openCategory.key).map((key) => ({
        key,
        selected: true,
        skills: [],
      })),
      { key: openCategory.key, selected: true, skills: [] },
    ]
    const at = ancestorKeys(openCategory.key).length

    expect(issuesAt(value, at).map((issue) => issue.path)).toEqual([[at, 'skills']])
  })

  test('a sub-category under an unchecked parent is not validated', () => {
    const value = entries({
      programming: { key: parent.key, selected: false, skills: [] },
      nodeJs: {
        key: childKey,
        selected: true,
        skills: [skill({ name: '', lastUsed: '' })],
      },
    })

    expect(issuesAt(value, childAt)).toEqual([])
  })

  test('an unchecked category is valid however incomplete', () => {
    const value = entries({
      nodeJs: {
        key: childKey,
        selected: false,
        skills: [
          skill({
            name: '',
            lastUsed: '',
            certificationLinks: [{ id: 'l1', url: 'nope' }],
          }),
        ],
      },
    })

    expect(issuesAt(value, childAt)).toEqual([])
  })

  test('unchecked skills inside a checked category are not validated', () => {
    const value = entries({
      programming: {
        key: parent.key,
        selected: true,
        skills: [skill(), skill({ name: '', lastUsed: '', selected: false })],
      },
    })

    expect(issuesAt(value, parentAt)).toEqual([])
  })

  test('a checked skill requires a name and a recency', () => {
    const value = entries({
      programming: {
        key: parent.key,
        selected: true,
        skills: [skill({ name: '  ', lastUsed: '' })],
      },
    })

    expect(issuesAt(value, parentAt).map((issue) => issue.path)).toEqual([
      [parentAt, 'skills', 0, 'name'],
      [parentAt, 'skills', 0, 'lastUsed'],
    ])
  })

  test('rejects a blank or malformed certification link', () => {
    const withLink = (url: string) =>
      issuesAt(
        entries({
          programming: {
            key: parent.key,
            selected: true,
            skills: [skill({ certificationLinks: [{ id: 'l1', url }] })],
          },
        }),
        parentAt,
      ).length

    expect(withLink('')).toBeGreaterThan(0)
    expect(withLink('not a url')).toBeGreaterThan(0)
    expect(withLink('https://example.com/cert')).toBe(0)
  })

  test('caps the month total at sixty years', () => {
    const withMonths = (experienceMonths: number) =>
      issuesAt(
        entries({
          programming: {
            key: parent.key,
            selected: true,
            skills: [skill({ experienceMonths })],
          },
        }),
        parentAt,
      ).length

    expect(withMonths(720)).toBe(0)
    expect(withMonths(721)).toBeGreaterThan(0)
    expect(withMonths(-1)).toBeGreaterThan(0)
  })

  test('rejects a key that is not a catalog entry, including a leaf', () => {
    expect(
      expertiseSchema.safeParse([{ key: 'Cloud', selected: false, skills: [] }])
        .success,
    ).toBe(false)
    expect(
      expertiseSchema.safeParse([
        { key: `${parent.key} > ${parent.options[0]}`, selected: false, skills: [] },
      ]).success,
    ).toBe(false)
  })
})

describe('cvSchema', () => {
  test('an empty CV fails only on the required personal and profile fields', () => {
    const result = cvSchema.safeParse(defaultCv())
    expect(result.success).toBe(false)

    const sections = new Set(result.error?.issues.map((issue) => issue.path[0]))
    expect(sections).toEqual(new Set(['personal', 'profile']))
  })

  test('repeatable sections may be empty', () => {
    const cv = defaultCv()
    cv.personal = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      headline: 'Senior Engineer',
      location: '',
      email: 'ada@example.com',
      phone: '',
      website: '',
      linkedin: '',
      photo: '',
    }
    cv.profile.summary = richTextFromPlain('Builds things.')

    expect(cvSchema.safeParse(cv).success).toBe(true)
  })
})
