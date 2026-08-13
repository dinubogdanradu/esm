import { useId, useState } from 'react'
import { useController, type FieldPath } from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import { downscaleDataUrl, fileToDataUrl } from '@/utils/image'
import FieldFrame, { useFieldIds } from './FieldFrame'
import styles from './PhotoField.module.css'
import fieldStyles from './fields.module.css'

type PhotoFieldProps = {
  name: FieldPath<Cv>
  label: string
}

export default function PhotoField({ name, label }: PhotoFieldProps) {
  const { field } = useController<Cv>({ name })
  const ids = useFieldIds(useId())
  const [failure, setFailure] = useState<string | undefined>(undefined)

  const photo = typeof field.value === 'string' ? field.value : ''

  const handleFile = async (file: File | undefined) => {
    if (!file) return

    try {
      const raw = await fileToDataUrl(file)
      field.onChange(await downscaleDataUrl(raw))
      setFailure(undefined)
    } catch {
      setFailure('That image could not be read. Try a different file.')
    }
  }

  return (
    <FieldFrame
      {...ids}
      label={label}
      error={failure}
      hint="Optional. Large images are scaled down before saving."
    >
      <div className={styles.row}>
        {photo !== '' && (
          <img className={styles.preview} src={photo} alt="Selected CV photo" />
        )}
        <div className={styles.controls}>
          <input
            id={ids.inputId}
            className={fieldStyles.control}
            type="file"
            accept="image/*"
            onChange={(event) => {
              void handleFile(event.target.files?.[0])
            }}
          />
          {photo !== '' && (
            <button
              type="button"
              className={styles.remove}
              onClick={() => field.onChange('')}
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
    </FieldFrame>
  )
}
