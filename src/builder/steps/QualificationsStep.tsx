import RepeatableSection from '@/components/RepeatableSection'
import TextField from '@/components/fields/TextField'
import { blankQualification } from '@/schema/defaults'
import styles from './steps.module.css'

export default function QualificationsStep() {
  return (
    <RepeatableSection
      name="qualifications"
      itemNoun="Qualification"
      emptyMessage="No qualifications yet. Leave this empty to omit the section from your CV."
      makeItem={blankQualification}
    >
      {(index) => (
        <div className={styles.stack}>
          <div className={styles.grid}>
            <TextField
              name={`qualifications.${index}.institution`}
              label="Institution"
              required
            />
            <TextField
              name={`qualifications.${index}.degree`}
              label="Degree"
              required
            />
          </div>

          <div className={styles.grid}>
            <TextField
              name={`qualifications.${index}.field`}
              label="Field of study"
            />
            <TextField name={`qualifications.${index}.location`} label="Location" />
          </div>

          <div className={styles.grid}>
            <TextField
              name={`qualifications.${index}.startDate`}
              label="Start"
              type="month"
            />
            <TextField
              name={`qualifications.${index}.endDate`}
              label="End"
              type="month"
            />
          </div>

          <TextField
            name={`qualifications.${index}.grade`}
            label="Grade"
            hint="Optional, e.g. First Class or 1.3"
          />
        </div>
      )}
    </RepeatableSection>
  )
}
