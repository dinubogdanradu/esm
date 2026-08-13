import { useEffect, useRef, useState } from 'react'
import type { Cv } from '@/schema/cv'

const RENDER_DEBOUNCE_MS = 500

type PdfBlobState = {
  url: string | null
  isRendering: boolean
  error: string | null
}

/**
 * Renders the CV to a blob URL, debounced against typing. The previous URL stays
 * live until the next render succeeds so the preview never blanks mid-edit, and
 * each superseded URL is revoked to avoid leaking blobs.
 */
export const usePdfBlobUrl = (cv: Cv): PdfBlobState => {
  const [state, setState] = useState<PdfBlobState>({
    url: null,
    isRendering: true,
    error: null,
  })
  const currentUrl = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setState((previous) => ({ ...previous, isRendering: true }))

    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const [{ pdf }, { default: CvDocument }] = await Promise.all([
            import('@react-pdf/renderer'),
            import('@/pdf/CvDocument'),
          ])

          const blob = await pdf(<CvDocument cv={cv} />).toBlob()
          if (cancelled) return

          const nextUrl = URL.createObjectURL(blob)
          if (currentUrl.current) URL.revokeObjectURL(currentUrl.current)
          currentUrl.current = nextUrl

          setState({ url: nextUrl, isRendering: false, error: null })
        } catch (cause) {
          if (cancelled) return
          setState((previous) => ({
            ...previous,
            isRendering: false,
            error:
              cause instanceof Error
                ? cause.message
                : 'The preview could not be generated.',
          }))
        }
      })()
    }, RENDER_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [cv])

  useEffect(
    () => () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current)
    },
    [],
  )

  return state
}
