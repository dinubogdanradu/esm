import RichTextField from '@/components/fields/RichTextField'
import styles from './steps.module.css'

export default function ProfileStep() {
  return (
    <div className={styles.stack}>
      <RichTextField
        name="profile.summary"
        label="Profile summary"
        required
        hint="Three or four sentences on what you do, your focus and what you are looking for."
      />
    </div>
  )
}
