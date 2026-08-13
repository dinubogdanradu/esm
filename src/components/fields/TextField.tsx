import { useId } from 'react'
import { useController, type FieldPath } from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import FieldFrame, { describedBy, useFieldIds } from './FieldFrame'
import styles from './fields.module.css'

type TextFieldProps = {
  name: FieldPath<Cv>
  label: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'month'
  required?: boolean
  hint?: string
  placeholder?: string
  disabled?: boolean
}

export default function TextField({
  name,
  label,
  type = 'text',
  required,
  hint,
  placeholder,
  disabled,
}: TextFieldProps) {
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
        type={type}
        placeholder={placeholder}
        disabled={disabled}
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
