import { useId } from 'react'
import { useController, type FieldPath } from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import FieldFrame, { describedBy, useFieldIds } from './FieldFrame'
import styles from './fields.module.css'

type TextAreaFieldProps = {
  name: FieldPath<Cv>
  label: string
  required?: boolean
  hint?: string
  placeholder?: string
  rows?: number
}

export default function TextAreaField({
  name,
  label,
  required,
  hint,
  placeholder,
  rows,
}: TextAreaFieldProps) {
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
      <textarea
        id={ids.inputId}
        className={`${styles.control} ${styles.textarea}`}
        rows={rows}
        placeholder={placeholder}
        value={typeof field.value === 'string' ? field.value : ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        ref={field.ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, error, hint)}
      />
    </FieldFrame>
  )
}
