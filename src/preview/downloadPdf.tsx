import type { Cv } from '@/schema/cv'
import { documentFileName } from '@/pdf/model'

/**
 * Regenerates the document on demand rather than reusing the preview blob, so the
 * download always matches current form state even if the preview is mid-render.
 * The module is imported dynamically to keep react-pdf out of the initial bundle.
 */
export const downloadPdf = async (cv: Cv): Promise<void> => {
  const [{ pdf }, { default: CvDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/pdf/CvDocument'),
  ])

  const blob = await pdf(<CvDocument cv={cv} />).toBlob()
  const url = URL.createObjectURL(blob)

  try {
    const link = document.createElement('a')
    link.href = url
    link.download = documentFileName(cv)
    document.body.append(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
