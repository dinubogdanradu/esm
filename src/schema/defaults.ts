import { EXPERTISE_ENTRIES } from './skillCatalog'
import type {
  Bullet,
  Certification,
  CertificationLink,
  Cv,
  ExpertiseGroup,
  Experience,
  Language,
  LanguageLevel,
  Project,
  Qualification,
  Skill,
  SoftSkill,
} from './cv'

export const DEFAULT_LANGUAGE_LEVEL: LanguageLevel = 'Professional'
export const DEFAULT_SKILL_LEVEL = 3

export const newId = (): string => crypto.randomUUID()

export const blankQualification = (): Qualification => ({
  id: newId(),
  institution: '',
  degree: '',
  field: '',
  location: '',
  startDate: '',
  endDate: '',
  grade: '',
})

export const blankCertificationLink = (): CertificationLink => ({
  id: newId(),
  url: '',
})

/** A skill the user adds by hand, which is on the CV as soon as it exists. */
export const blankSkill = (): Skill => ({
  id: newId(),
  name: '',
  selected: true,
  level: DEFAULT_SKILL_LEVEL,
  experienceYears: 0,
  experienceMonths: 0,
  // Left unset rather than defaulted: any default would assert something about the
  // user's recency that may be false.
  lastUsed: '',
  certificationLinks: [],
})

/** A catalog option, present in form state but off the CV until checked. */
export const predefinedSkill = (name: string): Skill => ({
  ...blankSkill(),
  name,
  selected: false,
})

/**
 * Every selectable catalog node always exists in form state, in catalog order, so
 * `expertise[i]` lines up with `EXPERTISE_ENTRIES[i]`. `selected` decides what
 * appears on the CV. Nodes with predefined options are seeded with one skill per
 * option so unchecking one keeps whatever was typed for it.
 */
export const defaultExpertiseGroups = (): ExpertiseGroup[] =>
  EXPERTISE_ENTRIES.map((entry) => ({
    key: entry.key,
    selected: false,
    skills: entry.options.map(predefinedSkill),
  }))

export const blankBullet = (): Bullet => ({
  id: newId(),
  text: '',
})

export const blankExperience = (): Experience => ({
  id: newId(),
  company: '',
  position: '',
  location: '',
  startDate: '',
  endDate: '',
  current: false,
  bullets: [blankBullet()],
  tech: [],
})

export const blankCertification = (): Certification => ({
  id: newId(),
  name: '',
  issuer: '',
  date: '',
  expiryDate: '',
  credentialUrl: '',
})

export const blankLanguage = (): Language => ({
  id: newId(),
  name: '',
  level: DEFAULT_LANGUAGE_LEVEL,
})

export const blankSoftSkill = (): SoftSkill => ({
  id: newId(),
  name: '',
})

export const blankProject = (): Project => ({
  id: newId(),
  name: '',
  role: '',
  description: '',
  tech: [],
  url: '',
  startDate: '',
  endDate: '',
})

// Repeatable sections start empty so that leaving a section out is the default
// and requires no action. Adding a row is what commits the user to filling it.
export const defaultCv = (): Cv => ({
  personal: {
    firstName: '',
    lastName: '',
    headline: '',
    location: '',
    email: '',
    phone: '',
    website: '',
    linkedin: '',
    photo: '',
  },
  profile: {
    summary: '',
  },
  qualifications: [],
  expertise: defaultExpertiseGroups(),
  experience: [],
  certifications: [],
  languages: [],
  softSkills: [],
  projects: [],
})
