import type { ComponentType } from 'react'
import type { FieldPath } from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import CertificationsStep from './steps/CertificationsStep'
import ExperienceStep from './steps/ExperienceStep'
import ExpertiseStep from './steps/ExpertiseStep'
import LanguagesStep from './steps/LanguagesStep'
import PersonalStep from './steps/PersonalStep'
import ProfileStep from './steps/ProfileStep'
import ProjectsStep from './steps/ProjectsStep'
import QualificationsStep from './steps/QualificationsStep'
import ReviewStep from './steps/ReviewStep'

export type Step = {
  /** URL slug under /build/ */
  id: string
  title: string
  /**
   * Paths handed to trigger() before advancing. A section key validates its whole
   * subtree, so one entry per section is enough.
   */
  validate: FieldPath<Cv>[]
  Component: ComponentType
}

/**
 * The single source of step order, titles and validation scope. The progress nav,
 * next/back controls and PDF section order all derive from this array, so adding a
 * section means adding an entry here and nothing else.
 */
export const STEPS: Step[] = [
  {
    id: 'personal',
    title: 'Personal details',
    validate: ['personal'],
    Component: PersonalStep,
  },
  {
    id: 'profile',
    title: 'Profile summary',
    validate: ['profile'],
    Component: ProfileStep,
  },
  {
    id: 'qualifications',
    title: 'Qualifications',
    validate: ['qualifications'],
    Component: QualificationsStep,
  },
  {
    id: 'expertise',
    title: 'Areas of expertise',
    validate: ['expertise'],
    Component: ExpertiseStep,
  },
  {
    id: 'experience',
    title: 'Experience summary',
    validate: ['experience'],
    Component: ExperienceStep,
  },
  {
    id: 'certifications',
    title: 'Certifications & Trainings',
    validate: ['certifications'],
    Component: CertificationsStep,
  },
  {
    id: 'languages',
    title: 'Languages & Soft Skills',
    validate: ['languages', 'softSkills'],
    Component: LanguagesStep,
  },
  {
    id: 'projects',
    title: 'Projects',
    validate: ['projects'],
    Component: ProjectsStep,
  },
  {
    id: 'review',
    title: 'Review & download',
    validate: [],
    Component: ReviewStep,
  },
]

export const FIRST_STEP_ID: string = STEPS[0]?.id ?? 'personal'

export const findStepIndex = (stepId: string | undefined): number =>
  STEPS.findIndex((step) => step.id === stepId)
