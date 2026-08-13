import { cvSchema, experienceSchema, personalSchema } from './cv'
import { blankExperience, defaultCv } from './defaults'

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
