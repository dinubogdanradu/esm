import {
  LANGUAGE_LEVELS,
  SKILL_LEVEL_MAX,
  SKILL_LEVEL_MIN,
  type Bullet,
  type Certification,
  type Cv,
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
} from '@/schema/defaults'

// Bump when a shape change makes older drafts unreadable; stale keys are ignored
// rather than migrated.
export const DRAFT_KEY = 'cv-builder:draft:v1'

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const asText = (value: unknown): string => (typeof value === 'string' ? value : '')

const asBool = (value: unknown): boolean => (typeof value === 'boolean' ? value : false)

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

const toSkill = (raw: unknown): Skill => {
  const item = asRecord(raw)
  return {
    id: asId(item.id),
    name: asText(item.name),
    level: asSkillLevel(item.level),
  }
}

const toExpertiseGroup = (raw: unknown): ExpertiseGroup => {
  const item = asRecord(raw)
  return {
    id: asId(item.id),
    name: asText(item.name),
    showLevel: asBool(item.showLevel),
    skills: asArray(item.skills).map(toSkill),
  }
}

const toBullet = (raw: unknown): Bullet => {
  const item = asRecord(raw)
  return {
    id: asId(item.id),
    text: asText(item.text),
  }
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
    bullets: asArray(item.bullets).map(toBullet),
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
    description: asText(item.description),
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
      summary: asText(profile.summary),
    },
    qualifications: 'qualifications' in stored
      ? asArray(stored.qualifications).map(toQualification)
      : base.qualifications,
    expertise: 'expertise' in stored
      ? asArray(stored.expertise).map(toExpertiseGroup)
      : base.expertise,
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
