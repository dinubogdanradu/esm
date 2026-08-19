import { z } from 'zod'
import { ancestorKeys, findEntry, isKnownEntry } from './skillCatalog'
import { richTextIsEmpty, richTextSchema } from './richText'

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

/** Experience is a single total in months; 720 is sixty years. */
export const SKILL_MAX_MONTHS = 720

// Optional fields are empty strings rather than undefined so every text input
// stays controlled. "Absent" is therefore '' throughout, and the PDF template
// treats empty as omitted.
const text = z.string()

const filled = (message: string) =>
  z.string().refine((value) => value.trim().length > 0, { message })

/** Rich text carrying at least one non-blank run. */
const filledRichText = (message: string) =>
  richTextSchema.refine((value) => !richTextIsEmpty(value), { message })

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
  summary: filledRichText('Profile summary is required'),
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
  experienceMonths: z.number().int().min(0).max(SKILL_MAX_MONTHS),
  lastUsed: z.union([z.literal(''), z.enum(LAST_USED_VALUES)]),
  certificationLinks: z.array(certificationLinkSchema),
})

const isUrl = (value: string): boolean => z.url().safeParse(value).success

/** One entry per selectable catalog node (see skillCatalog.ts). */
export const expertiseGroupSchema = z.object({
  key: z.string().refine(isKnownEntry, 'Unknown skill group'),
  selected: z.boolean(),
  skills: z.array(skillSchema),
})

/**
 * Requirements live on the array rather than on each entry because they depend on
 * neighbours: whether a group's children are checked, and whether an entry's parent
 * is checked at all. Unchecking anything leaves its data intact for later without
 * failing validation in the meantime, which a field-level `required` cannot express.
 */
export const expertiseSchema = z
  .array(expertiseGroupSchema)
  .superRefine((entries, ctx) => {
    const selectedByKey = new Map(
      entries.map((entry) => [entry.key, entry.selected]),
    )

    entries.forEach((entry, index) => {
      if (!entry.selected) return

      const catalogEntry = findEntry(entry.key)
      if (!catalogEntry) return

      // A hidden section must not block the step, so an entry with any unchecked
      // ancestor is left alone.
      const reachable = ancestorKeys(entry.key).every(
        (key) => selectedByKey.get(key) === true,
      )
      if (!reachable) return

      // A category is satisfied by either a checked skill of its own or a checked
      // sub-category, since it may hold both.
      const hasCheckedSkill = entry.skills.some((skill) => skill.selected)
      const hasCheckedChild = catalogEntry.childKeys.some(
        (childKey) => selectedByKey.get(childKey) === true,
      )

      if (!hasCheckedSkill && !hasCheckedChild) {
        ctx.addIssue({
          code: 'custom',
          message: 'Select or add at least one skill, or uncheck this group',
          path: [index, catalogEntry.childKeys.length > 0 ? 'selected' : 'skills'],
        })
        return
      }

      entry.skills.forEach((skill, skillIndex) => {
        if (!skill.selected) return

        if (skill.name.trim() === '') {
          ctx.addIssue({
            code: 'custom',
            message: 'Skill name is required',
            path: [index, 'skills', skillIndex, 'name'],
          })
        }

        if (skill.lastUsed === '') {
          ctx.addIssue({
            code: 'custom',
            message: 'Select when you last used this skill',
            path: [index, 'skills', skillIndex, 'lastUsed'],
          })
        }

        skill.certificationLinks.forEach((link, linkIndex) => {
          if (link.url.trim() === '') {
            ctx.addIssue({
              code: 'custom',
              message: 'Enter a URL or remove this row',
              path: [index, 'skills', skillIndex, 'certificationLinks', linkIndex, 'url'],
            })
            return
          }

          if (!isUrl(link.url.trim())) {
            ctx.addIssue({
              code: 'custom',
              message: 'Enter a valid URL',
              path: [index, 'skills', skillIndex, 'certificationLinks', linkIndex, 'url'],
            })
          }
        })
      })
    })
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
    achievements: filledRichText('Add at least one achievement'),
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
  description: richTextSchema,
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
  expertise: expertiseSchema,
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
export type Certification = z.infer<typeof certificationSchema>
export type Language = z.infer<typeof languageSchema>
export type SoftSkill = z.infer<typeof softSkillSchema>
export type Project = z.infer<typeof projectSchema>
