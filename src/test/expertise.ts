import type { Cv, Skill } from '@/schema/cv'
import { EXPERTISE_ENTRIES, ancestorKeys, findEntry } from '@/schema/skillCatalog'

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

  // Ancestors too: a nested category only reaches the CV when its whole chain is
  // checked, and forgetting that is the easiest way to write a fixture that renders
  // nothing.
  for (const chainKey of [...ancestorKeys(key), key]) {
    const entry = cv.expertise.find((candidate) => candidate.key === chainKey)
    if (entry) entry.selected = true
  }

  if (skills) group.skills = skills
}

/**
 * Catalog-derived picks, so fixtures keep working when skills.md is edited.
 * `rated` has leaf skills to tick; `open` takes user-named ones.
 */
export const ratedEntry = () => {
  const entry = EXPERTISE_ENTRIES.find((candidate) => candidate.options.length > 0)
  if (!entry) throw new Error('skills.md has no category with leaf skills')
  return entry
}

export const openEntry = () => {
  const entry = EXPERTISE_ENTRIES.find((candidate) => candidate.open)
  if (!entry) throw new Error('skills.md has no open category')
  return entry
}

/**
 * Ticks one of a category's seeded leaf skills and sets its attributes. Use this for
 * categories whose skills come from skills.md; pass a `skills` array to `selectEntry`
 * instead for open categories, where the user names them.
 */
export const selectSkill = (
  cv: Cv,
  key: string,
  name: string,
  overrides: Partial<Skill> = {},
): void => {
  selectEntry(cv, key)

  const group = cv.expertise.find((entry) => entry.key === key)
  const skill = group?.skills.find((candidate) => candidate.name === name)
  if (!skill) {
    throw new Error(`"${name}" is not a leaf skill of "${key}" in skills.md`)
  }

  Object.assign(skill, { selected: true, ...overrides })
}
