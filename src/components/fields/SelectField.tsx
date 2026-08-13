import { useId } from 'react'
import { useController, type FieldPath } from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import FieldFrame, { describedBy, useFieldIds } from './FieldFrame'
import styles from './fields.module.css'

export type SelectOption = {
  value: string
  label: string
}

type SelectFieldProps = {
  name: FieldPath<Cv>
  label: string
  options: readonly SelectOption[]
  required?: boolean
  hint?: string
  /** Stores the selection as a number, for numeric fields such as skill level. */
  valueAsNumber?: boolean
}

export default function SelectField({
  name,
  label,
  options,
  required,
  hint,
  valueAsNumber,
}: SelectFieldProps) {
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
      <select
        id={ids.inputId}
        className={styles.control}
        value={
          typeof field.value === 'string' || typeof field.value === 'number'
            ? String(field.value)
            : ''
        }
        onChange={(event) => {
          field.onChange(
            valueAsNumber ? Number(event.target.value) : event.target.value,
          )
        }}
        onBlur={field.onBlur}
        ref={field.ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, error, hint)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  )
}
