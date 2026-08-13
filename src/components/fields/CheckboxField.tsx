import { useId } from 'react'
import { useController, type FieldPath } from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import styles from './fields.module.css'

type CheckboxFieldProps = {
  name: FieldPath<Cv>
  label: string
  onToggle?: (checked: boolean) => void
}

export default function CheckboxField({
  name,
  label,
  onToggle,
}: CheckboxFieldProps) {
  const { field } = useController<Cv>({ name })
  const id = useId()

  return (
    <div className={styles.checkboxField}>
      <input
        id={id}
        className={styles.checkbox}
        type="checkbox"
        checked={field.value === true}
        onChange={(event) => {
          field.onChange(event.target.checked)
          onToggle?.(event.target.checked)
        }}
        onBlur={field.onBlur}
        ref={field.ref}
      />
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
    </div>
  )
}
