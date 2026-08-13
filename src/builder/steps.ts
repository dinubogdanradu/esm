import type { ComponentType } from 'react'
import type { FieldPath } from 'react-hook-form'
import type { Cv } from '@/schema/cv'
import StepPlaceholder from './steps/StepPlaceholder'

export type StepComponentProps = {
  step: Step
}

export type Step = {
  /** URL slug under /build/ */
  id: string
  title: string
  /**
   * Paths handed to trigger() before advancing. A section key validates its whole
   * subtree, so one entry per section is enough.
   */
  validate: FieldPath<Cv>[]
  /** Field names this step owns, shown by the placeholder until Phase 2. */
  fields: string[]
  Component: ComponentType<StepComponentProps>
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
    fields: [
      'firstName',
      'lastName',
      'headline',
      'location',
      'email',
      'phone',
      'website',
      'linkedin',
      'photo',
    ],
    Component: StepPlaceholder,
  },
  {
    id: 'profile',
    title: 'Profile summary',
    validate: ['profile'],
    fields: ['summary'],
    Component: StepPlaceholder,
  },
  {
    id: 'qualifications',
    title: 'Qualifications',
    validate: ['qualifications'],
    fields: [
      'institution',
      'degree',
      'field',
      'location',
      'startDate',
      'endDate',
      'grade',
    ],
    Component: StepPlaceholder,
  },
  {
    id: 'expertise',
    title: 'Areas of expertise',
    validate: ['expertise'],
    fields: ['group name', 'showLevel', 'skills[].name', 'skills[].level'],
    Component: StepPlaceholder,
  },
  {
    id: 'experience',
    title: 'Experience summary',
    validate: ['experience'],
    fields: [
      'company',
      'position',
      'location',
      'startDate',
      'endDate',
      'current',
      'bullets[]',
      'tech[]',
    ],
    Component: StepPlaceholder,
  },
  {
    id: 'certifications',
    title: 'Certifications & Trainings',
    validate: ['certifications'],
    fields: ['name', 'issuer', 'date', 'expiryDate', 'credentialUrl'],
    Component: StepPlaceholder,
  },
  {
    id: 'languages',
    title: 'Languages & Soft Skills',
    validate: ['languages', 'softSkills'],
    fields: ['languages[].name', 'languages[].level', 'softSkills[].name'],
    Component: StepPlaceholder,
  },
  {
    id: 'projects',
    title: 'Projects',
    validate: ['projects'],
    fields: [
      'name',
      'role',
      'description',
      'tech[]',
      'url',
      'startDate',
      'endDate',
    ],
    Component: StepPlaceholder,
  },
  {
    id: 'review',
    title: 'Review & download',
    validate: [],
    fields: [],
    Component: StepPlaceholder,
  },
]

export const FIRST_STEP_ID: string = STEPS[0]?.id ?? 'personal'

export const findStepIndex = (stepId: string | undefined): number =>
  STEPS.findIndex((step) => step.id === stepId)
