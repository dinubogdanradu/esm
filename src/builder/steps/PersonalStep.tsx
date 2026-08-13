import PhotoField from '@/components/fields/PhotoField'
import TextField from '@/components/fields/TextField'
import styles from './steps.module.css'

export default function PersonalStep() {
  return (
    <div className={styles.stack}>
      <div className={styles.grid}>
        <TextField name="personal.firstName" label="First name" required />
        <TextField name="personal.lastName" label="Last name" required />
      </div>

      <TextField
        name="personal.headline"
        label="Headline"
        required
        hint="The role this CV is aimed at, e.g. Senior Software Engineer"
      />

      <div className={styles.grid}>
        <TextField name="personal.email" label="Email" type="email" required />
        <TextField name="personal.phone" label="Phone" type="tel" />
      </div>

      <TextField
        name="personal.location"
        label="Location"
        hint="City and country is usually enough"
      />

      <div className={styles.grid}>
        <TextField name="personal.website" label="Website" type="url" />
        <TextField name="personal.linkedin" label="LinkedIn" type="url" />
      </div>

      <PhotoField name="personal.photo" label="Photo" />
    </div>
  )
}
