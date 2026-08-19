import { Suspense, lazy, useId } from 'react'
import { useController, type FieldPath } from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import { emptyRichText, type RichText } from '@/schema/richText'
import FieldFrame, { describedBy, useFieldIds } from './FieldFrame'
import styles from './RichTextField.module.css'

// ProseMirror is heavy and only three steps use it, so it loads on demand.
const RichTextEditor = lazy(() => import('./RichTextEditor'))

type RichTextFieldProps = {
  name: FieldPath<Cv>
  label: string
  required?: boolean
  hint?: string
}

export default function RichTextField({
  name,
  label,
  required,
  hint,
}: RichTextFieldProps) {
  const { field, fieldState } = useController<Cv>({ name })
  const ids = useFieldIds(useId())
  const error = fieldState.error?.message

  const value = (
    typeof field.value === 'object' && field.value !== null && 'blocks' in field.value
      ? field.value
      : emptyRichText()
  ) as RichText

  return (
    <FieldFrame
      {...ids}
      label={label}
      required={required}
      error={error}
      hint={hint}
    >
      <div
        className={styles.wrapper}
        data-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(ids, error, hint)}
      >
        <Suspense fallback={<div className={styles.loading}>Loading editor…</div>}>
          <RichTextEditor
            value={value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            label={label}
            inputId={ids.inputId}
            invalid={error !== undefined}
          />
        </Suspense>
      </div>
    </FieldFrame>
  )
}
