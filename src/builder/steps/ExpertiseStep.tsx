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
  SKILL_MAX_YEARS,
  type Cv,
} from '@/schema/cv'
import { blankCertificationLink, blankSkill } from '@/schema/defaults'
import {
  TOP_LEVEL_ENTRIES,
  childEntries,
  entryIndex,
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

      <div className={styles.grid}>
        <NumberField
          name={`${path}.experienceYears`}
          label="Experience (years)"
          max={SKILL_MAX_YEARS}
        />
        <NumberField
          name={`${path}.experienceMonths`}
          label="Experience (months)"
          max={SKILL_MAX_MONTHS}
          hint={`Remainder beyond whole years, 0-${SKILL_MAX_MONTHS}`}
        />
      </div>

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
 * A node whose sub-items are frameworks: those are the skills, so they are
 * checkboxes rather than free text.
 */
function PredefinedSkills({
  groupIndex,
  options,
  skills,
}: {
  groupIndex: number
  options: string[]
  skills: Cv['expertise'][number]['skills']
}) {
  // No RepeatableSection here to surface an error sitting on the skills array
  // itself, such as "select at least one".
  const { errors } = useFormState<Cv>({ name: `expertise.${groupIndex}.skills` })
  const message = messageAtPath(errors, `expertise.${groupIndex}.skills`)

  return (
    <>
      {options.map((option, skillIndex) => (
        <PredefinedSkill
          key={option}
          groupIndex={groupIndex}
          skillIndex={skillIndex}
          name={option}
          checked={skills[skillIndex]?.selected === true}
        />
      ))}
      {message && <p className={styles.error}>{message}</p>}
    </>
  )
}

function SkillsFor({
  entry,
  groups,
}: {
  entry: CatalogEntry
  groups: Cv['expertise']
}) {
  const index = entryIndex(entry.key)

  return entry.options.length > 0 ? (
    <PredefinedSkills
      groupIndex={index}
      options={entry.options}
      skills={groups[index]?.skills ?? []}
    />
  ) : (
    <OpenSkills groupIndex={index} />
  )
}

/**
 * One line of the tree: a checkbox, and when it is checked, its contents indented
 * directly beneath it. A node with sub-items lists those as further checkboxes; a
 * node without holds skills.
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
  const children = childEntries(entry)
  const message = messageAtPath(errors, `expertise.${index}.selected`)

  return (
    <div className={styles.node}>
      <CheckboxField
        name={`expertise.${index}.selected`}
        label={entry.name}
      />

      {selected && (
        // aria-label rather than a fieldset legend: the checkbox already names this
        // level, so a legend would repeat it.
        <div className={styles.nodeBody} role="group" aria-label={entry.name}>
          {children.length > 0 ? (
            <>
              {children.map((child) => (
                <EntryNode key={child.key} entry={child} groups={groups} />
              ))}
              {message && <p className={styles.error}>{message}</p>}
            </>
          ) : (
            <SkillsFor entry={entry} groups={groups} />
          )}
        </div>
      )}
    </div>
  )
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
