import { Suspense, lazy, useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { cvSchema, type Cv } from '@/schema/cv'
import { defaultCv } from '@/schema/defaults'
import { loadDraft } from '@/storage/draft'
import { useDraftPersistence } from '@/storage/useDraftPersistence'
import StepNav from './StepNav'
import styles from './CvBuilder.module.css'
import { FIRST_STEP_ID, STEPS, findStepIndex } from './steps'

// react-pdf is a large dependency; loading it separately lets the form paint first.
const PdfPreview = lazy(() => import('@/preview/PdfPreview'))

export default function CvBuilder() {
  const { stepId } = useParams<{ stepId: string }>()
  const navigate = useNavigate()
  const currentIndex = findStepIndex(stepId)

  const [initialValues] = useState(() => loadDraft() ?? defaultCv())
  const form = useForm<Cv>({
    resolver: zodResolver(cvSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  useDraftPersistence(form.control)

  // A deep link is treated as already reached, so a returning user can land
  // straight on a later step. Gating here is UX, not a trust boundary.
  const [maxVisitedIndex, setMaxVisitedIndex] = useState(() =>
    Math.max(currentIndex, 0),
  )
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    setMaxVisitedIndex((reached) => Math.max(reached, currentIndex))
    setBlocked(false)
  }, [currentIndex])

  if (currentIndex === -1) {
    return <Navigate to={`/build/${FIRST_STEP_ID}`} replace />
  }

  const step = STEPS[currentIndex]
  if (!step) {
    return <Navigate to={`/build/${FIRST_STEP_ID}`} replace />
  }

  const goToIndex = (index: number) => {
    const target = STEPS[index]
    if (!target) return
    navigate(`/build/${target.id}`)
  }

  const goNext = async () => {
    const isValid =
      step.validate.length === 0 ||
      (await form.trigger(step.validate, { shouldFocus: true }))

    if (!isValid) {
      setBlocked(true)
      return
    }

    goToIndex(currentIndex + 1)
  }

  const isLastStep = currentIndex === STEPS.length - 1
  const { Component } = step

  return (
    <FormProvider {...form}>
      <div className={styles.shell}>
        <section className={styles.pane}>
          <h1 className={styles.brand}>
            <span className={styles.accent}>CV</span> Builder
          </h1>

          <StepNav
            currentIndex={currentIndex}
            maxVisitedIndex={maxVisitedIndex}
            onSelect={goToIndex}
          />

          <header className={styles.stepHeader}>
            <h2 className={styles.stepTitle}>{step.title}</h2>
            <span className={styles.stepCount}>
              Step {currentIndex + 1} of {STEPS.length}
            </span>
          </header>

          <div className={styles.body}>
            <Component />
          </div>

          {blocked && (
            <p role="alert" className={styles.alert}>
              Fix the highlighted fields before continuing.
            </p>
          )}

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.button}
              disabled={currentIndex === 0}
              onClick={() => goToIndex(currentIndex - 1)}
            >
              Back
            </button>
            {!isLastStep && (
              <button
                type="button"
                className={`${styles.button} ${styles.primary}`}
                onClick={goNext}
              >
                Next
              </button>
            )}
          </div>
        </section>

        <aside className={styles.pane}>
          <Suspense fallback={<p className={styles.loading}>Loading preview…</p>}>
            <PdfPreview />
          </Suspense>
        </aside>
      </div>
    </FormProvider>
  )
}
