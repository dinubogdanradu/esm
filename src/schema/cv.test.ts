import {
  cvSchema,
  experienceSchema,
  expertiseSchema,
  personalSchema,
  type ExpertiseGroup,
  type Skill,
} from './cv'
import { blankExperience, blankSkill, defaultCv } from './defaults'

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
    bullets: [{ id: 'b1', text: 'Shipped the thing' }],
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

  test('requires at least one bullet', () => {
    const result = experienceSchema.safeParse({
      ...base(),
      current: true,
      bullets: [],
    })

    expect(result.success).toBe(false)
  })

  test('rejects an empty bullet', () => {
    const result = experienceSchema.safeParse({
      ...base(),
      current: true,
      bullets: [{ id: 'b1', text: '' }],
    })

    expect(result.success).toBe(false)
  })
})

describe('expertiseSchema', () => {
  const skill = (overrides: Partial<Skill> = {}): Skill => ({
    ...blankSkill(),
    name: 'Spring',
    lastUsed: 'Within last month',
    ...overrides,
  })

  /** Programming plus its Java child, the smallest slice with a real parent. */
  const entries = (
    javaOverrides: Partial<ExpertiseGroup> = {},
    programmingSelected = true,
  ): ExpertiseGroup[] => [
    { key: 'Programming', selected: programmingSelected, skills: [] },
    {
      key: 'Programming > Java',
      selected: true,
      skills: [skill()],
      ...javaOverrides,
    },
  ]

  test('accepts a fully filled group and technology', () => {
    expect(expertiseSchema.safeParse(entries()).success).toBe(true)
  })

  test('a checked group with no checked child is rejected', () => {
    const result = expertiseSchema.safeParse([
      { key: 'Programming', selected: true, skills: [] },
      { key: 'Programming > Java', selected: false, skills: [] },
    ])

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual([0, 'selected'])
  })

  test('a technology under an unchecked group is not validated', () => {
    const result = expertiseSchema.safeParse(
      entries({ skills: [skill({ name: '', lastUsed: '' })] }, false),
    )

    expect(result.success).toBe(true)
  })

  test('an unchecked technology is valid however incomplete', () => {
    const result = expertiseSchema.safeParse([
      { key: 'Programming', selected: true, skills: [] },
      { key: 'Programming > Python', selected: true, skills: [skill()] },
      {
        key: 'Programming > Java',
        selected: false,
        skills: [
          skill({
            name: '',
            lastUsed: '',
            certificationLinks: [{ id: 'l1', url: 'nope' }],
          }),
        ],
      },
    ])

    expect(result.success).toBe(true)
  })

  test('a checked technology needs at least one selected skill', () => {
    expect(expertiseSchema.safeParse(entries({ skills: [] })).success).toBe(false)

    const allUnchecked = expertiseSchema.safeParse(
      entries({ skills: [skill({ selected: false })] }),
    )
    expect(allUnchecked.success).toBe(false)
    expect(allUnchecked.error?.issues[0]?.path).toEqual([1, 'skills'])
  })

  test('unchecked skills inside a checked technology are not validated', () => {
    const result = expertiseSchema.safeParse(
      entries({
        skills: [skill(), skill({ name: '', lastUsed: '', selected: false })],
      }),
    )

    expect(result.success).toBe(true)
  })

  test('a checked skill requires a name and a recency', () => {
    const result = expertiseSchema.safeParse(
      entries({ skills: [skill({ name: '  ', lastUsed: '' })] }),
    )

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      [1, 'skills', 0, 'name'],
      [1, 'skills', 0, 'lastUsed'],
    ])
  })

  test('rejects a blank or malformed certification link', () => {
    expect(
      expertiseSchema.safeParse(
        entries({ skills: [skill({ certificationLinks: [{ id: 'l1', url: '' }] })] }),
      ).success,
    ).toBe(false)

    expect(
      expertiseSchema.safeParse(
        entries({
          skills: [skill({ certificationLinks: [{ id: 'l1', url: 'not a url' }] })],
        }),
      ).success,
    ).toBe(false)
  })

  test('caps the month remainder at 11 so it cannot restate whole years', () => {
    expect(
      expertiseSchema.safeParse(entries({ skills: [skill({ experienceMonths: 11 })] }))
        .success,
    ).toBe(true)

    expect(
      expertiseSchema.safeParse(entries({ skills: [skill({ experienceMonths: 12 })] }))
        .success,
    ).toBe(false)
  })

  test('rejects a key that is not a catalog entry', () => {
    expect(
      expertiseSchema.safeParse([{ key: 'Cloud', selected: false, skills: [] }])
        .success,
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
    cv.profile.summary = 'Builds things.'

    expect(cvSchema.safeParse(cv).success).toBe(true)
  })
})
