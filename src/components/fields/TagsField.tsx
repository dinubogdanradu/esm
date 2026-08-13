import { useId, useState } from 'react'
import { useController, type FieldPath } from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import FieldFrame, { describedBy, useFieldIds } from './FieldFrame'
import styles from './fields.module.css'

type TagsFieldProps = {
  name: FieldPath<Cv>
  label: string
  hint?: string
  placeholder?: string
}

export default function TagsField({
  name,
  label,
  hint,
  placeholder,
}: TagsFieldProps) {
  const { field, fieldState } = useController<Cv>({ name })
  const ids = useFieldIds(useId())
  const [draft, setDraft] = useState('')
  const error = fieldState.error?.message

  const tags = Array.isArray(field.value)
    ? field.value.filter((tag): tag is string => typeof tag === 'string')
    : []

  const commit = () => {
    const value = draft.trim()
    if (value === '' || tags.includes(value)) {
      setDraft('')
      return
    }
    field.onChange([...tags, value])
    setDraft('')
  }

  const removeAt = (index: number) => {
    field.onChange(tags.filter((_, position) => position !== index))
  }

  return (
    <FieldFrame
      {...ids}
      label={label}
      error={error}
      hint={hint ?? 'Press Enter or comma to add'}
    >
      <input
        id={ids.inputId}
        className={styles.control}
        type="text"
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            // Enter would otherwise submit the surrounding form.
            event.preventDefault()
            commit()
            return
          }
          if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
            removeAt(tags.length - 1)
          }
        }}
        onBlur={() => {
          commit()
          field.onBlur()
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, error, hint ?? 'hint')}
      />
      {tags.length > 0 && (
        <ul className={styles.tagList}>
          {tags.map((tag, index) => (
            <li key={tag} className={styles.tag}>
              {tag}
              <button
                type="button"
                className={styles.tagRemove}
                aria-label={`Remove ${tag}`}
                onClick={() => removeAt(index)}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </FieldFrame>
  )
}
