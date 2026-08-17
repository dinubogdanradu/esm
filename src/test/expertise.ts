import type { Cv, Skill } from '@/schema/cv'
import { findEntry } from '@/schema/skillCatalog'

/**
 * Checks a catalog entry in a fixture and optionally sets its skills. Remember that
 * a technology only reaches the CV when its parent group is checked too, so select
 * both. Throws on an unknown key so a typo fails loudly rather than silently
 * producing an empty section.
 */
export const selectEntry = (cv: Cv, key: string, skills?: Skill[]): void => {
  if (!findEntry(key)) {
    throw new Error(`"${key}" is not a skills.md catalog entry`)
  }

  const group = cv.expertise.find((entry) => entry.key === key)
  if (!group) {
    throw new Error(`"${key}" is missing from the CV's expertise list`)
  }

  group.selected = true
  if (skills) group.skills = skills
}
