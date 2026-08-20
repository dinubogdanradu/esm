// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToBuffer } from '@react-pdf/renderer'
import { vi } from 'vitest'
import { defaultCv } from '@/schema/defaults'
import type { Cv } from '@/schema/cv'
import { ratedEntry, selectSkill } from '@/test/expertise'
import { richTextFromPlain } from '@/schema/richText'
import { PAGE_SIZE, layout } from './theme'

const fontPath = (file: string) => ({ default: resolve('src/pdf/fonts', file) })

vi.mock('./fonts/Roboto-Regular.ttf', () => fontPath('Roboto-Regular.ttf'))
vi.mock('./fonts/Roboto-Bold.ttf', () => fontPath('Roboto-Bold.ttf'))
vi.mock('./fonts/Roboto-Italic.ttf', () => fontPath('Roboto-Italic.ttf'))
vi.mock('./fonts/Roboto-BoldItalic.ttf', () => fontPath('Roboto-BoldItalic.ttf'))
vi.mock('./assets/brand-logo.png', () => ({
  default: readFileSync(resolve('src/pdf/assets/brand-logo.png')),
}))

const { default: CvDocument } = await import('./CvDocument')


// Catalog-derived, so these fixtures survive edits to skills.md.
const rated = ratedEntry()
const ratedSkill = (index: number): string => {
  const name = rated.options[index % rated.options.length]
  if (!name) throw new Error('rated category has no options')
  return name
}

const [PAGE_WIDTH, PAGE_HEIGHT] = PAGE_SIZE

type Placed = { text: string; x: number; y: number; width: number; font: string }

/**
 * Reads back the laid-out text positions, so header placement is checked against the
 * rendered document rather than against the styles that were meant to produce it.
 * PDF y grows upward from the page bottom.
 */
const placedText = async (cv: Cv): Promise<Placed[]> => {
  const buffer = await renderToBuffer(<CvDocument cv={cv} />)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise
  const page = await doc.getPage(1)
  const content = await page.getTextContent()

  return (
    content.items as {
      str: string
      width: number
      transform: number[]
      fontName: string
    }[]
  )
    .filter((item) => item.str.trim() !== '')
    .map((item) => ({
      text: item.str,
      x: item.transform[4] ?? 0,
      y: item.transform[5] ?? 0,
      width: item.width,
      font: item.fontName,
    }))
}

/**
 * Filled paths from the page's operator list. Note these coordinates are in
 * react-pdf's own drawing space, where y grows *downward* — the opposite of the text
 * positions above, which are in PDF space.
 */
const filledPaths = async (cv: Cv) => (await pageGeometry(cv)).paths

const pageGeometry = async (cv: Cv) => {
  const buffer = await renderToBuffer(<CvDocument cv={cv} />)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise
  const page = await doc.getPage(1)
  const list = await page.getOperatorList()
  const OPS = (pdfjs as unknown as { OPS: Record<string, number | undefined> }).OPS
  // noUncheckedIndexedAccess makes each lookup `number | undefined`, which cannot be
  // a computed key, so resolve the codes through a helper first.
  const code = (name: string): number => OPS[name] ?? -1

  // Only the anchor points, not bezier control points: a control point also lies on
  // the adjacent edge, which would otherwise be mistaken for the corner itself.
  const consumed = new Map<number, number>([
    [code('moveTo'), 2],
    [code('lineTo'), 2],
    [code('curveTo'), 6],
    [code('curveTo2'), 4],
    [code('curveTo3'), 4],
    [code('closePath'), 0],
    [code('rectangle'), 4],
  ])

  const paths: { x: number; y: number }[][] = []
  list.fnArray.forEach((fn: number, index: number) => {
    if (fn !== code('constructPath')) return
    const [ops, coords] = list.argsArray[index] as [number[], number[]]

    const anchors: { x: number; y: number }[] = []
    let cursor = 0
    for (const op of ops) {
      const size = consumed.get(op) ?? 0
      if (size >= 2) {
        // The last pair an op consumes is where the pen ends up.
        anchors.push({
          x: coords[cursor + size - 2] ?? 0,
          y: coords[cursor + size - 1] ?? 0,
        })
      }
      cursor += size
    }
    paths.push(anchors)
  })

  const dashedStrokes = list.fnArray.filter((fn: number, index: number) => {
    if (fn !== code('setDash')) return false
    const [pattern] = list.argsArray[index] as [number[]]
    return pattern.length > 0
  }).length

  return { paths, dashedStrokes }
}

/** The clip in force for each painted image, in order. */
const imageClips = async (cv: Cv) => {
  const buffer = await renderToBuffer(<CvDocument cv={cv} />)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise
  const list = await (await doc.getPage(1)).getOperatorList()
  const OPS = (pdfjs as unknown as { OPS: Record<string, number | undefined> }).OPS
  const nameOf = new Map(
    Object.entries(OPS).map(([key, value]) => [value ?? -1, key]),
  )

  const clips: { width: number; height: number; x: number; y: number }[] = []
  let pending: (typeof clips)[number] | undefined
  list.fnArray.forEach((fn: number, index: number) => {
    const name = nameOf.get(fn)
    if (name === 'constructPath') {
      const [, coords] = list.argsArray[index] as [number[], number[]]
      const xs = coords.filter((_, i) => i % 2 === 0)
      const ys = coords.filter((_, i) => i % 2 === 1)
      pending = {
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        x: Math.min(...xs),
        y: Math.min(...ys),
      }
    }
    if (name === 'paintImageXObject' && pending) clips.push(pending)
  })

  return clips
}

type Box = { left: number; right: number; top: number; bottom: number }

const bounds = (points: { x: number; y: number }[]): Box => ({
  left: Math.min(...points.map((point) => point.x)),
  right: Math.max(...points.map((point) => point.x)),
  top: Math.min(...points.map((point) => point.y)),
  bottom: Math.max(...points.map((point) => point.y)),
})

/**
 * react-pdf emits four corner curves whatever the radius, so counting curves proves
 * nothing. A square corner is the degenerate case that passes through the corner
 * point; a rounded one never touches it.
 */
const roundedCorners = (points: { x: number; y: number }[]): string[] => {
  const { left, right, top, bottom } = bounds(points)

  return (
    [
      { x: right, y: top, name: 'top-right' },
      { x: right, y: bottom, name: 'bottom-right' },
      { x: left, y: bottom, name: 'bottom-left' },
      { x: left, y: top, name: 'top-left' },
    ] as const
  )
    .filter(
      ({ x, y }) =>
        !points.some(
          (point) => Math.abs(point.x - x) < 0.5 && Math.abs(point.y - y) < 0.5,
        ),
    )
    .map((corner) => corner.name)
}

const sized = (
  paths: { x: number; y: number }[][],
  width: number,
  height: number,
) =>
  paths.filter((points) => {
    const box = bounds(points)
    return (
      Math.round(box.right - box.left) === width &&
      Math.round(box.bottom - box.top) === height
    )
  })

const find = (items: Placed[], text: string): Placed => {
  const match = items.find((item) => item.text === text)
  if (!match) {
    throw new Error(
      `"${text}" was not laid out. Found: ${items.map((i) => i.text).join(' | ')}`,
    )
  }
  return match
}

const centre = (item: Placed) => item.x + item.width / 2

const fixture = (): Cv => {
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
    photo: '',
  }
  cv.profile.summary = richTextFromPlain('Summary line.')
  selectSkill(cv, rated.key, ratedSkill(0), { lastUsed: 'Within last month' })
  return cv
}

describe('header layout', () => {
  test('centres the name and the headline on the same axis', async () => {
    const items = await placedText(fixture())

    const name = find(items, 'Avery Quinn')
    const headline = find(items, 'Fullstack Developer')

    expect(centre(name)).toBeCloseTo(centre(headline), 0)
  })

  test('puts the contact details in the bottom-right of the header', async () => {
    const items = await placedText(fixture())

    const email = find(items, 'avery@example.com')
    const location = find(items, 'Lisbon, Portugal')

    // Flush to the right margin, and inside the header band rather than below it.
    expect(location.x + location.width).toBeCloseTo(
      PAGE_WIDTH - layout.cardMargin,
      0,
    )
    const headerBottom = PAGE_HEIGHT - layout.headerHeight
    expect(location.y).toBeGreaterThan(headerBottom)
    expect(location.y).toBeLessThan(headerBottom + 40)

    // Both on one line, email to the left of the location.
    expect(email.y).toBeCloseTo(location.y, 0)
    expect(email.x + email.width).toBeLessThan(location.x)
  })

  test('keeps the contact details on the page and unwrapped', async () => {
    const items = await placedText(fixture())

    // A right-anchored box with no width collapses and wraps mid-word, which is how
    // this regressed before: "Lisbon, Portugal" arrived as "Buc" / "Rom".
    for (const text of ['avery@example.com', 'Lisbon, Portugal']) {
      const item = find(items, text)
      expect(item.x).toBeGreaterThan(0)
      expect(item.x + item.width).toBeLessThanOrEqual(PAGE_WIDTH)
    }
  })
})

describe('card shape', () => {
  test('rounds only the top-right corner, at the full radius', async () => {
    const paths = await filledPaths(fixture())

    const cardWidth = PAGE_WIDTH - layout.cardMargin * 2
    const card = paths.find((points) => {
      const xs = points.map((point) => point.x)
      const ys = points.map((point) => point.y)
      return (
        Math.round(Math.max(...xs) - Math.min(...xs)) === cardWidth &&
        Math.max(...ys) - Math.min(...ys) > 300
      )
    })
    if (!card) throw new Error('card path not found')

    const { right, top } = bounds(card)

    expect(roundedCorners(card)).toEqual(['top-right'])

    // The curve leaves the top edge one radius back from the corner, so the
    // rightmost point still on that edge is exactly `radius` short of it.
    const lastOnTopEdge = Math.max(
      ...card
        .filter((point) => Math.abs(point.y - top) < 0.5 && point.x < right)
        .map((point) => point.x),
    )
    expect(right - lastOnTopEdge).toBeCloseTo(layout.cardRadius, 0)

    // ...and rejoins the right edge one radius down from it.
    const firstOnRightEdge = Math.min(
      ...card
        .filter((point) => Math.abs(point.x - right) < 0.5)
        .map((point) => point.y),
    )
    expect(firstOnRightEdge - top).toBeCloseTo(layout.cardRadius, 0)
  })
})

describe('profile photo', () => {
  // A real 8x8 PNG. An invalid one is skipped silently by react-pdf, so the image
  // would never be painted and a test could pass while proving nothing.
  const PHOTO =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAklEQVR4AewaftIAAAAjSURBVIXBAQEAIAyAMCSXIYxtK99AtnXPfnxIkCBBggQJEgZo5gJj7/zyMAAAAABJRU5ErkJggg=='

  test('insets the image to leave the white ring visible', async () => {
    const withPhoto = fixture()
    withPhoto.personal.photo = PHOTO

    // The ring is the frame's background, so the proof is that the image is clipped
    // smaller than the frame and offset by the border on every side. A border on the
    // Image itself would be painted first and then covered by the image.
    const [photoClip] = await imageClips(withPhoto)
    const inner = layout.photoSize - layout.photoBorder * 2

    expect(photoClip?.width).toBeCloseTo(inner, 0)
    expect(photoClip?.height).toBeCloseTo(inner, 0)
    expect(photoClip?.x).toBeCloseTo(layout.photoBorder, 0)
    expect(photoClip?.y).toBeCloseTo(layout.photoBorder, 0)
  })

  test('keeps its border inside the box, so the header does not shift', async () => {
    const withPhoto = fixture()
    withPhoto.personal.photo = PHOTO

    const items = await placedText(withPhoto)
    const name = find(items, 'Avery Quinn')

    // photoSize is the outer diameter: the white border eats into it rather than
    // growing the circle, so the pill sits at a predictable offset.
    const expected =
      layout.cardMargin + layout.photoSize + 18 + 260 / 2
    expect(centre(name)).toBeCloseTo(expected, 0)
  })
})

describe('section labels and card tabs', () => {
  test('draws the section label bars with square corners', async () => {
    const paths = await filledPaths(fixture())

    // The label bars are the only ~25pt-tall filled boxes over 100pt wide.
    const bars = paths.filter((points) => {
      const box = bounds(points)
      const width = box.right - box.left
      const height = box.bottom - box.top
      return Math.round(height) === 25 && width > 100 && width < 250
    })

    // The fixture fills the profile summary and expertise sections.
    expect(bars.length).toBeGreaterThanOrEqual(2)
    for (const bar of bars) {
      expect(roundedCorners(bar)).toEqual([])
    }
  })

  test('draws the lateral card tabs with square corners', async () => {
    const paths = await filledPaths(fixture())
    const tabs = sized(paths, layout.tabWidth, layout.tabHeight)

    expect(tabs).toHaveLength(2)
    for (const tab of tabs) {
      expect(roundedCorners(tab)).toEqual([])
    }
  })
})

describe('dashed rules', () => {
  const withLeftColumn = (): Cv => {
    const cv = fixture()
    cv.qualifications = [
      {
        id: 'q1',
        institution: 'Riverside Institute',
        degree: 'BSc',
        field: '',
        location: '',
        startDate: '',
        endDate: '',
        grade: '',
      },
    ]
    return cv
  }

  test('closes the profile summary and qualifications sections', async () => {
    const { dashedStrokes } = await pageGeometry(withLeftColumn())

    // The column divider between the two columns, plus one rule after each of the
    // profile summary and qualifications sections.
    expect(dashedStrokes).toBe(3)
  })

  test('omits the rule when nothing follows the section', async () => {
    const cv = fixture()
    cv.qualifications = []
    // Profile summary is the only left-column section, so it needs no closing rule.
    cv.expertise.forEach((group) => {
      group.selected = false
    })

    const { dashedStrokes } = await pageGeometry(cv)

    expect(dashedStrokes).toBe(1)
  })
})

describe('contact details', () => {
  test('renders in bold', async () => {
    const items = await placedText(fixture())

    // The name and headline are both bold, so sharing their font subset is what
    // "bold" means in the output.
    const bold = find(items, 'Avery Quinn').font
    expect(find(items, 'avery@example.com').font).toBe(bold)
    expect(find(items, 'Lisbon, Portugal').font).toBe(bold)

    // ...and a different subset from the regular body text.
    expect(find(items, 'Summary line.').font).not.toBe(bold)
  })
})
