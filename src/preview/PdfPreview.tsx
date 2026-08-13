import { useWatch } from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import styles from './PdfPreview.module.css'
import { usePdfBlobUrl } from './usePdfBlobUrl'

export default function PdfPreview() {
  // Subscribing here rather than in CvBuilder keeps keystroke re-renders local to
  // the preview.
  const cv = useWatch<Cv>() as Cv
  const { url, isRendering, error } = usePdfBlobUrl(cv)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>Preview</h2>
        <span className={styles.status} role="status">
          {isRendering ? 'Rendering…' : 'Up to date'}
        </span>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {url ? (
        <iframe className={styles.frame} src={url} title="CV preview" />
      ) : (
        <div className={styles.placeholder}>
          {error ? 'Preview unavailable' : 'Generating the first preview…'}
        </div>
      )}
    </div>
  )
}
