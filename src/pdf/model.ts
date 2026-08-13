import {
  SKILL_LEVEL_LABELS,
  type Certification,
  type Cv,
  type Experience,
  type Project,
  type Qualification,
} from '@/schema/cv'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const isFilled = (value: string): boolean => value.trim() !== ''

const join = (parts: (string | undefined)[], separator: string): string =>
  parts.filter((part): part is string => !!part && isFilled(part)).join(separator)

export const formatMonthYear = (value: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return ''

  const [, year, month] = match
  const label = MONTHS[Number(month) - 1]
  return label && year ? `${label} ${year}` : ''
}

export const formatDateRange = (
  startDate: string,
  endDate: string,
  current = false,
): string => {
  const start = formatMonthYear(startDate)
  const end = current ? 'Present' : formatMonthYear(endDate)

  if (start && end) return `${start} – ${end}`
  return start || end
}

/**
 * The form collects the summary as free text but the template renders bullets, so
 * each non-empty line becomes one bullet. A single-line summary yields one bullet,
 * which reads as a paragraph.
 */
export const profileBullets = (summary: string): string[] =>
  summary
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(isFilled)

export const qualificationLine = (entry: Qualification): string => {
  const degree = join([entry.degree, entry.field && `(${entry.field})`], ' ')
  const place = join([entry.institution, entry.location], ', ')
  const dates = formatDateRange(entry.startDate, entry.endDate)

  return join([degree, place, dates, entry.grade], ', ')
}

export type ExpertiseLine = {
  id: string
  label: string
  value: string
}

export const expertiseLines = (cv: Cv): ExpertiseLine[] =>
  cv.expertise
    .map((group) => ({
      id: group.id,
      label: group.name.trim(),
      value: group.skills
        .filter((skill) => isFilled(skill.name))
        .map((skill) =>
          group.showLevel
            ? `${skill.name.trim()} (${SKILL_LEVEL_LABELS[skill.level - 1] ?? ''})`.replace(
                ' ()',
                '',
              )
            : skill.name.trim(),
        )
        .join(', '),
    }))
    .filter((line) => isFilled(line.label) || isFilled(line.value))

export type ExperienceEntry = {
  id: string
  title: string
  meta: string
  bullets: string[]
  tech: string
}

export const experienceEntries = (entries: Experience[]): ExperienceEntry[] =>
  entries.map((entry) => ({
    id: entry.id,
    title: join([entry.position, entry.company], ' – '),
    meta: join(
      [entry.location, formatDateRange(entry.startDate, entry.endDate, entry.current)],
      ' | ',
    ),
    bullets: entry.bullets.map((bullet) => bullet.text.trim()).filter(isFilled),
    tech: entry.tech.filter(isFilled).join(', '),
  }))

export const certificationLine = (entry: Certification): string => {
  const dates = entry.expiryDate
    ? formatDateRange(entry.date, entry.expiryDate)
    : formatMonthYear(entry.date)

  return join([entry.name, entry.issuer, dates], ' – ')
}

export const languageLine = (name: string, level: string): string =>
  join([name, level], ' – ')

export type ProjectEntry = {
  id: string
  title: string
  meta: string
  description: string
  tech: string
}

export const projectEntries = (projects: Project[]): ProjectEntry[] =>
  projects.map((project) => ({
    id: project.id,
    title: project.name.trim(),
    meta: join(
      [project.role, formatDateRange(project.startDate, project.endDate), project.url],
      ' | ',
    ),
    description: project.description.trim(),
    tech: project.tech.filter(isFilled).join(', '),
  }))

export const contactLines = (cv: Cv): string[] =>
  [
    cv.personal.email,
    cv.personal.phone,
    cv.personal.location,
    cv.personal.website,
    cv.personal.linkedin,
  ]
    .map((value) => value.trim())
    .filter(isFilled)

export const fullName = (cv: Cv): string =>
  join([cv.personal.firstName, cv.personal.lastName], ' ')

/**
 * Which sections have anything to show. An empty section is omitted entirely
 * rather than printing a heading with nothing under it.
 */
export const presentSections = (cv: Cv) => {
  const softSkills = cv.softSkills
    .map((skill) => skill.name.trim())
    .filter(isFilled)
  const languages = cv.languages.filter((language) => isFilled(language.name))

  return {
    profile: profileBullets(cv.profile.summary).length > 0,
    qualifications: cv.qualifications.some((entry) =>
      isFilled(qualificationLine(entry)),
    ),
    expertise: expertiseLines(cv).length > 0,
    experience: cv.experience.some((entry) => isFilled(entry.company) || isFilled(entry.position)),
    certifications: cv.certifications.some((entry) =>
      isFilled(certificationLine(entry)),
    ),
    languages: languages.length > 0,
    softSkills: softSkills.length > 0,
    projects: cv.projects.some((project) => isFilled(project.name)),
  }
}

export const hasSecondPageContent = (cv: Cv): boolean => {
  const present = presentSections(cv)
  return (
    present.certifications ||
    present.languages ||
    present.softSkills ||
    present.projects
  )
}

export const documentFileName = (cv: Cv): string => {
  const name = fullName(cv)
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return slug === '' ? 'cv.pdf' : `${slug}-cv.pdf`
}
