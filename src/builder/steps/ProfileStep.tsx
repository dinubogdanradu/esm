import TextAreaField from '@/components/fields/TextAreaField'
import styles from './steps.module.css'

export default function ProfileStep() {
  return (
    <div className={styles.stack}>
      <TextAreaField
        name="profile.summary"
        label="Profile summary"
        required
        rows={10}
        hint="Three or four sentences on what you do, your focus and what you are looking for."
      />
    </div>
  )
}
