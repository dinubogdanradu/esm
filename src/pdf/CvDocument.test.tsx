// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToBuffer } from '@react-pdf/renderer'
import { vi } from 'vitest'
import { richTextFromPlain } from '@/schema/richText'
import { defaultCv } from '@/schema/defaults'
import type { Cv } from '@/schema/cv'
import { blankSkill } from '@/schema/defaults'
import { openEntry, ratedEntry, selectEntry, selectSkill } from '@/test/expertise'
import { EXPERTISE_ENTRIES } from '@/schema/skillCatalog'
import { PAGE_SIZE, colors } from './theme'

const [, PAGE_HEIGHT] = PAGE_SIZE

// Vite turns asset imports into URL strings, which react-pdf cannot resolve under
// node. Only those imports are swapped for filesystem paths — the real
// registerFonts still runs, so a variant added there is covered without touching
// this file. Everything else about the document is exercised for real.
const fontPath = (file: string) => ({
  default: resolve('src/pdf/fonts', file),
})

vi.mock('./fonts/Roboto-Regular.ttf', () => fontPath('Roboto-Regular.ttf'))
vi.mock('./fonts/Roboto-Bold.ttf', () => fontPath('Roboto-Bold.ttf'))
vi.mock('./fonts/Roboto-Italic.ttf', () => fontPath('Roboto-Italic.ttf'))
vi.mock('./fonts/Roboto-BoldItalic.ttf', () => fontPath('Roboto-BoldItalic.ttf'))

vi.mock('./assets/infosys-logo.png', () => ({
  default: readFileSync(resolve('src/pdf/assets/infosys-logo.png')),
}))

const { default: CvDocument, chevronPoints, chevronOffsets } = await import(
  './CvDocument',
)

// Catalog-derived, so these fixtures survive edits to skills.md.
const rated = ratedEntry()
const openCategory = openEntry()
// A second of each, so the fixture produces four expertise lines rather than
// overwriting one entry twice.
const secondRated = EXPERTISE_ENTRIES.filter((entry) => entry.options.length > 0)[1]
const secondOpen = EXPERTISE_ENTRIES.filter((entry) => entry.open)[1]
const ratedSkill = (index: number): string => {
  const name = rated.options[index % rated.options.length]
  if (!name) throw new Error('rated category has no options')
  return name
}

const PDF_MAGIC = '%PDF'

const countPages = (pdf: Buffer): number =>
  pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length ?? 0

const populated = (): Cv => {
  const cv = defaultCv()
  cv.personal = {
    firstName: 'Avery',
    lastName: 'Quinn',
    headline: 'Fullstack Developer',
    location: 'Lisbon, Portugal',
    email: 'avery@example.com',
    phone: '+40 700 000 000',
    website: 'https://example.com',
    linkedin: '',
    photo: '',
  }
  cv.profile.summary = richTextFromPlain('Over 18 years of experience.\nGood infrastructure knowledge.')
  cv.qualifications = [
    {
      id: 'q1',
      institution: 'Riverside Institute',
      degree: "Bachelor's Degree",
      field: 'Electrical Engineering',
      location: 'Lisbon',
      startDate: '2003-10',
      endDate: '2007-06',
      grade: '',
    },
  ]
  // Programming holds the languages as leaf skills; Node.js nests under it.
  selectSkill(cv, rated.key, ratedSkill(0), {
    level: 5,
    experienceMonths: 147,
    lastUsed: 'Within last month',
    certificationLinks: [{ id: 'l1', url: 'https://example.com/platform-cert' }],
  })
  selectSkill(cv, rated.key, ratedSkill(0), {
    level: 4,
    experienceMonths: 48,
    lastUsed: 'Within last year',
  })
  selectSkill(cv, rated.key, ratedSkill(1), {
    level: 4,
    lastUsed: 'Within last month',
  })
  cv.experience = [
    {
      id: 'e1',
      company: 'Northwind Analytics',
      position: 'Senior Platform Developer',
      location: 'Lisbon',
      startDate: '2019-04',
      endDate: '',
      current: true,
      achievements: richTextFromPlain('Website maintenance and development\nDesign system implementation'),
      tech: ['Drupal', 'PHP'],
    },
  ]
  return cv
}

/**
 * A CV with every section filled at realistic length. The left column is what pushes
 * the page budget, so this is the fixture that catches the expertise section being
 * bumped onto a page of its own.
 */
const realistic = (): Cv => {
  const cv = defaultCv()
  cv.personal = {
    firstName: 'Avery', lastName: 'Quinn', headline: 'Fullstack Developer',
    location: 'Lisbon, Portugal', email: 'avery.quinn@example.com',
    phone: '', website: '', linkedin: '', photo: '',
  }
  cv.profile.summary = richTextFromPlain([
    'Over 18 years of experience with various technologies across the web spectrum (PHP, Javascript, Python, Java, CSS, bash, websockets etc)',
    'Good hardware and infrastructure knowledge (DevOps, CI/CD)',
    'Worked on more than 100 projects in Drupal, Wordpress, Django, Laravel, Zend, CodeIgniter, Magento, PrestaShop, VueJS, nodeJS, bash etc',
    'Worked for clients across retail, banking, telecoms and public sector, from small brand sites to multi-region platforms',
  ].join('\n'))
  cv.qualifications = [
    { id: 'q1', institution: 'Riverside Institute', degree: "Bachelor's Degree", field: 'Electrical Engineering and Computer Science', location: '', startDate: '', endDate: '', grade: '' },
    { id: 'q2', institution: 'School of Social Sciences, Porto', degree: 'Masters in Anthropology (not graduated)', field: '', location: '', startDate: '', endDate: '', grade: '' },
  ]
  // Four expertise lines, from four distinct catalog entries: that is the amount that
  // used to tip page one into an empty overflow page.
  for (const name of rated.options.slice(0, 4)) {
    selectSkill(cv, rated.key, name, { lastUsed: 'Within last month' })
  }
  if (secondRated) {
    selectSkill(cv, secondRated.key, secondRated.options[0] ?? '', {
      lastUsed: 'Within last month',
    })
  }
  selectEntry(cv, openCategory.key, [
    {
      ...blankSkill(),
      name: 'DevOps, CI/CD, Docker, Kubernetes, Terraform',
      lastUsed: 'Within last month',
    },
  ])
  if (secondOpen) {
    selectEntry(cv, secondOpen.key, [
      {
        ...blankSkill(),
        name: 'MySQL, PostgreSQL, Oracle',
        lastUsed: 'Within last month',
      },
    ])
  }
  cv.experience = [
    { id: 'e1', company: 'Northwind Analytics (Platform)', position: 'Senior Platform Developer', location: '', startDate: '2019-04', endDate: '', current: true, tech: [],
      achievements: richTextFromPlain(['website maintenance and development','design system implementation','architecture design for new projects','audit and improve website accessibility','provide business analysis support for new features and projects (write documentation, use cases, create wireframes)','oversee deployments (CI/CD)'].join('\n')) },
    { id: 'e2', company: 'Harbourline Studio, Lisbon, Portugal', position: 'Senior Fullstack Web Developer', location: '', startDate: '2012-01', endDate: '2019-03', current: false, tech: [],
      achievements: richTextFromPlain(['develop websites and web applications for clients across two continents',"provide support for clients' existing web applications","provide hosting management and support for the company's servers and client servers",'write proposed architecture documentation for projects','write step by step instructions of management interfaces of built applications','develop internal application for credentials management','develop internal development architecture based on docker','develop internal web performance assessment application','oversee project deployments (CI/CD)'].join('\n')) },
  ]
  cv.certifications = [
    { id: 'c1', name: 'Certified Platform Engineer', issuer: '', date: '', expiryDate: '', credentialUrl: '' },
    { id: 'c2', name: 'Certified Systems Architect', issuer: '', date: '', expiryDate: '', credentialUrl: '' },
  ]
  cv.languages = [
    { id: 'l1', name: 'English', level: 'Fluent' },
    { id: 'l2', name: 'French', level: 'Professional' },
  ]
  cv.softSkills = ['Communication','active listening','teamwork','integrity','adaptability'].map((name, i) => ({ id: `s${i}`, name }))
  cv.projects = [
    { id: 'p1', name: 'Northwind Design System', role: '', description: richTextFromPlain('Starting from the new theme for the northwind.example website I created a starterkit theme that was later used on all ITBAU Drupal projects.', 'paragraph'), tech: [], url: '', startDate: '', endDate: '' },
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

    firstRole.achievements = richTextFromPlain(Array.from(
      { length: 120 },
      (_, index) =>
        `Achievement number ${index} with enough text to occupy a full line of the column.`,
    ).join('\n'))

    expect(countPages(await renderToBuffer(<CvDocument cv={cv} />))).toBeGreaterThan(1)
  })

  test('resolves every font variant the stylesheet uses', async () => {
    // react-pdf throws rather than substituting, so an unregistered weight or
    // fontStyle anywhere in the stylesheet fails the entire render. The section
    // labels are italic and the headings bold, so a populated render exercises
    // all four variants.
    await expect(
      renderToBuffer(<CvDocument cv={populated()} />),
    ).resolves.toBeDefined()
  })

  test('paints the page background as a top-to-bottom gradient', async () => {
    const raw = (await renderToBuffer(<CvDocument cv={populated()} />)).toString(
      'latin1',
    )

    // An axial gradient is a ShadingType 2 dictionary; a flat fill has none.
    expect(raw).toContain('/ShadingType 2')

    const coords = /\/Coords \[([\d.\s-]+)\]/.exec(raw)?.[1]?.trim().split(/\s+/)
    expect(coords).toHaveLength(4)
    const [x0, y0, x1, y1] = (coords ?? []).map(Number)

    // Vertical axis spanning the page. react-pdf reads x2 as `props.x2 || 1`, so a
    // zero there silently tilts the gradient — this is what catches that.
    expect(x0).toBe(x1)
    expect(Math.abs((y1 ?? 0) - (y0 ?? 0))).toBeCloseTo(PAGE_HEIGHT, 0)
  })

  test('runs the gradient between the two theme colours', async () => {
    const raw = (await renderToBuffer(<CvDocument cv={populated()} />)).toString(
      'latin1',
    )

    const channels = (hex: string) =>
      [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)

    const stopColour = (marker: 'C0' | 'C1') =>
      new RegExp(`/${marker} \\[([\\d.\\s]+)\\]`)
        .exec(raw)?.[1]
        ?.trim()
        .split(/\s+/)
        .map(Number) ?? []

    // C0 is the first stop; the pattern matrix flips y, so it lands at the page top.
    stopColour('C0').forEach((value, index) => {
      expect(value).toBeCloseTo(channels(colors.pageGradientTop)[index] ?? 0, 4)
    })
    stopColour('C1').forEach((value, index) => {
      expect(value).toBeCloseTo(channels(colors.pageGradientBottom)[index] ?? 0, 4)
    })
  })

  test('repeats the background on a continuation page', async () => {
    const withPageTwo = populated()
    withPageTwo.softSkills = [{ id: 'ss1', name: 'Mentoring' }]

    const buffer = await renderToBuffer(<CvDocument cv={withPageTwo} />)
    const raw = buffer.toString('latin1')

    expect(countPages(buffer)).toBe(2)
    expect(raw.match(/\/ShadingType 2/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  test('keeps a full CV to two pages, with neither of them empty', async () => {
    const buffer = await renderToBuffer(<CvDocument cv={realistic()} />)

    expect(countPages(buffer)).toBe(2)

    // A third page here is a pagination failure, not more content: the two columns are
    // a flex row that react-pdf cannot split, so overflowing page one by even a point
    // emits a continuation page carrying only the card background — a blank sheet
    // between the two real ones. Left-column spacing is what governs this.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    }).promise

    for (let page = 1; page <= doc.numPages; page += 1) {
      const content = await (await doc.getPage(page)).getTextContent()
      const runs = (content.items as { str: string }[]).filter(
        (item) => item.str.trim() !== '',
      )
      expect(runs.length).toBeGreaterThan(0)
    }
  })

  test('embeds selectable text rather than an image', async () => {
    const buffer = await renderToBuffer(<CvDocument cv={populated()} />)

    // A font subset is only present when real glyphs were laid out.
    expect(buffer.toString('latin1')).toContain('/FontFile2')
  })
})

describe('chevron geometry', () => {
  type Point = { x: number; y: number }

  const parse = (points: string): Point[] =>
    points.split(' ').map((pair) => {
      const [x, y] = pair.split(',').map(Number)
      return { x: x ?? 0, y: y ?? 0 }
    })

  const rightEdge = (points: Point[]) => Math.max(...points.map((p) => p.x))

  test('is a triangle with a notch cut into its right side', () => {
    const points = parse(chevronPoints(0))

    expect(points).toHaveLength(6)

    const apex = points[0]
    const notchApex = points[3]

    expect(apex?.x).toBe(0)
    expect(notchApex?.x).toBeGreaterThan(0)
    expect(notchApex?.x).toBeLessThan(rightEdge(points))
    expect(notchApex?.y).toBe(apex?.y)
  })

  test('has a 90-degree tip', () => {
    const [apex, topRight, , , , bottomRight] = parse(chevronPoints(0))
    if (!apex || !topRight || !bottomRight) throw new Error('missing points')

    // Perpendicular arms means a right angle at the tip.
    const upper = { x: topRight.x - apex.x, y: topRight.y - apex.y }
    const lower = { x: bottomRight.x - apex.x, y: bottomRight.y - apex.y }

    expect(upper.x * lower.x + upper.y * lower.y).toBeCloseTo(0, 6)
  })

  test('cuts the notch parallel to the outer arms', () => {
    const points = parse(chevronPoints(0))
    const [apex, topRight, notchTop, notchApex] = points
    if (!apex || !topRight || !notchTop || !notchApex) {
      throw new Error('missing points')
    }

    const outerSlope = (topRight.y - apex.y) / (topRight.x - apex.x)
    const notchSlope = (notchTop.y - notchApex.y) / (notchTop.x - notchApex.x)

    expect(notchSlope).toBeCloseTo(outerSlope, 6)
  })

  test('leaves two vertical edges on the right', () => {
    const points = parse(chevronPoints(0))
    const onRight = points.filter((point) => point.x === rightEdge(points))

    expect(onRight).toHaveLength(4)
    expect(onRight[0]?.y).toBeLessThan(onRight[1]?.y ?? 0)
    expect(onRight[2]?.y).toBeLessThan(onRight[3]?.y ?? 0)
  })

  test('is symmetric about its middle', () => {
    const points = parse(chevronPoints(0))
    const midY = points[0]?.y ?? 0
    const distances = points.map((point) => point.y - midY)

    expect(distances[1]).toBeCloseTo(-(distances[5] ?? 0), 6)
    expect(distances[2]).toBeCloseTo(-(distances[4] ?? 0), 6)
  })

  test('draws three marks', () => {
    expect(chevronOffsets()).toHaveLength(3)
  })

  test('sets each tip on the right-edge axis of the mark before it', () => {
    const offsets = chevronOffsets()

    offsets.slice(1).forEach((offset, index) => {
      const previous = parse(chevronPoints(offsets[index] ?? 0))
      const apex = parse(chevronPoints(offset))[0]

      // No gap: the tip touches the previous mark's right edge exactly.
      expect(apex?.x).toBe(rightEdge(previous))
    })
  })

  test('shifts the whole mark by the offset', () => {
    const first = parse(chevronPoints(0))
    const second = parse(chevronPoints(58))

    second.forEach((point, index) => {
      // toBeCloseTo, not toBe: the fractional notch depth leaves float dust.
      expect(point.x - (first[index]?.x ?? 0)).toBeCloseTo(58, 6)
      expect(point.y).toBe(first[index]?.y)
    })
  })
})
