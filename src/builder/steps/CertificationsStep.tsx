import RepeatableSection from '@/components/RepeatableSection'
import TextField from '@/components/fields/TextField'
import { blankCertification } from '@/schema/defaults'
import styles from './steps.module.css'

export default function CertificationsStep() {
  return (
    <RepeatableSection
      name="certifications"
      itemNoun="Certification"
      emptyMessage="No certifications yet. Leave this empty to omit the section from your CV."
      makeItem={blankCertification}
    >
      {(index) => (
        <div className={styles.stack}>
          <div className={styles.grid}>
            <TextField
              name={`certifications.${index}.name`}
              label="Name"
              required
            />
            <TextField name={`certifications.${index}.issuer`} label="Issuer" />
          </div>

          <div className={styles.grid}>
            <TextField
              name={`certifications.${index}.date`}
              label="Issued"
              type="month"
            />
            <TextField
              name={`certifications.${index}.expiryDate`}
              label="Expires"
              type="month"
              hint="Leave empty if it does not expire"
            />
          </div>

          <TextField
            name={`certifications.${index}.credentialUrl`}
            label="Credential URL"
            type="url"
          />
        </div>
      )}
    </RepeatableSection>
  )
}
