import type { StepComponentProps } from '../steps'
import styles from './StepPlaceholder.module.css'

/**
 * Stands in for the real field UI until Phase 2. Each step swaps this out for its
 * own component; the step contract and validation wiring do not change.
 */
export default function StepPlaceholder({ step }: StepComponentProps) {
  return (
    <div className={styles.placeholder}>
      <p>Fields for this step arrive in Phase 2.</p>
      {step.fields.length > 0 && (
        <ul className={styles.fields}>
          {step.fields.map((field) => (
            <li key={field}>
              <code>{field}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
