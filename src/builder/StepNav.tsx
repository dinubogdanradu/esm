import styles from './StepNav.module.css'
import { STEPS } from './steps'

type StepNavProps = {
  currentIndex: number
  maxVisitedIndex: number
  onSelect: (index: number) => void
}

export default function StepNav({
  currentIndex,
  maxVisitedIndex,
  onSelect,
}: StepNavProps) {
  return (
    <nav aria-label="Form steps" className={styles.nav}>
      {STEPS.map((step, index) => {
        const isCurrent = index === currentIndex
        return (
          <button
            key={step.id}
            type="button"
            className={styles.item}
            aria-current={isCurrent ? 'step' : undefined}
            disabled={index > maxVisitedIndex}
            onClick={() => onSelect(index)}
          >
            <span className={styles.marker} aria-hidden="true">
              {index + 1}
            </span>
            {step.title}
          </button>
        )
      })}
    </nav>
  )
}
