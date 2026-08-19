import {
  emptyRichText,
  richTextFromPlain,
  richTextToPlain,
} from '@/schema/richText'
import { defaultCv } from '@/schema/defaults'
import { EXPERTISE_ENTRIES } from '@/schema/skillCatalog'
import { DRAFT_KEY, clearDraft, loadDraft, normalizeDraft, saveDraft } from './draft'

// Seeded catalog options carry generated ids, so structural comparisons against a
// fresh defaultCv() have to ignore them.
/**
 * Keys are taken from the catalog rather than written out, so editing skills.md does
 * not break these tests — only a catalog with no rated or no open category would.
 */
const rated = EXPERTISE_ENTRIES.find((entry) => entry.options.length > 0)
const openCategory = EXPERTISE_ENTRIES.find((entry) => entry.open)
if (!rated || !openCategory) throw new Error('skills.md needs one rated and one open category')

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
    expect(result.profile.summary).toEqual(emptyRichText())
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
      experience: [{ company: 'Dice', achievements: 'Shipped' }],
    })

    const entry = result.experience[0]
    expect(entry?.id).toMatch(/\S/)
    expect(richTextToPlain(entry?.achievements ?? emptyRichText())).toBe('Shipped')
    expect(entry?.current).toBe(false)
    expect(entry?.tech).toEqual([])
  })

  test('folds pre-textarea bullet arrays into the achievements text', () => {
    const result = normalizeDraft({
      experience: [
        {
          company: 'Dice',
          bullets: [
            { id: 'b1', text: 'Shipped the thing' },
            { id: 'b2', text: '  ' },
            { id: 'b3', text: 'Led the migration' },
          ],
        },
      ],
    })

    // Stored drafts predate the textarea; their bullets become one line each rather
    // than being dropped.
    expect(
      richTextToPlain(result.experience[0]?.achievements ?? emptyRichText()),
    ).toBe('Shipped the thing\nLed the migration')
  })

  test('prefers stored achievements over any leftover bullets', () => {
    const result = normalizeDraft({
      experience: [
        {
          company: 'Dice',
          achievements: 'Current text',
          bullets: [{ id: 'b1', text: 'Stale bullet' }],
        },
      ],
    })

    expect(
      richTextToPlain(result.experience[0]?.achievements ?? emptyRichText()),
    ).toBe('Current text')
  })

  test('falls back to a valid level when a stored level is out of range', () => {
    const result = normalizeDraft({
      expertise: [
        {
          key: rated.key,
          selected: true,
          skills: [{ name: rated.options[0], level: 99 }],
        },
      ],
      languages: [{ name: 'German', level: 'Wizard' }],
    })

    expect(
      result.expertise.find((group) => group.key === rated.key)?.skills[0]?.level,
    ).toBe(3)
    expect(result.languages[0]?.level).toBe('Professional')
  })

  const groupByKey = (cv: ReturnType<typeof normalizeDraft>, key: string) =>
    cv.expertise.find((group) => group.key === key)

  test('rebuilds every catalog container regardless of what was stored', () => {
    const result = normalizeDraft({
      expertise: [
        { key: openCategory.key, selected: true, skills: [{ name: 'Playwright' }] },
      ],
    })

    expect(result.expertise.map((group) => group.key)).toEqual(
      EXPERTISE_ENTRIES.map((entry) => entry.key),
    )
    expect(groupByKey(result, openCategory.key)).toMatchObject({
      selected: true,
      skills: [{ name: 'Playwright', selected: true }],
    })
  })

  test('drops stored containers that are no longer in the catalog', () => {
    const result = normalizeDraft({
      expertise: [{ key: 'Cloud > AWS', selected: true, skills: [{ name: 'S3' }] }],
    })

    expect(result.expertise).toHaveLength(EXPERTISE_ENTRIES.length)
    expect(
      result.expertise.every((group) =>
        group.skills.every((skill) => skill.name === '' || !skill.selected),
      ),
    ).toBe(true)
  })

  test('a category with leaf children is seeded from the catalog, not from storage', () => {
    const result = normalizeDraft({
      expertise: [
        { key: rated.key, selected: true, skills: [{ name: 'Not in the catalog' }] },
      ],
    })

    // A stored skill that is not a leaf of this category is dropped.
    expect(groupByKey(result, rated.key)?.skills.map((skill) => skill.name)).toEqual(
      rated.options,
    )
  })

  test('a category that only nests sub-categories holds no skills', () => {
    // Every child of Mobile development is a leaf except "Other", so it is seeded
    // with those leaves; an entry with neither is left empty.
    const result = normalizeDraft({
      expertise: [{ key: openCategory.key, selected: true, skills: [{ name: 'Elixir' }] }],
    })

    expect(groupByKey(result, openCategory.key)?.skills).toMatchObject([
      { name: 'Elixir', selected: true },
    ])
  })

  test('seeds predefined containers from the catalog, unchecked', () => {
    const group = groupByKey(normalizeDraft({}), rated.key)

    expect(group?.skills.map((skill) => skill.name)).toEqual(rated.options)
    expect(group?.skills.every((skill) => !skill.selected)).toBe(true)
  })

  test('matches stored predefined skills onto catalog options by name', () => {
    const known = rated.options[0]
    const result = normalizeDraft({
      expertise: [
        {
          key: rated.key,
          selected: true,
          skills: [
            { name: known, selected: true, level: 5, experienceMonths: 36 },
            { name: 'Gone from the catalog', selected: true, level: 4 },
          ],
        },
      ],
    })

    const skills = groupByKey(result, rated.key)?.skills
    expect(skills?.map((skill) => skill.name)).toEqual(rated.options)
    expect(skills?.find((skill) => skill.name === known)).toMatchObject({
      selected: true,
      level: 5,
      experienceMonths: 36,
    })
    // An option no longer in the catalog is dropped rather than carried along.
    expect(skills?.some((skill) => skill.name === 'Gone from the catalog')).toBe(false)
  })

  test('treats a stored open-container skill as selected when the flag is absent', () => {
    const result = normalizeDraft({
      expertise: [
        { key: openCategory.key, selected: true, skills: [{ name: 'Threat modelling' }] },
      ],
    })

    expect(groupByKey(result, openCategory.key)?.skills[0]?.selected).toBe(true)
  })

  test('defaults the per-skill fields', () => {
    const result = normalizeDraft({
      expertise: [{ key: openCategory.key, selected: true, skills: [{ name: 'PyTorch' }] }],
    })

    expect(groupByKey(result, openCategory.key)?.skills[0]).toEqual({
      id: expect.any(String),
      name: 'PyTorch',
      selected: true,
      level: 3,
      experienceMonths: 0,
      lastUsed: '',
      certificationLinks: [],
    })
  })

  test('folds a stored years value into the single month total', () => {
    const result = normalizeDraft({
      expertise: [
        {
          key: rated.key,
          selected: true,
          skills: [
            { name: rated.options[0], experienceYears: 5, experienceMonths: 6 },
          ],
        },
      ],
    })

    // Experience used to be a years/months pair; 5y 6m is 66 months.
    expect(groupByKey(result, rated.key)?.skills[0]?.experienceMonths).toBe(66)
  })

  test('rejects an out-of-range total and an unknown recency', () => {
    const result = normalizeDraft({
      expertise: [
        {
          key: rated.key,
          selected: true,
          skills: [
            {
              name: rated.options[0],
              experienceMonths: -3,
              lastUsed: 'yesterday',
            },
          ],
        },
      ],
    })

    const skill = groupByKey(result, rated.key)?.skills[0]
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
    cv.profile.summary = richTextFromPlain('Builds things.')

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
