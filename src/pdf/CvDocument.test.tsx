// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Font, renderToBuffer } from '@react-pdf/renderer'
import { vi } from 'vitest'
import { defaultCv } from '@/schema/defaults'
import type { Cv } from '@/schema/cv'

// Vite turns asset imports into URL strings, which react-pdf cannot resolve under
// node. Both mocks swap in real filesystem paths so the renderer can read them;
// everything else about the document is exercised for real.
vi.mock('./fonts', () => ({
  registerFonts: () => {
    Font.register({
      family: 'Roboto',
      fonts: [
        { src: resolve('src/pdf/fonts/Roboto-Regular.ttf'), fontWeight: 400 },
        { src: resolve('src/pdf/fonts/Roboto-Bold.ttf'), fontWeight: 700 },
      ],
    })
    Font.registerHyphenationCallback((word) => [word])
  },
}))

vi.mock('./assets/infosys-logo.png', () => ({
  default: readFileSync(resolve('src/pdf/assets/infosys-logo.png')),
}))

const { default: CvDocument } = await import('./CvDocument')

const PDF_MAGIC = '%PDF'

const countPages = (pdf: Buffer): number =>
  pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length ?? 0

const populated = (): Cv => {
  const cv = defaultCv()
  cv.personal = {
    firstName: 'Bogdan',
    lastName: 'Dinu',
    headline: 'Fullstack Developer',
    location: 'Bucharest, Romania',
    email: 'bogdan@example.com',
    phone: '+40 700 000 000',
    website: 'https://example.com',
    linkedin: '',
    photo: '',
  }
  cv.profile.summary = 'Over 18 years of experience.\nGood infrastructure knowledge.'
  cv.qualifications = [
    {
      id: 'q1',
      institution: 'Politehnica Bucharest',
      degree: "Bachelor's Degree",
      field: 'Electrical Engineering',
      location: 'Bucharest',
      startDate: '2003-10',
      endDate: '2007-06',
      grade: '',
    },
  ]
  cv.expertise = [
    {
      id: 'g1',
      name: 'Languages',
      showLevel: false,
      skills: [
        { id: 's1', name: 'PHP', level: 5 },
        { id: 's2', name: 'JavaScript', level: 4 },
      ],
    },
  ]
  cv.experience = [
    {
      id: 'e1',
      company: 'United Nations Office at Geneva',
      position: 'Senior Drupal Developer',
      location: 'Geneva',
      startDate: '2019-04',
      endDate: '',
      current: true,
      bullets: [
        { id: 'b1', text: 'Website maintenance and development' },
        { id: 'b2', text: 'Design system implementation' },
      ],
      tech: ['Drupal', 'PHP'],
    },
  ]
  return cv
}

describe('CvDocument', () => {
  test('renders an empty CV to a valid single-page PDF', async () => {
    const buffer = await renderToBuffer(<CvDocument cv={defaultCv()} />)

    expect(buffer.subarray(0, 4).toString('latin1')).toBe(PDF_MAGIC)
    expect(countPages(buffer)).toBe(1)
  })

  test('renders a populated CV', async () => {
    const buffer = await renderToBuffer(<CvDocument cv={populated()} />)

    expect(buffer.subarray(0, 4).toString('latin1')).toBe(PDF_MAGIC)
    expect(buffer.byteLength).toBeGreaterThan(1000)
  })

  test('adds the second page only when its sections have content', async () => {
    const withPageTwo = populated()
    withPageTwo.softSkills = [{ id: 'ss1', name: 'Mentoring' }]

    expect(countPages(await renderToBuffer(<CvDocument cv={populated()} />))).toBe(1)
    expect(
      countPages(await renderToBuffer(<CvDocument cv={withPageTwo} />)),
    ).toBe(2)
  })

  test('overflowing content paginates instead of being clipped', async () => {
    const cv = populated()
    const firstRole = cv.experience[0]
    if (!firstRole) throw new Error('fixture is missing a role')

    firstRole.bullets = Array.from({ length: 120 }, (_, index) => ({
      id: `b${index}`,
      text: `Achievement number ${index} with enough text to occupy a full line of the column.`,
    }))

    expect(countPages(await renderToBuffer(<CvDocument cv={cv} />))).toBeGreaterThan(1)
  })

  test('embeds selectable text rather than an image', async () => {
    const buffer = await renderToBuffer(<CvDocument cv={populated()} />)

    // A font subset is only present when real glyphs were laid out.
    expect(buffer.toString('latin1')).toContain('/FontFile2')
  })
})
