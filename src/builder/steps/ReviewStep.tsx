import { useState } from 'react'
import { useWatch } from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import { downloadPdf } from '@/preview/downloadPdf'
import { downloadPptx } from '@/preview/downloadPptx'
import styles from './steps.module.css'

const count = (total: number, singular: string, plural = `${singular}s`) =>
  `${total} ${total === 1 ? singular : plural}`

type SummaryRow = {
  label: string
  value: string
  incomplete?: boolean
}

export default function ReviewStep() {
  const cv = useWatch<Cv>() as Cv
  const [isPreparing, setIsPreparing] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const fullName = `${cv.personal.firstName} ${cv.personal.lastName}`.trim()
  // Every catalog group is always present in form state, so only checked ones count.
  const selectedGroups = cv.expertise.filter((group) => group.selected)
  const skillTotal = selectedGroups.reduce(
    (total, group) => total + group.skills.length,
    0,
  )

  const rows: SummaryRow[] = [
    {
      label: 'Personal details',
      value: fullName === '' ? 'Name missing' : fullName,
      incomplete: fullName === '' || cv.personal.email === '',
    },
    {
      label: 'Profile summary',
      value:
        cv.profile.summary.trim() === ''
          ? 'Not written yet'
          : count(cv.profile.summary.trim().split(/\s+/).length, 'word'),
      incomplete: cv.profile.summary.trim() === '',
    },
    {
      label: 'Qualifications',
      value: count(cv.qualifications.length, 'entry', 'entries'),
    },
    {
      label: 'Areas of expertise',
      value: `${count(selectedGroups.length, 'group')}, ${count(skillTotal, 'skill')}`,
    },
    { label: 'Experience summary', value: count(cv.experience.length, 'role') },
    {
      label: 'Certifications & Trainings',
      value: count(cv.certifications.length, 'certification'),
    },
    {
      label: 'Languages & Soft Skills',
      value: `${count(cv.languages.length, 'language')}, ${count(
        cv.softSkills.length,
        'soft skill',
      )}`,
    },
    { label: 'Projects', value: count(cv.projects.length, 'project') },
  ]

  return (
    <div className={styles.stack}>
      <ul className={styles.summaryList}>
        {rows.map((row) => (
          <li key={row.label} className={styles.summaryRow}>
            <span>{row.label}</span>
            <span
              className={`${styles.summaryValue} ${row.incomplete ? styles.incomplete : ''
                }`}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>

      <p className={styles.note}>
        Sections left empty are omitted from the PDF.
      </p>

      {failure && <p className={styles.error}>{failure}</p>}

      <button
        type="button"
        className={styles.download}
        disabled={isPreparing}
        onClick={() => {
          setIsPreparing(true)
          setFailure(null)
          void downloadPdf(cv)
            .catch(() => setFailure('The PDF could not be generated.'))
            .finally(() => setIsPreparing(false))
        }}
      >
        {isPreparing ? 'Preparing PDF…' : 'Download PDF'}
      </button>

      <button
        type="button"
        className={styles.download}
        disabled={isPreparing}
        onClick={() => {
          setIsPreparing(true)
          setFailure(null)
          void downloadPptx(cv)
            .catch(() => setFailure('The PPTX could not be generated.'))
            .finally(() => setIsPreparing(false))
        }}
      >
        {isPreparing ? 'Preparing PPTX…' : 'Download PPTX'}
      </button>
    </div>
  )
}
