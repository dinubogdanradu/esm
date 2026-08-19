import RepeatableSection from '@/components/RepeatableSection'
import TagsField from '@/components/fields/TagsField'
import RichTextField from '@/components/fields/RichTextField'
import TextField from '@/components/fields/TextField'
import { blankProject } from '@/schema/defaults'
import styles from './steps.module.css'

export default function ProjectsStep() {
  return (
    <RepeatableSection
      name="projects"
      itemNoun="Project"
      emptyMessage="No projects yet. Leave this empty to omit the section from your CV."
      makeItem={blankProject}
    >
      {(index) => (
        <div className={styles.stack}>
          <div className={styles.grid}>
            <TextField name={`projects.${index}.name`} label="Name" required />
            <TextField name={`projects.${index}.role`} label="Your role" />
          </div>

          <RichTextField
            name={`projects.${index}.description`}
            label="Description"
          />

          <TagsField
            name={`projects.${index}.tech`}
            label="Technologies"
            placeholder="TypeScript, Postgres"
          />

          <TextField name={`projects.${index}.url`} label="URL" type="url" />

          <div className={styles.grid}>
            <TextField
              name={`projects.${index}.startDate`}
              label="Start"
              type="month"
            />
            <TextField
              name={`projects.${index}.endDate`}
              label="End"
              type="month"
            />
          </div>
        </div>
      )}
    </RepeatableSection>
  )
}
