import type { ReactNode } from 'react'
import styles from './fields.module.css'

export type FieldFrameProps = {
  inputId: string
  errorId: string
  hintId: string
  label: string
  required?: boolean
  error?: string | undefined
  hint?: string | undefined
  children: ReactNode
}

export default function FieldFrame({
  inputId,
  errorId,
  hintId,
  label,
  required,
  error,
  hint,
  children,
}: FieldFrameProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}

/** Shared id plumbing so every control wires aria-describedby the same way. */
export const useFieldIds = (baseId: string) => ({
  inputId: baseId,
  errorId: `${baseId}-error`,
  hintId: `${baseId}-hint`,
})

export const describedBy = (
  ids: { errorId: string; hintId: string },
  error: string | undefined,
  hint: string | undefined,
): string | undefined => {
  if (error) return ids.errorId
  if (hint) return ids.hintId
  return undefined
}
