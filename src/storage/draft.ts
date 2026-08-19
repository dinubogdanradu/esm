import {
  LANGUAGE_LEVELS,
  LAST_USED_VALUES,
  SKILL_LEVEL_MAX,
  SKILL_LEVEL_MIN,
  SKILL_MAX_MONTHS,
  type Certification,
  type CertificationLink,
  type Cv,
  type LastUsed,
  type Experience,
  type ExpertiseGroup,
  type Language,
  type LanguageLevel,
  type Project,
  type Qualification,
  type Skill,
  type SoftSkill,
} from '@/schema/cv'
import {
  DEFAULT_LANGUAGE_LEVEL,
  DEFAULT_SKILL_LEVEL,
  defaultCv,
  newId,
  predefinedSkill,
} from '@/schema/defaults'
import { EXPERTISE_ENTRIES } from '@/schema/skillCatalog'
import {
  emptyRichText,
  richTextFromPlain,
  richTextSchema,
  type RichBlock,
  type RichText,
} from '@/schema/richText'

// Bump when a shape change makes older drafts unreadable; stale keys are ignored
// rather than migrated. v5 introduced the "!" leaf marker in skills.md, which moved
// leaves out of the entry list and into their parent's skills, changing stored keys.
export const DRAFT_KEY = 'cv-builder:draft:v5'

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const asText = (value: unknown): string => (typeof value === 'string' ? value : '')

const asBool = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback

const asId = (value: unknown): string =>
  typeof value === 'string' && value.length > 0 ? value : newId()

const asTextArray = (value: unknown): string[] =>
  asArray(value).filter((item): item is string => typeof item === 'string')

const asSkillLevel = (value: unknown): number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= SKILL_LEVEL_MIN &&
  value <= SKILL_LEVEL_MAX
    ? value
    : DEFAULT_SKILL_LEVEL

const asCount = (value: unknown, max: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max
    ? value
    : 0

/**
 * Experience used to be a years/months pair. A stored years value is folded into the
 * single total rather than dropped.
 */
const toExperienceMonths = (item: Record<string, unknown>): number => {
  const months = asCount(item.experienceMonths, SKILL_MAX_MONTHS)
  const years = asCount(item.experienceYears, SKILL_MAX_MONTHS)

  return Math.min(months + years * 12, SKILL_MAX_MONTHS)
}

const asLastUsed = (value: unknown): LastUsed | '' =>
  LAST_USED_VALUES.includes(value as LastUsed) ? (value as LastUsed) : ''

const asLanguageLevel = (value: unknown): LanguageLevel =>
  LANGUAGE_LEVELS.includes(value as LanguageLevel)
    ? (value as LanguageLevel)
    : DEFAULT_LANGUAGE_LEVEL

const toQualification = (raw: unknown): Qualification => {
  const item = asRecord(raw)
  return {
    id: asId(item.id),
    institution: asText(item.institution),
    degree: asText(item.degree),
    field: asText(item.field),
    location: asText(item.location),
    startDate: asText(item.startDate),
    endDate: asText(item.endDate),
    grade: asText(item.grade),
  }
}

const toCertificationLink = (raw: unknown): CertificationLink => {
  const item = asRecord(raw)
  return {
    id: asId(item.id),
    url: asText(item.url),
  }
}

const toSkill = (raw: unknown, defaultSelected: boolean): Skill => {
  const item = asRecord(raw)
  return {
    id: asId(item.id),
    name: asText(item.name),
    selected: asBool(item.selected, defaultSelected),
    level: asSkillLevel(item.level),
    experienceMonths: toExperienceMonths(item),
    lastUsed: asLastUsed(item.lastUsed),
    certificationLinks: asArray(item.certificationLinks).map(toCertificationLink),
  }
}

/**
 * Rebuilds the catalog from skills.md rather than trusting stored keys, so editing
 * that file resolves cleanly: entries it no longer lists are dropped and new ones
 * appear empty. Predefined options are rebuilt from the catalog and matched to
 * stored skills by name, so a renamed framework loses only its own attributes.
 */
const toExpertiseGroups = (raw: unknown): ExpertiseGroup[] => {
  const stored = asArray(raw).map(asRecord)

  return EXPERTISE_ENTRIES.map((entry) => {
    const match = stored.find((group) => group.key === entry.key)
    const storedSkills = asArray(match?.skills).map(asRecord)

    const skills =
      entry.options.length > 0
        ? entry.options.map((option) => {
            const found = storedSkills.find((skill) => skill.name === option)
            return found
              ? { ...toSkill(found, false), name: option }
              : predefinedSkill(option)
          })
        : entry.open
          ? storedSkills.map((skill) => toSkill(skill, true))
          : []

    return {
      key: entry.key,
      selected: asBool(match?.selected, false),
      skills,
    }
  })
}

/**
 * Rich text, with two older shapes migrated rather than discarded: a plain string
 * (before the editor) and an array of bullet objects (before that). Anything else
 * falls back to an empty document.
 */
const asRichText = (
  value: unknown,
  fallbackBlock: RichBlock['type'] = 'bullet',
): RichText => {
  if (typeof value === 'string') return richTextFromPlain(value, fallbackBlock)

  const parsed = richTextSchema.safeParse(value)
  return parsed.success ? parsed.data : emptyRichText()
}

const toAchievements = (item: Record<string, unknown>): RichText => {
  if ('achievements' in item) return asRichText(item.achievements)

  // Older still: one object per bullet.
  const bullets = asArray(item.bullets)
    .map((bullet) => asText(asRecord(bullet).text).trim())
    .filter((text) => text !== '')

  return richTextFromPlain(bullets.join('\n'))
}

const toExperience = (raw: unknown): Experience => {
  const item = asRecord(raw)
  return {
    id: asId(item.id),
    company: asText(item.company),
    position: asText(item.position),
    location: asText(item.location),
    startDate: asText(item.startDate),
    endDate: asText(item.endDate),
    current: asBool(item.current),
    achievements: toAchievements(item),
    tech: asTextArray(item.tech),
  }
}

const toCertification = (raw: unknown): Certification => {
  const item = asRecord(raw)
  return {
    id: asId(item.id),
    name: asText(item.name),
    issuer: asText(item.issuer),
    date: asText(item.date),
    expiryDate: asText(item.expiryDate),
    credentialUrl: asText(item.credentialUrl),
  }
}

const toLanguage = (raw: unknown): Language => {
  const item = asRecord(raw)
  return {
    id: asId(item.id),
    name: asText(item.name),
    level: asLanguageLevel(item.level),
  }
}

const toSoftSkill = (raw: unknown): SoftSkill => {
  const item = asRecord(raw)
  return {
    id: asId(item.id),
    name: asText(item.name),
  }
}

const toProject = (raw: unknown): Project => {
  const item = asRecord(raw)
  return {
    id: asId(item.id),
    name: asText(item.name),
    role: asText(item.role),
    description: asRichText(item.description, 'paragraph'),
    tech: asTextArray(item.tech),
    url: asText(item.url),
    startDate: asText(item.startDate),
    endDate: asText(item.endDate),
  }
}

/**
 * Rebuilds a complete Cv from arbitrary stored JSON. Missing keys fall back to
 * defaults, wrong types are replaced and unknown keys are dropped, so a draft
 * written by an older build can never leak undefined into a controlled input.
 */
export const normalizeDraft = (raw: unknown): Cv => {
  const base = defaultCv()
  const stored = asRecord(raw)
  const personal = asRecord(stored.personal)
  const profile = asRecord(stored.profile)

  return {
    personal: {
      firstName: asText(personal.firstName),
      lastName: asText(personal.lastName),
      headline: asText(personal.headline),
      location: asText(personal.location),
      email: asText(personal.email),
      phone: asText(personal.phone),
      website: asText(personal.website),
      linkedin: asText(personal.linkedin),
      photo: asText(personal.photo),
    },
    profile: {
      summary: asRichText(profile.summary),
    },
    qualifications: 'qualifications' in stored
      ? asArray(stored.qualifications).map(toQualification)
      : base.qualifications,
    expertise: toExpertiseGroups(stored.expertise),
    experience: 'experience' in stored
      ? asArray(stored.experience).map(toExperience)
      : base.experience,
    certifications: 'certifications' in stored
      ? asArray(stored.certifications).map(toCertification)
      : base.certifications,
    languages: 'languages' in stored
      ? asArray(stored.languages).map(toLanguage)
      : base.languages,
    softSkills: 'softSkills' in stored
      ? asArray(stored.softSkills).map(toSoftSkill)
      : base.softSkills,
    projects: 'projects' in stored
      ? asArray(stored.projects).map(toProject)
      : base.projects,
  }
}

export const loadDraft = (): Cv | null => {
  let serialized: string | null = null
  try {
    serialized = window.localStorage.getItem(DRAFT_KEY)
  } catch {
    // Storage can be unavailable (private browsing, blocked cookies).
    return null
  }

  if (serialized === null) return null

  try {
    return normalizeDraft(JSON.parse(serialized))
  } catch {
    return null
  }
}

export const saveDraft = (values: Cv): void => {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(values))
  } catch {
    // A failed autosave must not interrupt editing.
  }
}

export const clearDraft = (): void => {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Nothing actionable.
  }
}
