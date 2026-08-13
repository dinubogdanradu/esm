import type {
  Bullet,
  Certification,
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

export const blankSkill = (): Skill => ({
  id: newId(),
  name: '',
  level: DEFAULT_SKILL_LEVEL,
})

export const blankExpertiseGroup = (): ExpertiseGroup => ({
  id: newId(),
  name: '',
  showLevel: true,
  skills: [blankSkill()],
})

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
  expertise: [],
  experience: [],
  certifications: [],
  languages: [],
  softSkills: [],
  projects: [],
})
