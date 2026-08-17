// @vitest-environment node
/// <reference types="node" />
import { defaultCv } from '@/schema/defaults'
import { blankSkill } from '@/schema/defaults'
import type { Cv } from '@/schema/cv'
import { selectEntry } from '@/test/expertise'
import { buildPptx, pptxFileName } from './downloadPptx'

/** A .pptx is a zip archive, so a valid one starts with the zip magic bytes. */
const ZIP_MAGIC = 'PK'

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
    firstName: 'Bogdan',
    lastName: 'Dinu',
    headline: 'Fullstack Developer',
    location: 'Bucharest, Romania',
    email: 'bogdan@example.com',
    phone: '',
    website: '',
    linkedin: '',
    // Left empty on purpose: the photo path needs canvas and fetch.
    photo: '',
  }
  cv.profile.summary = 'Over 18 years of experience.\nGood infrastructure knowledge.'

  selectEntry(cv, 'Programming')
  selectEntry(cv, 'Programming > PHP', [
    {
      ...blankSkill(),
      name: 'Drupal',
      level: 5,
      experienceYears: 12,
      experienceMonths: 3,
      lastUsed: 'Within last month',
      certificationLinks: [
        { id: 'l1', url: 'https://example.com/drupal-11' },
        { id: 'l2', url: 'https://example.com/drupal-9' },
      ],
    },
    { ...blankSkill(), name: 'Laravel', level: 4, lastUsed: 'Within last year' },
  ])
  selectEntry(cv, 'Programming > Node.js', [
    { ...blankSkill(), name: 'React', level: 4, lastUsed: 'Within last month' },
    { ...blankSkill(), name: 'Angular', selected: false },
  ])
  selectEntry(cv, 'Infrastructure', [
    { ...blankSkill(), name: 'Kubernetes', level: 3, lastUsed: 'Within last year' },
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
    expect(pptxFileName(populated())).toBe('bogdan-dinu-short-cv.pptx')
    expect(pptxFileName(defaultCv())).toBe('short-cv.pptx')
  })
})
