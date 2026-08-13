import { defaultCv } from '@/schema/defaults'
import { DRAFT_KEY, clearDraft, loadDraft, normalizeDraft, saveDraft } from './draft'

describe('normalizeDraft', () => {
  test('returns defaults for junk input', () => {
    expect(normalizeDraft(null)).toEqual(defaultCv())
    expect(normalizeDraft('nonsense')).toEqual(defaultCv())
    expect(normalizeDraft([])).toEqual(defaultCv())
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
      expertise: [{ name: 'Cloud', skills: [{ name: 'AWS', level: 99 }] }],
      languages: [{ name: 'German', level: 'Wizard' }],
    })

    expect(result.expertise[0]?.skills[0]?.level).toBe(3)
    expect(result.languages[0]?.level).toBe('Professional')
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
