import RepeatableSection from '@/components/RepeatableSection'
import SelectField, { type SelectOption } from '@/components/fields/SelectField'
import TextField from '@/components/fields/TextField'
import { LANGUAGE_LEVELS } from '@/schema/cv'
import { blankLanguage, blankSoftSkill } from '@/schema/defaults'
import styles from './steps.module.css'

const LEVEL_OPTIONS: SelectOption[] = LANGUAGE_LEVELS.map((level) => ({
  value: level,
  label: level,
}))

export default function LanguagesStep() {
  return (
    <div className={styles.stack}>
      <section className={styles.subsection}>
        <h3 className={styles.subheading}>Languages</h3>
        <RepeatableSection
          name="languages"
          itemNoun="Language"
          emptyMessage="No languages yet."
          makeItem={blankLanguage}
        >
          {(index) => (
            <div className={styles.grid}>
              <TextField
                name={`languages.${index}.name`}
                label="Language"
                required
              />
              <SelectField
                name={`languages.${index}.level`}
                label="Proficiency"
                options={LEVEL_OPTIONS}
                required
              />
            </div>
          )}
        </RepeatableSection>
      </section>

      <section className={styles.subsection}>
        <h3 className={styles.subheading}>Soft skills</h3>
        <RepeatableSection
          name="softSkills"
          itemNoun="Soft skill"
          emptyMessage="No soft skills yet."
          makeItem={blankSoftSkill}
        >
          {(index) => (
            <TextField
              name={`softSkills.${index}.name`}
              label="Soft skill"
              required
              hint="e.g. Mentoring, Stakeholder management"
            />
          )}
        </RepeatableSection>
      </section>
    </div>
  )
}
