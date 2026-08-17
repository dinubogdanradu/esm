import {
  cvSchema,
  experienceSchema,
  expertiseGroupSchema,
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

describe('expertiseGroupSchema', () => {
  const group = (overrides: Partial<ExpertiseGroup> = {}): ExpertiseGroup => ({
    key: 'Programming > Java',
    selected: true,
    skills: [],
    ...overrides,
  })

  const skill = (overrides: Partial<Skill> = {}): Skill => ({
    ...blankSkill(),
    name: 'Spring',
    lastUsed: 'Within last month',
    ...overrides,
  })

  test('an unchecked group is valid however incomplete its skills are', () => {
    const result = expertiseGroupSchema.safeParse(
      group({
        selected: false,
        skills: [
          skill({ name: '', lastUsed: '', certificationLinks: [{ id: 'l1', url: 'nope' }] }),
        ],
      }),
    )

    expect(result.success).toBe(true)
  })

  test('a checked group needs at least one selected skill', () => {
    expect(expertiseGroupSchema.safeParse(group({ skills: [] })).success).toBe(false)

    const allUnchecked = expertiseGroupSchema.safeParse(
      group({ skills: [skill({ selected: false })] }),
    )
    expect(allUnchecked.success).toBe(false)
    expect(allUnchecked.error?.issues[0]?.path).toEqual(['skills'])
  })

  test('unchecked skills inside a checked group are not validated', () => {
    const result = expertiseGroupSchema.safeParse(
      group({
        skills: [
          skill(),
          skill({ name: '', lastUsed: '', selected: false }),
        ],
      }),
    )

    expect(result.success).toBe(true)
  })

  test('rejects a group key that is not a catalog container', () => {
    expect(expertiseGroupSchema.safeParse(group({ key: 'Programming' })).success).toBe(
      false,
    )
    expect(expertiseGroupSchema.safeParse(group({ key: 'Cloud' })).success).toBe(false)
  })

  test('a checked group requires a name and a recency per skill', () => {
    const result = expertiseGroupSchema.safeParse(
      group({ skills: [skill({ name: '  ', lastUsed: '' })] }),
    )

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ['skills', 0, 'name'],
      ['skills', 0, 'lastUsed'],
    ])
  })

  test('a fully filled checked group is valid', () => {
    const result = expertiseGroupSchema.safeParse(
      group({
        skills: [
          skill({
            experienceYears: 5,
            experienceMonths: 6,
            certificationLinks: [{ id: 'l1', url: 'https://example.com/cert' }],
          }),
        ],
      }),
    )

    expect(result.success).toBe(true)
  })

  test('rejects a blank or malformed certification link', () => {
    expect(
      expertiseGroupSchema.safeParse(
        group({ skills: [skill({ certificationLinks: [{ id: 'l1', url: '' }] })] }),
      ).success,
    ).toBe(false)

    expect(
      expertiseGroupSchema.safeParse(
        group({
          skills: [skill({ certificationLinks: [{ id: 'l1', url: 'not a url' }] })],
        }),
      ).success,
    ).toBe(false)
  })

  test('caps the month remainder at 11 so it cannot restate whole years', () => {
    expect(
      expertiseGroupSchema.safeParse(
        group({ skills: [skill({ experienceMonths: 11 })] }),
      ).success,
    ).toBe(true)

    expect(
      expertiseGroupSchema.safeParse(
        group({ skills: [skill({ experienceMonths: 12 })] }),
      ).success,
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
