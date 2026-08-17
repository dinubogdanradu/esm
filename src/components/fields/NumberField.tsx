import { useId } from 'react'
import { useController, type FieldPath } from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import FieldFrame, { describedBy, useFieldIds } from './FieldFrame'
import styles from './fields.module.css'

type NumberFieldProps = {
  name: FieldPath<Cv>
  label: string
  min?: number
  max?: number
  required?: boolean
  hint?: string
}

export default function NumberField({
  name,
  label,
  min = 0,
  max,
  required,
  hint,
}: NumberFieldProps) {
  const { field, fieldState } = useController<Cv>({ name })
  const ids = useFieldIds(useId())
  const error = fieldState.error?.message

  return (
    <FieldFrame
      {...ids}
      label={label}
      required={required}
      error={error}
      hint={hint}
    >
      <input
        id={ids.inputId}
        className={styles.control}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={typeof field.value === 'number' ? String(field.value) : ''}
        // Clearing the box stores 0 rather than undefined, keeping the field
        // controlled and the schema free of optional numbers.
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10)
          field.onChange(Number.isNaN(parsed) ? 0 : parsed)
        }}
        onBlur={field.onBlur}
        ref={field.ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, error, hint)}
      />
    </FieldFrame>
  )
}
