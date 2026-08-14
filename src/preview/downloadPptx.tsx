import type { Cv } from '@/schema/cv'
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

/**
 * Pixel-matched recreation of the "Bogdan Dinu - short CV" PowerPoint template.
 * The original file is 10 x 6.25 in (16:10), not 12.8 x 8 in.
 *
 * Static master graphics are embedded directly in this file so the generated
 * presentation does not depend on additional template assets.
 */

const SLIDE_WIDTH = 10
const SLIDE_HEIGHT = 6.25

const TEMPLATE_MASTER_BG = 'data:image/png;base64,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'
const INFOSYS_WHITE_LOGO = 'data:image/png;base64,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'
const EMAIL_ICON = 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgOTYgOTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIGlkPSJJY29uc19FbnZlbG9wZSIgb3ZlcmZsb3c9ImhpZGRlbiI+PHN0eWxlPgouTXNmdE9mY1RobV9CYWNrZ3JvdW5kMV9GaWxsX3YyIHsKIGZpbGw6I0ZGRkZGRjsgCn0KPC9zdHlsZT4KPHBhdGggZD0iTTggMjAgOCA3NiA4OCA3NiA4OCAyMCA4IDIwWk00OS40IDU0LjlDNDguNiA1NS43IDQ3LjQgNTUuNyA0Ni42IDU0LjlMMTcgMjYgNzkuMSAyNiA0OS40IDU0LjlaTTMzLjUgNDcuNyAxNCA2Ny4zIDE0IDI4LjYgMzMuNSA0Ny43Wk0zNi40IDUwLjUgNDMuOSA1Ny44QzQ1LjEgNTguOSA0Ni42IDU5LjUgNDguMSA1OS41IDQ5LjYgNTkuNSA1MS4xIDU4LjkgNTIuMyA1Ny44TDU5LjggNTAuNSA3OS4yIDcwIDE2LjkgNzAgMzYuNCA1MC41Wk02Mi41IDQ3LjcgODIgMjguNyA4MiA2Ny4yIDYyLjUgNDcuN1oiIGNsYXNzPSJNc2Z0T2ZjVGhtX0JhY2tncm91bmQxX0ZpbGxfdjIiIGZpbGw9IiNGRkZGRkYiLz48L3N2Zz4='
const LOCATION_ICON = 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgOTYgOTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIGlkPSJJY29uc19NYXJrZXIiIG92ZXJmbG93PSJoaWRkZW4iPjxzdHlsZT4KLk1zZnRPZmNUaG1fQmFja2dyb3VuZDFfRmlsbF92MiB7CiBmaWxsOiNGRkZGRkY7IAp9Cjwvc3R5bGU+CjxnPjxwYXRoIGQ9Ik00OCA0NEM0MyA0NCAzOSA0MCAzOSAzNSAzOSAzMCA0MyAyNiA0OCAyNiA1MyAyNiA1NyAzMCA1NyAzNSA1NyA0MCA1MyA0NCA0OCA0NFpNNDggMTRDNDEuMSAxNCAzNC42IDE3LjQgMzAuNyAyMy4yIDI2LjggMjguOSAyNiAzNi4yIDI4LjUgNDIuN0wzOCA2My43IDQ2LjIgODAuOUM0Ni41IDgxLjYgNDcuMiA4MiA0OCA4MiA0OC44IDgyIDQ5LjUgODEuNiA0OS44IDgwLjlMNTggNjMuNyA2Ny41IDQyLjdDNzAgMzYuMiA2OS4yIDI4LjkgNjUuMyAyMy4yIDYxLjQgMTcuNCA1NC45IDE0IDQ4IDE0WiIgY2xhc3M9Ik1zZnRPZmNUaG1fQmFja2dyb3VuZDFfRmlsbF92MiIgZmlsbD0iI0ZGRkZGRiIvPjwvZz48L3N2Zz4='

const C = {
  header: '0F9CD8',
  dark: '1F497D',
  blue: '4F81BD',
  white: 'FFFFFF',
  card: 'F2F2F2', // bg1 @ 95% luminance in the source template
  black: '000000',
  divider: '7F7F7F',
  chevronLight: 'D5E5F8',
  chevronMid: '8AB7EA',
} as const

type Slide = any

const imageUrlToDataUrl = async (url: string): Promise<string> => {
  if (url.startsWith('data:')) return url
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load image: ${url}`)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const makeCircularDataUrl = async (dataUrl: string, sizeInches: number): Promise<string> => {
  const DPI = 220
  const size = Math.max(1, Math.round(sizeInches * DPI))
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = dataUrl
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load profile image'))
  })

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')

  ctx.save()
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.clip()

  const scale = Math.max(size / img.width, size / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh)
  ctx.restore()

  return canvas.toDataURL('image/png')
}

const addMasterBackground = (slide: Slide) => {
  slide.addImage({
    data: TEMPLATE_MASTER_BG,
    x: 0,
    y: 0,
    w: SLIDE_WIDTH,
    h: SLIDE_HEIGHT,
  })
}

const addCard = (slide: Slide, x: number, y: number, w: number, h: number) => {
  // The source template uses PowerPoint's "Rectangle: Single Corner Rounded"
  // (round1Rect) with only the upper-right corner rounded.
  slide.addShape('round1Rect' as any, {
    x, y, w, h,
    fill: { color: C.card },
    line: { color: C.card, transparency: 100 },
    radius: 0.11205,
  })
}

const addDivider = (slide: Slide, x: number, y: number, w: number, h: number) => {
  slide.addShape('line', {
    x, y, w, h,
    line: { color: C.divider, width: 0.5, dashType: 'dash' },
  })
}

const addSectionBar = (
  slide: Slide,
  title: string,
  x: number,
  y: number,
  w: number,
  variant: 'dark' | 'blue',
  options: {
    lineX: number
    lineY: number
    lineW: number
    prefixSpaces?: number
  },
) => {
  const fill = variant === 'dark' ? C.dark : C.blue
  slide.addShape('rect', {
    x, y, w, h: 0.3,
    fill: { color: fill },
    line: { color: fill, transparency: 100 },
  })

  // In the source PPTX the title is centered inside the *whole* bar.
  // The leading spaces are intentional: they reserve visual room for the
  // white marker line exactly like the original template text does.
  slide.addText(`${' '.repeat(options.prefixSpaces ?? 0)}${title}`, {
    x,
    y,
    w,
    h: 0.3,
    fontFace: 'Arial',
    fontSize: 10,
    italic: true,
    color: C.white,
    margin: [0.05, 0.1, 0.05, 0.1],
    valign: 'mid',
    align: 'center',
    fit: 'shrink',
  })

  slide.addShape('line', {
    x: options.lineX,
    y: options.lineY,
    w: options.lineW,
    h: 0,
    line: { color: C.white, width: 2 },
  })
}

const addHeaderChevron = (slide: Slide, x: number, color: string) => {
  // The original template uses PowerPoint's halfFrame shape rotated by
  // -45.7793167 degrees, not a hand-drawn chevron SVG.
  slide.addShape('halfFrame' as any, {
    x,
    y: 0.231,
    w: 0.472,
    h: 0.52,
    rotate: -45.7793167,
    fill: { color },
    line: { color, transparency: 100 },
  })
}

const addHeader = async (slide: Slide, cv: Cv) => {
  slide.addShape('rect', {
    x: 0,
    y: -0.001,
    w: 10,
    h: 1.519,
    fill: { color: C.header },
    line: { color: C.header, transparency: 100 },
  })

  if (cv.personal.photo?.trim()) {
    try {
      const raw = await imageUrlToDataUrl(cv.personal.photo)
      const circ = await makeCircularDataUrl(raw, 1.357)
      slide.addImage({ data: circ, x: 0.266, y: 0.051, w: 1.357, h: 1.357 })
      slide.addShape('ellipse', {
        x: 0.266,
        y: 0.051,
        w: 1.357,
        h: 1.357,
        fill: { color: C.white, transparency: 100 },
        line: { color: C.white, width: 3 },
      })
    } catch (error) {
      console.warn('Profile photo could not be rendered:', error)
    }
  }

  const name = fullName(cv)
  if (name) {
    slide.addShape('roundRect', {
      x: 1.803,
      y: 0.495,
      w: 3.258,
      h: 0.339,
      rectRadius: 0.16,
      fill: { color: C.white },
      line: { color: C.white, transparency: 100 },
    })
    slide.addText(name, {
      x: 1.803,
      y: 0.495,
      w: 3.258,
      h: 0.339,
      fontFace: 'Calibri',
      fontSize: 15,
      bold: true,
      color: C.black,
      align: 'center',
      valign: 'mid',
      margin: [0.05, 0.1, 0.05, 0.1],
      fit: 'shrink',
    })
  }

  if (cv.personal.headline?.trim()) {
    slide.addText(cv.personal.headline.trim(), {
      x: 2.499,
      y: 0.912,
      w: 1.864,
      h: 0.328,
      fontFace: 'Calibri',
      fontSize: 13.5,
      color: C.white,
      align: 'center',
      margin: [0.05, 0.1, 0.05, 0.1],
      fit: 'shrink',
    })
  }

  addHeaderChevron(slide, 7.781, C.chevronLight)
  addHeaderChevron(slide, 8.106, C.chevronLight)
  addHeaderChevron(slide, 8.449, C.chevronMid)

  slide.addImage({
    data: INFOSYS_WHITE_LOGO,
    x: 8.864,
    y: 0.254,
    w: 1.011,
    h: 0.514,
  })

  const contacts = contactLines(cv).filter(Boolean)
  if (contacts[0]) {
    slide.addImage({ data: EMAIL_ICON, x: 5.959, y: 1.18, w: 0.323, h: 0.323 })
    slide.addText(contacts[0], {
      x: 6.193,
      y: 1.207,
      w: 2.16,
      h: 0.269,
      fontFace: 'Calibri',
      fontSize: 10,
      color: C.white,
      margin: [0.05, 0.1, 0.05, 0.1],
      fit: 'shrink',
    })
  }
  if (contacts[1]) {
    slide.addImage({ data: LOCATION_ICON, x: 8.303, y: 1.164, w: 0.323, h: 0.323 })
    slide.addText(contacts[1], {
      x: 8.498,
      y: 1.207,
      w: 1.502,
      h: 0.269,
      fontFace: 'Calibri',
      fontSize: 10,
      color: C.white,
      margin: [0.05, 0.1, 0.05, 0.1],
      fit: 'shrink',
    })
  }
}

const bulletRuns = (lines: string[], indent = 13.5): any[] =>
  lines.filter(Boolean).map((line, index, all) => ({
    text: line,
    options: {
      bullet: { indent },
      breakLine: index < all.length - 1,
    },
  }))

const addProfile = (slide: Slide, cv: Cv) => {
  addSectionBar(slide, 'Profile summary', 0.257, 1.626, 2.649, 'dark', {
    lineX: 0.347,
    lineY: 1.776,
    lineW: 0.625,
    prefixSpaces: 3,
  })
  slide.addText(bulletRuns(profileBullets(cv.profile.summary), 13.5), {
    x: 0.257,
    y: 1.973,
    w: 3.881,
    h: 1.447,
    fontFace: 'Arial',
    fontSize: 8,
    color: C.black,
    margin: [0.05, 0.1, 0.05, 0.1],
    fit: 'shrink',
    valign: 'top',
    paraSpaceBefore: 0,
    paraSpaceAfter: 0,
  })
}

const addQualifications = (slide: Slide, cv: Cv) => {
  addDivider(slide, 0.275, 3.453, 3.816, 0)
  addSectionBar(slide, 'Qualifications', 0.267, 3.635, 2.649, 'blue', {
    lineX: 0.347,
    lineY: 3.795,
    lineW: 0.625,
    prefixSpaces: 0,
  })
  slide.addText(bulletRuns(cv.qualifications.map(qualificationLine), 13.5), {
    x: 0.257,
    y: 3.922,
    w: 3.881,
    h: 0.735,
    fontFace: 'Arial',
    fontSize: 8,
    color: C.black,
    margin: 0.07,
    fit: 'shrink',
    valign: 'top',
    paraSpaceBefore: 0,
    paraSpaceAfter: 0,
  })
}

const addExpertise = (slide: Slide, cv: Cv) => {
  addDivider(slide, 0.266, 4.655, 3.816, 0)
  addSectionBar(slide, 'Areas of expertise', 0.275, 4.815, 2.649, 'dark', {
    lineX: 0.347,
    lineY: 4.965,
    lineW: 0.625,
    prefixSpaces: 3,
  })

  const lines = expertiseLines(cv)
  const runs: any[] = []
  lines.forEach((line, index) => {
    runs.push({
      text: `${line.label}: `,
      options: { bold: true, bullet: { indent: 13.5 } },
    })
    runs.push({
      text: line.value,
      options: { breakLine: index < lines.length - 1 },
    })
  })

  slide.addText(runs, {
    x: 0.275,
    y: 5.239,
    w: 3.881,
    h: 0.774,
    fontFace: 'Arial',
    fontSize: 8,
    color: C.black,
    margin: [0.05, 0.1, 0.05, 0.1],
    fit: 'shrink',
    valign: 'top',
    paraSpaceBefore: 0,
    paraSpaceAfter: 0,
  })
}

const addExperience = (slide: Slide, cv: Cv) => {
  addSectionBar(slide, 'Experience summary', 4.166, 1.626, 2.487, 'blue', {
    lineX: 4.275,
    lineY: 1.768,
    lineW: 0.4,
    prefixSpaces: 3,
  })
  addDivider(slide, 4.158, 1.785, 0, 4.221)

  const entries = experienceEntries(cv.experience)
  const runs: any[] = []

  // The source textbox begins with one empty paragraph before the first role.
  runs.push({ text: ' ', options: { breakLine: true, fontSize: 8 } })

  entries.forEach((entry, entryIndex) => {
    const title = [entry.title, entry.meta].filter(Boolean).join(' – ')
    runs.push({
      text: title,
      options: {
        fontSize: 9,
        bold: true,
        underline: { color: C.black },
        breakLine: true,
      },
    })
    runs.push({ text: ' ', options: { breakLine: true, fontSize: 8 } })

    const details = [...entry.bullets, ...(entry.tech ? [entry.tech] : [])].filter(Boolean)
    details.forEach((detail) => {
      runs.push({
        text: detail,
        options: {
          fontSize: 8,
          bullet: { indent: 9 },
          breakLine: true,
        },
      })
    })

    if (entryIndex < entries.length - 1) {
      runs.push({ text: ' ', options: { breakLine: true, fontSize: 8 } })
      runs.push({ text: ' ', options: { breakLine: true, fontSize: 8 } })
    }
  })

  slide.addText(runs, {
    x: 4.324,
    y: 1.885,
    w: 5.371,
    h: 3.299,
    fontFace: 'Arial',
    fontSize: 8,
    color: C.black,
    margin: [0.05, 0.1, 0.05, 0.1],
    fit: 'shrink',
    valign: 'top',
    paraSpaceBefore: 0,
    paraSpaceAfter: 0,
  })
}

const addCertifications = (slide: Slide, cv: Cv) => {
  addSectionBar(slide, 'Certifications & Trainings', 0.257, 0.4, 2.649, 'dark', {
    lineX: 0.347,
    lineY: 0.55,
    lineW: 0.625,
    prefixSpaces: 16,
  })

  const items = cv.certifications.map(certificationLine).filter(Boolean)
  const runs: any[] = [
    {
      text: 'Certifications',
      options: {
        fontSize: 9,
        bold: true,
        underline: { color: C.black },
        breakLine: true,
      },
    },
    { text: ' ', options: { breakLine: true, fontSize: 8 } },
  ]
  items.forEach((item, index) => {
    runs.push({
      text: item,
      options: {
        bullet: { indent: 13.5 },
        breakLine: index < items.length - 1,
      },
    })
  })

  slide.addText(runs, {
    x: 0.276,
    y: 0.78,
    w: 3.881,
    h: 1.666,
    fontFace: 'Arial',
    fontSize: 8,
    color: C.black,
    margin: [0.05, 0.1, 0.05, 0.1],
    fit: 'shrink',
    valign: 'top',
  })
}

const addLanguagesAndSkills = (slide: Slide, cv: Cv) => {
  addSectionBar(slide, 'Languages & Soft Skills', 4.153, 0.4, 2.649, 'blue', {
    lineX: 4.219,
    lineY: 0.548,
    lineW: 0.625,
    prefixSpaces: 16,
  })
  addDivider(slide, 4.158, 0.559, 0.009, 2.426)

  const languages = cv.languages.map((entry) => languageLine(entry.name, entry.level)).filter(Boolean)
  const softSkills = cv.softSkills.map((entry) => entry.name.trim()).filter(Boolean)
  const runs: any[] = [
    {
      text: 'Languages',
      options: {
        fontSize: 9,
        bold: true,
        underline: { color: C.black },
        breakLine: true,
      },
    },
    { text: ' ', options: { breakLine: true, fontSize: 8 } },
  ]

  languages.forEach((language) => {
    runs.push({
      text: language,
      options: { bullet: { indent: 13.5 }, breakLine: true },
    })
  })

  runs.push({ text: ' ', options: { breakLine: true, fontSize: 8 } })
  runs.push({
    text: 'Soft Skills',
    options: {
      fontSize: 9,
      bold: true,
      underline: { color: C.black },
      breakLine: true,
    },
  })
  runs.push({ text: ' ', options: { breakLine: true, fontSize: 8 } })
  if (softSkills.length) {
    runs.push({ text: softSkills.join(', '), options: { bullet: { indent: 13.5 } } })
  }

  slide.addText(runs, {
    x: 4.153,
    y: 0.734,
    w: 3.881,
    h: 2.118,
    fontFace: 'Arial',
    fontSize: 8,
    color: C.black,
    margin: 0.07,
    fit: 'shrink',
    valign: 'top',
  })
}

const addProjects = (slide: Slide, cv: Cv, hasTopColumns: boolean) => {
  const yLine = hasTopColumns ? 3.07 : 0.82
  const yBar = hasTopColumns ? 3.175 : 0.4
  addDivider(slide, 0.257, yLine, 9.438, 0)
  addSectionBar(slide, 'Personal Projects', 0.257, yBar, 2.487, 'blue', {
    lineX: 0.331,
    lineY: hasTopColumns ? 3.326 : yBar + 0.151,
    lineW: 0.625,
    prefixSpaces: 9,
  })

  const projects = projectEntries(cv.projects)
  const runs: any[] = []
  projects.forEach((project, index) => {
    const meta = project.meta ? ` — ${project.meta}` : ''
    runs.push({
      text: `${project.title}${meta}`,
      options: {
        bold: true,
        bullet: { indent: 13.5 },
        breakLine: true,
      },
    })
    const description = [project.description, project.tech].filter(Boolean).join(' ')
    if (description) {
      runs.push({ text: description, options: { breakLine: index < projects.length - 1 } })
    }
    if (index < projects.length - 1) {
      runs.push({ text: ' ', options: { breakLine: true } })
    }
  })

  slide.addText(runs, {
    x: 0.259,
    y: hasTopColumns ? 3.55 : 0.775,
    w: 9.418,
    h: hasTopColumns ? 2.12 : 4.96,
    fontFace: 'Arial',
    fontSize: 8,
    color: C.black,
    margin: [0.05, 0.1, 0.05, 0.1],
    fit: 'shrink',
    valign: 'top',
  })
}

export const downloadPptx = async (cv: Cv): Promise<void> => {
  try {
    const module = await import('pptxgenjs')
    const PptxGenJS = module.default
    const pptx = new PptxGenJS()

    pptx.defineLayout({ name: 'INFOSYS_CV_16_10', width: SLIDE_WIDTH, height: SLIDE_HEIGHT })
    pptx.layout = 'INFOSYS_CV_16_10'
    pptx.author = fullName(cv) || 'CV Builder'
    pptx.subject = 'CV export'
    pptx.title = fullName(cv) ? `${fullName(cv)} - short CV` : 'Short CV'
    pptx.company = 'Infosys'
    pptx.lang = 'en-US'
    pptx.theme = {
      headFontFace: 'Calibri',
      bodyFontFace: 'Arial',
      lang: 'en-US',
    }

    const present = presentSections(cv)
    const firstPage = pptx.addSlide()
    addMasterBackground(firstPage)
    await addHeader(firstPage, cv)
    addCard(firstPage, 0.266, 1.754, 9.533, 4.445)

    if (present.profile) addProfile(firstPage, cv)
    if (present.qualifications) addQualifications(firstPage, cv)
    if (present.expertise) addExpertise(firstPage, cv)
    if (present.experience) addExperience(firstPage, cv)

    if (hasSecondPageContent(cv)) {
      const secondPage = pptx.addSlide()
      addMasterBackground(secondPage)
      addCard(secondPage, 0.266, 0.528, 9.533, 5.594)

      const hasTopColumns = present.certifications || present.languages || present.softSkills
      if (present.certifications) addCertifications(secondPage, cv)
      if (present.languages || present.softSkills) addLanguagesAndSkills(secondPage, cv)
      if (present.projects) addProjects(secondPage, cv, hasTopColumns)
    }

    const slug = fullName(cv)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    await pptx.writeFile({ fileName: slug ? `${slug}-short-cv.pptx` : 'short-cv.pptx' })
  } catch (error: unknown) {
    console.error('downloadPptx error:', error)
    throw new Error(error instanceof Error ? error.message : 'The PPTX could not be generated.')
  }
}

export default downloadPptx
