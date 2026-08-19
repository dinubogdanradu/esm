import { useFormContext, useWatch } from 'react-hook-form'
import RepeatableSection from '@/components/RepeatableSection'
import CheckboxField from '@/components/fields/CheckboxField'
import TagsField from '@/components/fields/TagsField'
import RichTextField from '@/components/fields/RichTextField'
import TextField from '@/components/fields/TextField'
import type { Cv } from '@/schema/cv'
import { blankExperience } from '@/schema/defaults'
import styles from './steps.module.css'

/**
 * Split into its own component so the `current` flag can be watched with hooks;
 * RepeatableSection renders its children through a callback.
 */
function ExperienceEntry({ index }: { index: number }) {
  const { setValue } = useFormContext<Cv>()
  const isCurrent = useWatch<Cv>({ name: `experience.${index}.current` }) === true

  return (
    <div className={styles.stack}>
      <div className={styles.grid}>
        <TextField name={`experience.${index}.company`} label="Company" required />
        <TextField
          name={`experience.${index}.position`}
          label="Position"
          required
        />
      </div>

      <TextField name={`experience.${index}.location`} label="Location" />

      <div className={styles.grid}>
        <TextField
          name={`experience.${index}.startDate`}
          label="Start"
          type="month"
          required
        />
        <TextField
          name={`experience.${index}.endDate`}
          label="End"
          type="month"
          disabled={isCurrent}
          hint={isCurrent ? 'Not needed for a current role' : undefined}
        />
      </div>

      <CheckboxField
        name={`experience.${index}.current`}
        label="I currently work here"
        onToggle={(checked) => {
          if (checked) {
            setValue(`experience.${index}.endDate`, '', {
              shouldValidate: true,
            })
          }
        }}
      />

      <RichTextField
        name={`experience.${index}.achievements`}
        label="Achievements"
        required
        hint="What changed because you were there, ideally with a number."
      />

      <TagsField
        name={`experience.${index}.tech`}
        label="Technologies"
        placeholder="React, Go, AWS"
      />
    </div>
  )
}

export default function ExperienceStep() {
  return (
    <RepeatableSection
      name="experience"
      itemNoun="Role"
      emptyMessage="No roles yet. Leave this empty to omit the section from your CV."
      makeItem={blankExperience}
    >
      {(index) => <ExperienceEntry index={index} />}
    </RepeatableSection>
  )
}
