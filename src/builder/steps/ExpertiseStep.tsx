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
  CONTAINER_GROUPS,
  SKILL_CONTAINERS,
  type SkillContainer,
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

      <div className={styles.nested}>
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
      </div>
    </>
  )
}

/** Level-1 and level-2 leaves: the user names each skill themselves. */
function OpenContainer({ groupIndex }: { groupIndex: number }) {
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

/**
 * Containers whose catalog entry has sub-items: the frameworks are the skills, so
 * they are checkboxes rather than free text, and checking one reveals its details.
 */
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
    <div className={styles.stack}>
      <CheckboxField name={`${path}.selected`} label={name} />
      {checked && (
        <div className={styles.nested}>
          <SkillAttributes path={path} />
        </div>
      )}
    </div>
  )
}

function PredefinedContainer({
  groupIndex,
  container,
  skills,
}: {
  groupIndex: number
  container: SkillContainer
  skills: Cv['expertise'][number]['skills']
}) {
  // There is no RepeatableSection here to surface an error sitting on the skills
  // array itself, such as "select at least one".
  const { errors } = useFormState<Cv>({ name: `expertise.${groupIndex}.skills` })
  const groupMessage = messageAtPath(errors, `expertise.${groupIndex}.skills`)

  return (
    <div className={styles.stack}>
      {container.options.map((option, skillIndex) => (
        <PredefinedSkill
          key={option}
          groupIndex={groupIndex}
          skillIndex={skillIndex}
          name={option}
          checked={skills[skillIndex]?.selected === true}
        />
      ))}
      {groupMessage && <p className={styles.error}>{groupMessage}</p>}
    </div>
  )
}

function ContainerFieldset({
  groupIndex,
  container,
  skills,
}: {
  groupIndex: number
  container: SkillContainer
  skills: Cv['expertise'][number]['skills']
}) {
  const heading =
    container.group === container.name
      ? container.name
      : `${container.group} — ${container.name}`

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{heading}</legend>
      {container.options.length > 0 ? (
        <PredefinedContainer
          groupIndex={groupIndex}
          container={container}
          skills={skills}
        />
      ) : (
        <OpenContainer groupIndex={groupIndex} />
      )}
    </fieldset>
  )
}

export default function ExpertiseStep() {
  const groups = useWatch<Cv>({ name: 'expertise' }) as Cv['expertise'] | undefined

  return (
    <div className={styles.stack}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Skill groups</legend>
        <p className={styles.fieldsetHint}>
          Check a group to fill in its skills. Unchecked groups are left off the CV
          but keep anything already entered.
        </p>

        {CONTAINER_GROUPS.map(({ group, containers }) => (
          <div key={group} className={styles.checkboxGroup}>
            {/* A level-1 leaf is its own container, so the heading would repeat. */}
            {!(containers.length === 1 && containers[0]?.name === group) && (
              <p className={styles.checkboxGroupTitle}>{group}</p>
            )}
            <div className={styles.checkboxGrid}>
              {containers.map((container) => (
                <CheckboxField
                  key={container.key}
                  name={`expertise.${SKILL_CONTAINERS.indexOf(container)}.selected`}
                  label={container.name}
                />
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      {SKILL_CONTAINERS.map((container, index) =>
        groups?.[index]?.selected ? (
          <ContainerFieldset
            key={container.key}
            groupIndex={index}
            container={container}
            skills={groups[index]?.skills ?? []}
          />
        ) : null,
      )}
    </div>
  )
}
