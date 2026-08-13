import { useEffect } from 'react'
import { useWatch, type Control } from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import { saveDraft } from './draft'

const AUTOSAVE_DELAY_MS = 500

/**
 * Mirrors form state into localStorage. useWatch returns a fresh object on every
 * keystroke, so the write is debounced and the pending timeout is cleared on each
 * change rather than queueing one write per character.
 */
export const useDraftPersistence = (control: Control<Cv>): void => {
  const values = useWatch({ control }) as Cv

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      saveDraft(values)
    }, AUTOSAVE_DELAY_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [values])
}
