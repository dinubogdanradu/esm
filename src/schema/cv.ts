import { z } from 'zod'
import { isKnownContainer } from './skillCatalog'

export const LANGUAGE_LEVELS = [
  'Native',
  'Fluent',
  'Professional',
  'Conversational',
  'Basic',
] as const

export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number]

export const SKILL_LEVEL_MIN = 1
export const SKILL_LEVEL_MAX = 5

/** Index 0 is level 1. Shared by the form select and the PDF template. */
export const SKILL_LEVEL_LABELS = [
  'Familiar',
  'Working knowledge',
  'Proficient',
  'Advanced',
  'Expert',
] as const

/** Stored as display text, matching how LANGUAGE_LEVELS works. */
export const LAST_USED_VALUES = [
  'Within last month',
  'Within last year',
  'More than a year ago',
] as const

export type LastUsed = (typeof LAST_USED_VALUES)[number]

/**
 * Experience is a duration pair: whole years plus a remainder in months, so months
 * is capped at 11 rather than being an independent total.
 */
export const SKILL_MAX_YEARS = 60
export const SKILL_MAX_MONTHS = 11

// Optional fields are empty strings rather than undefined so every text input
// stays controlled. "Absent" is therefore '' throughout, and the PDF template
// treats empty as omitted.
const text = z.string()

const filled = (message: string) =>
  z.string().refine((value) => value.trim().length > 0, { message })

const MONTH_YEAR = /^\d{4}-(?:0[1-9]|1[0-2])$/

const monthYear = z.string().regex(MONTH_YEAR, 'Use the month picker')
const optionalMonthYear = z.union([z.literal(''), monthYear])

const optionalUrl = z.union([z.literal(''), z.url('Enter a valid URL')])

export const personalSchema = z.object({
  firstName: filled('First name is required'),
  lastName: filled('Last name is required'),
  headline: filled('Headline is required'),
  location: text,
  email: z.email('Enter a valid email address'),
  phone: text,
  website: optionalUrl,
  linkedin: optionalUrl,
  photo: text,
})

export const profileSchema = z.object({
  summary: filled('Profile summary is required'),
})

export const qualificationSchema = z.object({
  id: z.string(),
  institution: filled('Institution is required'),
  degree: filled('Degree is required'),
  field: text,
  location: text,
  startDate: optionalMonthYear,
  endDate: optionalMonthYear,
  grade: text,
})

export const certificationLinkSchema = z.object({
  id: z.string(),
  // Format is checked in the group refinement rather than here, so an unchecked
  // group holding half-typed data cannot block the step.
  url: text,
})

export const skillSchema = z.object({
  id: z.string(),
  /** Typed by the user in an open container; fixed from the catalog otherwise. */
  name: text,
  /**
   * Whether this skill reaches the CV. Predefined skills exist in form state for
   * every catalog option and are toggled by checkbox; user-added ones are created
   * already selected.
   */
  selected: z.boolean(),
  level: z.number().int().min(SKILL_LEVEL_MIN).max(SKILL_LEVEL_MAX),
  experienceYears: z.number().int().min(0).max(SKILL_MAX_YEARS),
  experienceMonths: z.number().int().min(0).max(SKILL_MAX_MONTHS),
  lastUsed: z.union([z.literal(''), z.enum(LAST_USED_VALUES)]),
  certificationLinks: z.array(certificationLinkSchema),
})

const isUrl = (value: string): boolean => z.url().safeParse(value).success

/**
 * One entry per catalog container (see skillCatalog.ts). Membership is a checkbox,
 * so requirements apply only to checked containers and their checked skills:
 * unchecking leaves data intact for when it is checked again, without failing
 * validation in the meantime.
 */
export const expertiseGroupSchema = z
  .object({
    key: z.string().refine(isKnownContainer, 'Unknown skill group'),
    selected: z.boolean(),
    skills: z.array(skillSchema),
  })
  .superRefine((group, ctx) => {
    if (!group.selected) return

    if (!group.skills.some((skill) => skill.selected)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Select or add at least one skill, or uncheck this group',
        path: ['skills'],
      })
      return
    }

    group.skills.forEach((skill, index) => {
      if (!skill.selected) return

      if (skill.name.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          message: 'Skill name is required',
          path: ['skills', index, 'name'],
        })
      }

      if (skill.lastUsed === '') {
        ctx.addIssue({
          code: 'custom',
          message: 'Select when you last used this skill',
          path: ['skills', index, 'lastUsed'],
        })
      }

      skill.certificationLinks.forEach((link, linkIndex) => {
        if (link.url.trim() === '') {
          ctx.addIssue({
            code: 'custom',
            message: 'Enter a URL or remove this row',
            path: ['skills', index, 'certificationLinks', linkIndex, 'url'],
          })
          return
        }

        if (!isUrl(link.url.trim())) {
          ctx.addIssue({
            code: 'custom',
            message: 'Enter a valid URL',
            path: ['skills', index, 'certificationLinks', linkIndex, 'url'],
          })
        }
      })
    })
  })

export const bulletSchema = z.object({
  id: z.string(),
  text: filled('Bullet cannot be empty'),
})

export const experienceSchema = z
  .object({
    id: z.string(),
    company: filled('Company is required'),
    position: filled('Position is required'),
    location: text,
    startDate: monthYear,
    endDate: optionalMonthYear,
    current: z.boolean(),
    bullets: z.array(bulletSchema).min(1, 'Add at least one bullet'),
    tech: z.array(z.string()),
  })
  .refine((entry) => entry.current || entry.endDate !== '', {
    message: 'End date is required unless this is your current role',
    path: ['endDate'],
  })

export const certificationSchema = z.object({
  id: z.string(),
  name: filled('Certification name is required'),
  issuer: text,
  date: optionalMonthYear,
  expiryDate: optionalMonthYear,
  credentialUrl: optionalUrl,
})

export const languageSchema = z.object({
  id: z.string(),
  name: filled('Language is required'),
  level: z.enum(LANGUAGE_LEVELS),
})

export const softSkillSchema = z.object({
  id: z.string(),
  name: filled('Soft skill is required'),
})

export const projectSchema = z.object({
  id: z.string(),
  name: filled('Project name is required'),
  role: text,
  description: text,
  tech: z.array(z.string()),
  url: optionalUrl,
  startDate: optionalMonthYear,
  endDate: optionalMonthYear,
})

// Every repeatable section may be empty: an unused section is omitted from the
// PDF rather than being mandatory. Items that do exist must be complete.
export const cvSchema = z.object({
  personal: personalSchema,
  profile: profileSchema,
  qualifications: z.array(qualificationSchema),
  expertise: z.array(expertiseGroupSchema),
  experience: z.array(experienceSchema),
  certifications: z.array(certificationSchema),
  languages: z.array(languageSchema),
  softSkills: z.array(softSkillSchema),
  projects: z.array(projectSchema),
})

export type Cv = z.infer<typeof cvSchema>
export type Personal = z.infer<typeof personalSchema>
export type Qualification = z.infer<typeof qualificationSchema>
export type ExpertiseGroup = z.infer<typeof expertiseGroupSchema>
export type Skill = z.infer<typeof skillSchema>
export type CertificationLink = z.infer<typeof certificationLinkSchema>
export type Experience = z.infer<typeof experienceSchema>
export type Bullet = z.infer<typeof bulletSchema>
export type Certification = z.infer<typeof certificationSchema>
export type Language = z.infer<typeof languageSchema>
export type SoftSkill = z.infer<typeof softSkillSchema>
export type Project = z.infer<typeof projectSchema>
