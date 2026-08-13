import { useWatch } from 'react-hook-form'
import RepeatableSection from '@/components/RepeatableSection'
import CheckboxField from '@/components/fields/CheckboxField'
import SelectField, { type SelectOption } from '@/components/fields/SelectField'
import TextField from '@/components/fields/TextField'
import type { Cv } from '@/schema/cv'
import {
  SKILL_LEVEL_LABELS,
  SKILL_LEVEL_MAX,
  SKILL_LEVEL_MIN,
} from '@/schema/cv'
import { blankExpertiseGroup, blankSkill } from '@/schema/defaults'
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

function ExpertiseGroup({ index }: { index: number }) {
  const showLevel = useWatch<Cv>({ name: `expertise.${index}.showLevel` }) === true

  return (
    <div className={styles.stack}>
      <TextField
        name={`expertise.${index}.name`}
        label="Group name"
        required
        hint="e.g. Languages, Cloud & Infrastructure, Tooling"
      />

      <CheckboxField
        name={`expertise.${index}.showLevel`}
        label="Show proficiency for this group"
      />

      <div className={styles.nested}>
        <RepeatableSection
          name={`expertise.${index}.skills`}
          itemNoun="Skill"
          emptyMessage="No skills in this group yet."
          makeItem={blankSkill}
        >
          {(skillIndex) => (
            <div className={showLevel ? styles.grid : styles.stack}>
              <TextField
                name={`expertise.${index}.skills.${skillIndex}.name`}
                label="Skill"
                required
              />
              {showLevel && (
                <SelectField
                  name={`expertise.${index}.skills.${skillIndex}.level`}
                  label="Proficiency"
                  options={LEVEL_OPTIONS}
                  valueAsNumber
                />
              )}
            </div>
          )}
        </RepeatableSection>
      </div>
    </div>
  )
}

export default function ExpertiseStep() {
  return (
    <RepeatableSection
      name="expertise"
      itemNoun="Group"
      emptyMessage="No expertise groups yet. Leave this empty to omit the section from your CV."
      makeItem={blankExpertiseGroup}
    >
      {(index) => <ExpertiseGroup index={index} />}
    </RepeatableSection>
  )
}
