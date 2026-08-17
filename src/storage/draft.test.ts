import { defaultCv } from '@/schema/defaults'
import { SKILL_CONTAINERS } from '@/schema/skillCatalog'
import { DRAFT_KEY, clearDraft, loadDraft, normalizeDraft, saveDraft } from './draft'

// Seeded catalog options carry generated ids, so structural comparisons against a
// fresh defaultCv() have to ignore them.
const withoutIds = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value, (key, inner) => (key === 'id' ? undefined : inner)),
  )

describe('normalizeDraft', () => {
  test('returns defaults for junk input', () => {
    const expected = withoutIds(defaultCv())

    expect(withoutIds(normalizeDraft(null))).toEqual(expected)
    expect(withoutIds(normalizeDraft('nonsense'))).toEqual(expected)
    expect(withoutIds(normalizeDraft([]))).toEqual(expected)
  })

  test('fills missing keys and drops unknown ones', () => {
    const result = normalizeDraft({
      personal: { firstName: 'Ada', unexpected: 'dropped' },
      retired: 'section',
    })

    expect(result.personal.firstName).toBe('Ada')
    expect(result.personal.lastName).toBe('')
    expect(result.profile.summary).toBe('')
    expect(result.experience).toEqual([])
    expect(result.personal).not.toHaveProperty('unexpected')
    expect(result).not.toHaveProperty('retired')
  })

  test('replaces values of the wrong type rather than passing them through', () => {
    const result = normalizeDraft({
      personal: { firstName: 42, email: null },
      experience: 'not an array',
    })

    expect(result.personal.firstName).toBe('')
    expect(result.personal.email).toBe('')
    expect(result.experience).toEqual([])
  })

  test('generates ids for items that lack them', () => {
    const result = normalizeDraft({
      experience: [{ company: 'Dice', bullets: [{ text: 'Shipped' }] }],
    })

    const entry = result.experience[0]
    expect(entry?.id).toMatch(/\S/)
    expect(entry?.bullets[0]?.id).toMatch(/\S/)
    expect(entry?.current).toBe(false)
    expect(entry?.tech).toEqual([])
  })

  test('falls back to a valid level when a stored level is out of range', () => {
    const result = normalizeDraft({
      expertise: [
        {
          key: 'Programming > Java',
          selected: true,
          skills: [{ name: 'Spring', level: 99 }],
        },
      ],
      languages: [{ name: 'German', level: 'Wizard' }],
    })

    expect(
      result.expertise.find((group) => group.key === 'Programming > Java')?.skills[0]
        ?.level,
    ).toBe(3)
    expect(result.languages[0]?.level).toBe('Professional')
  })

  const groupByKey = (cv: ReturnType<typeof normalizeDraft>, key: string) =>
    cv.expertise.find((group) => group.key === key)

  test('rebuilds every catalog container regardless of what was stored', () => {
    const result = normalizeDraft({
      expertise: [
        { key: 'Programming > Python', selected: true, skills: [{ name: 'Django' }] },
      ],
    })

    expect(result.expertise.map((group) => group.key)).toEqual(
      SKILL_CONTAINERS.map((container) => container.key),
    )
    expect(groupByKey(result, 'Programming > Python')).toMatchObject({
      selected: true,
      skills: [{ name: 'Django', selected: true }],
    })
    expect(groupByKey(result, 'Testing')).toMatchObject({
      selected: false,
      skills: [],
    })
  })

  test('drops stored containers that are no longer in the catalog', () => {
    const result = normalizeDraft({
      expertise: [{ key: 'Cloud > AWS', selected: true, skills: [{ name: 'S3' }] }],
    })

    expect(result.expertise).toHaveLength(SKILL_CONTAINERS.length)
    expect(
      result.expertise.every((group) =>
        group.skills.every((skill) => skill.name === '' || !skill.selected),
      ),
    ).toBe(true)
  })

  test('seeds predefined containers from the catalog, unchecked', () => {
    const nodeGroup = groupByKey(normalizeDraft({}), 'Programming > Node.js')

    expect(nodeGroup?.skills.map((skill) => skill.name)).toEqual([
      'React',
      'Angular',
      'Vue',
    ])
    expect(nodeGroup?.skills.every((skill) => !skill.selected)).toBe(true)
  })

  test('matches stored predefined skills onto catalog options by name', () => {
    const result = normalizeDraft({
      expertise: [
        {
          key: 'Programming > Node.js',
          selected: true,
          skills: [
            { name: 'Vue', selected: true, level: 5, experienceYears: 3 },
            { name: 'Backbone', selected: true, level: 4 },
          ],
        },
      ],
    })

    const skills = groupByKey(result, 'Programming > Node.js')?.skills
    expect(skills?.map((skill) => skill.name)).toEqual(['React', 'Angular', 'Vue'])
    expect(skills?.find((skill) => skill.name === 'Vue')).toMatchObject({
      selected: true,
      level: 5,
      experienceYears: 3,
    })
    // An option no longer in the catalog is dropped rather than carried along.
    expect(skills?.some((skill) => skill.name === 'Backbone')).toBe(false)
  })

  test('treats a stored open-container skill as selected when the flag is absent', () => {
    const result = normalizeDraft({
      expertise: [{ key: 'Security', selected: true, skills: [{ name: 'Threat modelling' }] }],
    })

    expect(groupByKey(result, 'Security')?.skills[0]?.selected).toBe(true)
  })

  test('defaults the per-skill fields', () => {
    const result = normalizeDraft({
      expertise: [{ key: 'AI', selected: true, skills: [{ name: 'PyTorch' }] }],
    })

    expect(groupByKey(result, 'AI')?.skills[0]).toEqual({
      id: expect.any(String),
      name: 'PyTorch',
      selected: true,
      level: 3,
      experienceYears: 0,
      experienceMonths: 0,
      lastUsed: '',
      certificationLinks: [],
    })
  })

  test('rejects an out-of-range month remainder and an unknown recency', () => {
    const result = normalizeDraft({
      expertise: [
        {
          key: 'Programming > Java',
          selected: true,
          skills: [
            {
              name: 'Spring',
              experienceYears: -3,
              experienceMonths: 47,
              lastUsed: 'yesterday',
            },
          ],
        },
      ],
    })

    const skill = groupByKey(result, 'Programming > Java')?.skills[0]
    expect(skill?.experienceYears).toBe(0)
    expect(skill?.experienceMonths).toBe(0)
    expect(skill?.lastUsed).toBe('')
  })

  test('keeps only string entries in tag arrays', () => {
    const result = normalizeDraft({
      projects: [{ name: 'Thing', tech: ['react', 7, null, 'go'] }],
    })

    expect(result.projects[0]?.tech).toEqual(['react', 'go'])
  })
})

describe('draft storage', () => {
  beforeEach(() => {
    clearDraft()
  })

  test('round-trips a saved draft', () => {
    const cv = defaultCv()
    cv.personal.firstName = 'Ada'
    cv.profile.summary = 'Builds things.'

    saveDraft(cv)

    expect(loadDraft()).toEqual(cv)
  })

  test('returns null when nothing is stored', () => {
    expect(loadDraft()).toBeNull()
  })

  test('returns null for unparseable stored data', () => {
    window.localStorage.setItem(DRAFT_KEY, '{ not json')

    expect(loadDraft()).toBeNull()
  })
})
