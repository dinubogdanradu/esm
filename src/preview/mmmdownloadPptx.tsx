import type { Cv } from '@/schema/cv'
import brandLogo from '@/pdf/assets/infosys-logo.png'
import {
  certificationLine,
  contactLines,
  experienceEntries,
  expertiseLines,
  fullName,
  hasSecondPageContent,
  languageLine,
  presentSections,
  profileBullets,
  projectEntries,
  qualificationLine,
} from '@/pdf/model'

const SLIDE_WIDTH = 12.8
const SLIDE_HEIGHT = 8
const CARD_X = 0.3
const CARD_Y = 2.45
const CARD_WIDTH = 12.2
const CARD_HEIGHT = 5.22
// Move left column slightly left to align with PDF template
const LEFT_X = 0.45
const LEFT_WIDTH = 4.9
const RIGHT_X = 5.6
const RIGHT_WIDTH = 6.4

const colors = {
  accent: '#007CC3',
  surface: '#FFFFFF',
  page: '#FDFDFD',
  // label colors sampled from template
  labelDark: '#9B95A8',
  labelBlue: '#7FB0E0',
  divider: '#A9BAC6',
} as const

const imageUrlToDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url)
  const blob = await response.blob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const makeCircularDataUrl = async (dataUrl: string, wInches: number, hInches: number): Promise<string> => {
  const DPI = 96
  const w = Math.max(1, Math.round(wInches * DPI))
  const h = Math.max(1, Math.round(hInches * DPI))

  await new Promise<void>((resolve, reject) => {
    // ensure image is loaded by creating an Image object
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('failed to load image for circular crop'))
    img.src = dataUrl
  })

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = dataUrl
  await new Promise((resolve) => {
    if (img.complete) return resolve(undefined)
    img.onload = () => resolve(undefined)
  })

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

  const r = Math.min(w, h) / 2
  ctx.clearRect(0, 0, w, h)
  ctx.save()
  ctx.beginPath()
  ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  // cover scaling
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  const dx = (w - dw) / 2
  const dy = (h - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
  ctx.restore()

  return canvas.toDataURL('image/png')
}

type Slide = any

const addSection = (
  slide: Slide,
  title: string,
  lines: string[],
  x: number,
  y: number,
  width: number,
  variant: 'dark' | 'blue',
  options: { bullet?: boolean; maxHeight: number },
): number => {
  const labelHeight = 0.34
  const color = variant === 'dark' ? colors.labelDark : colors.labelBlue
  slide.addShape('rect', {
    x,
    y,
    w: Math.min(width, Math.max(2.35, title.length * 0.072 + 0.48)),
    h: labelHeight,
    fill: { color },
    line: { color },
    radius: 0.15,
  })
  slide.addShape('line', {
    x: x + 0.14,
    y: y + 0.15,
    w: 0.2,
    h: 0,
    line: { color: colors.surface, width: 1.4 },
  })
  slide.addText(title, {
    x: x + 0.42,
    y: y + 0.06,
    w: width - 0.5,
    h: 0.18,
    fontFace: 'Roboto',
    fontSize: 9,
    italic: true,
    color: colors.surface,
    margin: 0,
  })

  const bodyLines = options.bullet ? lines.map((line) => `• ${line}`) : lines
  slide.addText(bodyLines.join('\n'), {
    x: x + 0.06,
    y: y + labelHeight + 0.08,
    w: width - 0.12,
    h: options.maxHeight,
    fontFace: 'Roboto',
    fontSize: 8,
    color: '#000000',
    fit: 'shrink',
    margin: 0,
    align: 'left',
    paraSpaceAfterPt: 1,
  })

  return y + labelHeight + options.maxHeight + 0.16
}

const addCard = (
  slide: Slide,
  y = CARD_Y,
  height = CARD_HEIGHT,
  dividerHeight = height - 0.4,
) => {
  slide.background = { color: colors.page }
  slide.addShape('roundRect', {
    x: CARD_X,
    y,
    w: CARD_WIDTH,
    h: height,
    rectRadius: 0.15,
    fill: { color: colors.page },
    line: { color: colors.page, transparency: 100 },
  })
  if (dividerHeight > 0) {
    slide.addShape('line', {
      x: 5.35,
      y: y + 0.2,
      w: 0,
      h: dividerHeight,
      line: { color: colors.divider, width: 0.6, dashType: 'dash' },
    })
  }
}

const addHeader = async (slide: Slide, cv: Cv) => {
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: SLIDE_WIDTH,
    h: 2.13,
    fill: { color: colors.accent },
    line: { color: colors.accent },
  })

  if (cv.personal.photo.startsWith('data:')) {
    try {
      const circ = await makeCircularDataUrl(cv.personal.photo, 1.55, 1.55)
      slide.addImage({ data: circ, x: 0.35, y: 0.22, w: 1.55, h: 1.55, sizing: { type: 'contain' } })
    } catch {
      // fallback to original if circularization fails
      slide.addImage({ data: cv.personal.photo, x: 0.35, y: 0.22, w: 1.55, h: 1.55 })
    }
  }

  const name = fullName(cv)
  if (name) {
    slide.addShape('roundRect', {
      x: 2.08,
      y: 0.3,
      w: 3.8,
      h: 0.47,
      rectRadius: 0.18,
      fill: { color: colors.surface },
      line: { color: colors.surface },
    })
    slide.addText(name, {
      x: 2.2,
      y: 0.395,
      w: 3.5,
      h: 0.17,
      fontFace: 'Roboto',
      fontSize: 16,
      bold: true,
      align: 'center',
      color: '#000000',
      margin: 0,
      fit: 'shrink',
    })
  }

  if (cv.personal.headline.trim()) {
    slide.addText(cv.personal.headline, {
      x: 2.12,
      y: 0.95,
      w: 6.1,
      h: 0.25,
      fontFace: 'Roboto',
      fontSize: 10.5,
      bold: true,
      color: colors.surface,
      margin: 0,
      fit: 'shrink',
    })
  }

  const contacts = contactLines(cv)
  if (contacts.length) {
    slide.addText(contacts.join('   |   '), {
      x: 2.12,
      y: 1.32,
      w: 7.0,
      h: 0.4,
      fontFace: 'Roboto',
      fontSize: 8,
      color: colors.surface,
      margin: 0,
      fit: 'shrink',
    })
  }

  try {
    const logo = await imageUrlToDataUrl(brandLogo)
    slide.addImage({ data: logo, x: 10.85, y: 0.45, w: 1.3, h: 0.65, sizing: { type: 'contain' } })
  } catch {
    // Branding is decorative; a blocked asset fetch must not prevent export.
  }
}

export const downloadPptx = async (cv: Cv): Promise<void> => {
  try {
    const module = await import('pptxgenjs')
    const PptxGenJS = module.default
    const pptx = new PptxGenJS()
    pptx.defineLayout({ name: 'CV_LANDSCAPE', width: SLIDE_WIDTH, height: SLIDE_HEIGHT })
    pptx.layout = 'CV_LANDSCAPE'
    pptx.author = fullName(cv) || 'CV Builder'
    pptx.subject = 'CV export'
    pptx.title = fullName(cv) ? `${fullName(cv)} - CV` : 'CV'
    pptx.company = 'Infosys'

    const present = presentSections(cv)
    const experience = experienceEntries(cv.experience)
    const projects = projectEntries(cv.projects)

    const firstPage = pptx.addSlide()
    await addHeader(firstPage, cv)
    addCard(firstPage)

    let leftY = CARD_Y + 0.22
    if (present.profile) {
      leftY = addSection(firstPage, 'Profile summary', profileBullets(cv.profile.summary), LEFT_X, leftY, LEFT_WIDTH, 'dark', { bullet: true, maxHeight: 1.15 })
    }
    if (present.qualifications) {
      leftY = addSection(firstPage, 'Qualifications', cv.qualifications.map(qualificationLine), LEFT_X, leftY, LEFT_WIDTH, 'blue', { bullet: true, maxHeight: 0.8 })
    }
    if (present.expertise) {
      addSection(firstPage, 'Areas of expertise', expertiseLines(cv).map((line) => `${line.label}: ${line.value}`), LEFT_X, leftY, LEFT_WIDTH, 'dark', { maxHeight: 1.05 })
    }

    if (present.experience) {
      const lines = experience.flatMap((entry) => [entry.title, entry.meta, ...entry.bullets.map((bullet) => `• ${bullet}`), entry.tech, ''].filter(Boolean))
      addSection(firstPage, 'Experience summary', lines, RIGHT_X, CARD_Y + 0.22, RIGHT_WIDTH, 'blue', { maxHeight: 4.45 })
    }

    if (hasSecondPageContent(cv)) {
      const secondPage = pptx.addSlide()
      const hasTopColumns = present.certifications || present.languages || present.softSkills
      addCard(secondPage, 0.3, 7.4, hasTopColumns ? 2.55 : 0)

      if (present.certifications) {
        addSection(secondPage, 'Certifications & Trainings', cv.certifications.map(certificationLine), LEFT_X, 0.52, LEFT_WIDTH, 'dark', { bullet: true, maxHeight: 2.1 })
      }
      if (present.languages || present.softSkills) {
        const lines = [
          ...(present.languages ? ['Languages', ...cv.languages.map((entry) => `• ${languageLine(entry.name, entry.level)}`)] : []),
          ...(present.softSkills ? ['', 'Soft Skills', cv.softSkills.map((entry) => entry.name.trim()).filter(Boolean).join(', ')] : []),
        ]
        addSection(secondPage, 'Languages & Soft Skills', lines, RIGHT_X, 0.52, RIGHT_WIDTH, 'blue', { maxHeight: 2.1 })
      }
      if (present.projects) {
        if (hasTopColumns) {
          secondPage.addShape('line', {
            x: LEFT_X,
            y: 3.03,
            w: CARD_WIDTH - 0.44,
            h: 0,
            line: { color: colors.divider, width: 0.6, dashType: 'dash' },
          })
        }
        const lines = projects.flatMap((project) => [project.title, project.meta, project.description, project.tech, ''].filter(Boolean))
        addSection(
          secondPage,
          'Personal Projects',
          lines,
          LEFT_X,
          hasTopColumns ? 3.25 : 0.52,
          CARD_WIDTH - 0.44,
          'blue',
          { maxHeight: hasTopColumns ? 3.65 : 6.4 },
        )
      }
    }

    const name = fullName(cv).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    await pptx.writeFile({ fileName: name ? `${name}-cv.pptx` : 'cv.pptx' })
  } catch (error: unknown) {
    console.error('downloadPptx error:', error)
    throw new Error(error instanceof Error ? error.message : 'The PPTX could not be generated.')
  }
}

export default downloadPptx
