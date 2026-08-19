import { useFormState, useWatch } from 'react-hook-form'
import RepeatableSection from '@/components/RepeatableSection'
import { messageAtPath } from '@/components/fieldErrors'
import CheckboxField from '@/components/fields/CheckboxField'
import NumberField from '@/components/fields/NumberField'
import SelectField, { type SelectOption } from '@/components/fields/SelectField'
import TextField from '@/components/fields/TextField'
import {
  LAST_USED_VALUES,
  SKILL_LEVEL_LABELS,
  SKILL_LEVEL_MAX,
  SKILL_LEVEL_MIN,
  SKILL_MAX_MONTHS,
  type Cv,
} from '@/schema/cv'
import { blankCertificationLink, blankSkill } from '@/schema/defaults'
import {
  TOP_LEVEL_ENTRIES,
  entryIndex,
  findEntry,
  type CatalogEntry,
} from '@/schema/skillCatalog'
import styles from './steps.module.css'

const LEVEL_OPTIONS: SelectOption[] = Array.from(
  { length: SKILL_LEVEL_MAX - SKILL_LEVEL_MIN + 1 },
  (_, offset) => {
    const level = SKILL_LEVEL_MIN + offset
    return {
      value: String(level),
      label: `${level} - ${SKILL_LEVEL_LABELS[offset] ?? ''}`.trim(),
    }
  },
)

const LAST_USED_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select…' },
  ...LAST_USED_VALUES.map((value) => ({ value, label: value })),
]

/**
 * Kept as a template literal type rather than `string` so react-hook-form can still
 * resolve the nested field paths built from it.
 */
type SkillPath = `expertise.${number}.skills.${number}`

/** The attributes collected for one skill, shared by both container kinds. */
function SkillAttributes({ path }: { path: SkillPath }) {
  return (
    <>
      <div className={styles.grid}>
        <SelectField
          name={`${path}.level`}
          label="Proficiency"
          options={LEVEL_OPTIONS}
          required
          valueAsNumber
        />
        <SelectField
          name={`${path}.lastUsed`}
          label="Last used"
          options={LAST_USED_OPTIONS}
          required
        />
      </div>

      <NumberField
        name={`${path}.experienceMonths`}
        label="Experience (in months)"
        max={SKILL_MAX_MONTHS}
      />

      <RepeatableSection
        name={`${path}.certificationLinks`}
        itemNoun="Certification link"
        emptyMessage="No certification links for this skill."
        makeItem={blankCertificationLink}
      >
        {(linkIndex) => (
          <TextField
            name={`${path}.certificationLinks.${linkIndex}.url`}
            label="Certification URL"
            type="url"
            required
          />
        )}
      </RepeatableSection>
    </>
  )
}

/** A node with no sub-items: the user names each skill themselves. */
function OpenSkills({ groupIndex }: { groupIndex: number }) {
  return (
    <RepeatableSection
      name={`expertise.${groupIndex}.skills`}
      itemNoun="Skill"
      emptyMessage="Add at least one skill, or uncheck this group."
      makeItem={blankSkill}
    >
      {(skillIndex) => (
        <div className={styles.stack}>
          <TextField
            name={`expertise.${groupIndex}.skills.${skillIndex}.name`}
            label="Skill"
            required
          />
          <SkillAttributes
            path={`expertise.${groupIndex}.skills.${skillIndex}`}
          />
        </div>
      )}
    </RepeatableSection>
  )
}

/** A framework from the catalog: a checkbox that opens its own attributes. */
function PredefinedSkill({
  groupIndex,
  skillIndex,
  name,
  checked,
}: {
  groupIndex: number
  skillIndex: number
  name: string
  checked: boolean
}) {
  const path: SkillPath = `expertise.${groupIndex}.skills.${skillIndex}`

  return (
    <div className={styles.node}>
      <CheckboxField name={`${path}.selected`} label={name} />
      {checked && (
        <div className={styles.nodeBody} role="group" aria-label={name}>
          <SkillAttributes path={path} />
        </div>
      )}
    </div>
  )
}

/**
 * One line of the tree: a checkbox, and when checked, its contents indented directly
 * beneath it. A category renders its children in file order, so leaf skills and
 * nested categories interleave exactly as skills.md lists them. A category with no
 * children at all lets the user name its own skills.
 */
function EntryNode({
  entry,
  groups,
}: {
  entry: CatalogEntry
  groups: Cv['expertise']
}) {
  const index = entryIndex(entry.key)
  const { errors } = useFormState<Cv>({ name: `expertise.${index}` })
  const selected = groups[index]?.selected === true
  const skills = groups[index]?.skills ?? []

  // The "select at least one" error lands on `selected` when the category has
  // sub-categories and on `skills` otherwise. An open category already shows the
  // latter through its RepeatableSection, so claiming it here would duplicate it.
  const message =
    messageAtPath(errors, `expertise.${index}.selected`) ??
    (entry.open ? undefined : messageAtPath(errors, `expertise.${index}.skills`))

  return (
    <div className={styles.node}>
      <CheckboxField name={`expertise.${index}.selected`} label={entry.name} />

      {selected && (
        // aria-label rather than a fieldset legend: the checkbox already names this
        // level, so a legend would repeat it.
        <div className={styles.nodeBody} role="group" aria-label={entry.name}>
          {entry.items.map((item) =>
            item.kind === 'skill' ? (
              <PredefinedSkill
                key={`skill:${item.name}`}
                groupIndex={index}
                skillIndex={entry.options.indexOf(item.name)}
                name={item.name}
                checked={
                  skills[entry.options.indexOf(item.name)]?.selected === true
                }
              />
            ) : (
              <ChildNode key={item.key} childKey={item.key} groups={groups} />
            ),
          )}

          {entry.open && <OpenSkills groupIndex={index} />}

          {message && <p className={styles.error}>{message}</p>}
        </div>
      )}
    </div>
  )
}

/** Resolves a child key to its catalog entry, keeping EntryNode's recursion simple. */
function ChildNode({
  childKey,
  groups,
}: {
  childKey: string
  groups: Cv['expertise']
}) {
  const entry = findEntry(childKey)
  if (!entry) return null

  return <EntryNode entry={entry} groups={groups} />
}

export default function ExpertiseStep() {
  const groups = (useWatch<Cv>({ name: 'expertise' }) ?? []) as Cv['expertise']

  return (
    <div className={styles.stack}>
      <p className={styles.hint}>
        Check a group to fill it in. Unchecked groups are left off the CV but keep
        anything already entered.
      </p>

      <div className={styles.tree}>
        {TOP_LEVEL_ENTRIES.map((entry) => (
          <EntryNode key={entry.key} entry={entry} groups={groups} />
        ))}
      </div>
    </div>
  )
}
