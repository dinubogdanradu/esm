// @vitest-environment node
/// <reference types="node" />
import { richTextFromPlain } from '@/schema/richText'
import { defaultCv } from '@/schema/defaults'
import { blankSkill } from '@/schema/defaults'
import type { Cv } from '@/schema/cv'
import { openEntry, ratedEntry, selectEntry, selectSkill } from '@/test/expertise'
import { buildPptx, pptxFileName } from './downloadPptx'

/** A .pptx is a zip archive, so a valid one starts with the zip magic bytes. */
const ZIP_MAGIC = 'PK'


// Catalog-derived, so these fixtures survive edits to skills.md.
const rated = ratedEntry()
const openCategory = openEntry()
const ratedSkill = (index: number): string => {
  const name = rated.options[index % rated.options.length]
  if (!name) throw new Error('rated category has no options')
  return name
}

const render = async (cv: Cv): Promise<Buffer> => {
  const pptx = await buildPptx(cv)
  const output = await pptx.write({ outputType: 'nodebuffer' })
  return output as Buffer
}

/**
 * Counts slides from the archive's entry names, which zip stores uncompressed.
 * pptxgenjs exposes a `slides` array at runtime but not in its typings.
 */
const slideCount = (buffer: Buffer): number =>
  new Set(buffer.toString('latin1').match(/ppt\/slides\/slide\d+\.xml/g) ?? []).size

const populated = (): Cv => {
  const cv = defaultCv()
  cv.personal = {
    firstName: 'Avery',
    lastName: 'Quinn',
    headline: 'Fullstack Developer',
    location: 'Lisbon, Portugal',
    email: 'avery@example.com',
    phone: '',
    website: '',
    linkedin: '',
    // Left empty on purpose: the photo path needs canvas and fetch.
    photo: '',
  }
  cv.profile.summary = richTextFromPlain('Over 18 years of experience.\nGood infrastructure knowledge.')

  // Leaf skills come from the catalog; open categories are named by the user.
  selectSkill(cv, rated.key, ratedSkill(0), {
    level: 5,
    experienceMonths: 147,
    lastUsed: 'Within last month',
    certificationLinks: [
      { id: 'l1', url: 'https://example.com/platform-cert-a' },
      { id: 'l2', url: 'https://example.com/platform-cert-b' },
    ],
  })
  selectSkill(cv, rated.key, ratedSkill(1), {
    level: 4,
    lastUsed: 'Within last month',
  })
  selectEntry(cv, openCategory.key, [
    {
      ...blankSkill(),
      name: 'Kubernetes',
      level: 3,
      lastUsed: 'Within last year',
    },
  ])

  return cv
}

describe('buildPptx', () => {
  test('renders an empty CV to a valid presentation', async () => {
    const buffer = await render(defaultCv())

    expect(buffer.subarray(0, 2).toString('latin1')).toBe(ZIP_MAGIC)
  })

  test('renders the new expertise hierarchy without throwing', async () => {
    const buffer = await render(populated())

    expect(buffer.subarray(0, 2).toString('latin1')).toBe(ZIP_MAGIC)
    expect(buffer.byteLength).toBeGreaterThan(1000)
  })

  test('adds a second slide only when its sections have content', async () => {
    const withPageTwo = populated()
    withPageTwo.softSkills = [{ id: 's1', name: 'Mentoring' }]

    expect(slideCount(await render(populated()))).toBe(1)
    expect(slideCount(await render(withPageTwo))).toBe(2)
  })

  test('names the file from the CV owner', () => {
    expect(pptxFileName(populated())).toBe('avery-quinn-short-cv.pptx')
    expect(pptxFileName(defaultCv())).toBe('short-cv.pptx')
  })
})
