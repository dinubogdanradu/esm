import type { ReactNode } from 'react'
import {
  useFieldArray,
  useFormState,
  type FieldArray,
  type FieldArrayPath,
} from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import { messageAtPath } from './fieldErrors'
import styles from './RepeatableSection.module.css'

type RepeatableSectionProps<TName extends FieldArrayPath<Cv>> = {
  name: TName
  /** Singular noun used in item headings and button labels. */
  itemNoun: string
  emptyMessage: string
  makeItem: () => FieldArray<Cv, TName>
  /** Renders the fields for one item, given its array index. */
  children: (index: number) => ReactNode
}

export default function RepeatableSection<TName extends FieldArrayPath<Cv>>({
  name,
  itemNoun,
  emptyMessage,
  makeItem,
  children,
}: RepeatableSectionProps<TName>) {
  const { fields, append, remove, move } = useFieldArray<Cv, TName>({ name })
  const { errors } = useFormState<Cv>({ name })

  // A message on the array itself (rather than on an item) covers rules such as
  // "add at least one". Resolved by path so nested arrays work too.
  const arrayMessage = messageAtPath(errors, name)

  return (
    <div className={styles.section}>
      {fields.length === 0 && <p className={styles.empty}>{emptyMessage}</p>}

      {fields.map((item, index) => (
        <div key={item.id} className={styles.item}>
          <div className={styles.itemHeader}>
            <span className={styles.itemTitle}>
              {itemNoun} {index + 1}
            </span>
            <div className={styles.itemActions}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Move ${itemNoun.toLowerCase()} ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
              >
                &uarr;
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Move ${itemNoun.toLowerCase()} ${index + 1} down`}
                disabled={index === fields.length - 1}
                onClick={() => move(index, index + 1)}
              >
                &darr;
              </button>
              <button
                type="button"
                className={`${styles.iconButton} ${styles.removeButton}`}
                aria-label={`Remove ${itemNoun.toLowerCase()} ${index + 1}`}
                onClick={() => remove(index)}
              >
                &times;
              </button>
            </div>
          </div>
          {children(index)}
        </div>
      ))}

      {arrayMessage && <p className={styles.error}>{arrayMessage}</p>}

      <button
        type="button"
        className={styles.addButton}
        onClick={() => append(makeItem())}
      >
        + Add {itemNoun.toLowerCase()}
      </button>
    </div>
  )
}
