import {
  SKILL_LEVEL_LABELS,
  type Certification,
  type Cv,
  type Experience,
  type Project,
  type Qualification,
} from '@/schema/cv'
import { ancestorKeys, findEntry } from '@/schema/skillCatalog'
import {
  compactRichText,
  richTextIsEmpty,
  type RichText,
} from '@/schema/richText'

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
 * Rich text ready to render: blank runs and blocks removed, so a trailing empty
 * paragraph left by the editor never reaches the CV.
 */
export const renderableRichText = (value: RichText): RichText =>
  compactRichText(value)

export const qualificationLine = (entry: Qualification): string => {
  const degree = join([entry.degree, entry.field && `(${entry.field})`], ' ')
  const place = join([entry.institution, entry.location], ', ')
  const dates = formatDateRange(entry.startDate, entry.endDate)

  return join([degree, place, dates, entry.grade], ', ')
}

/**
 * Renders a total in months as "5y 6m", "5y" or "6m" — the input is one number, but
 * whole years read better than a raw month count on the CV.
 */
export const formatExperience = (totalMonths: number): string => {
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12

  return join([years > 0 ? `${years}y` : '', months > 0 ? `${months}m` : ''], ' ')
}

export type ExpertiseLine = {
  key: string
  label: string
  value: string
  /** Certification URLs across every skill in the group. */
  links: string[]
}

/**
 * Categories that reach the CV: checked, with every ancestor checked too, so
 * unchecking a parent hides its whole subtree without disturbing what is under it.
 */
export const activeExpertise = (cv: Cv): Cv['expertise'] => {
  const selectedByKey = new Map(
    cv.expertise.map((group) => [group.key, group.selected]),
  )

  return cv.expertise.filter(
    (group) =>
      group.selected &&
      findEntry(group.key) !== undefined &&
      ancestorKeys(group.key).every((key) => selectedByKey.get(key) === true),
  )
}

export const expertiseLines = (cv: Cv): ExpertiseLine[] =>
  activeExpertise(cv)
    .map((group) => {
      const skills = group.skills.filter(
        (skill) => skill.selected && isFilled(skill.name),
      )

      return {
        key: group.key,
        label: findEntry(group.key)?.name ?? group.key,
        value: skills
          .map((skill) => {
            const detail = join(
              [
                SKILL_LEVEL_LABELS[skill.level - 1],
                formatExperience(skill.experienceMonths),
                skill.lastUsed,
              ],
              ', ',
            )

            return detail === ''
              ? skill.name.trim()
              : `${skill.name.trim()} (${detail})`
          })
          .join('; '),
        links: skills.flatMap((skill) =>
          skill.certificationLinks
            .map((link) => link.url.trim())
            .filter(isFilled),
        ),
      }
    })
    .filter((line) => isFilled(line.value) || line.links.length > 0)

export type ExperienceEntry = {
  id: string
  title: string
  meta: string
  achievements: RichText
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
    achievements: renderableRichText(entry.achievements),
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
  description: RichText
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
    description: renderableRichText(project.description),
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
    profile: !richTextIsEmpty(cv.profile.summary),
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
