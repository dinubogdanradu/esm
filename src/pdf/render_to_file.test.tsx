// @vitest-environment node
/// <reference types="node" />
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToBuffer } from '@react-pdf/renderer'
import { vi } from 'vitest'
import { blankSkill, defaultCv } from '@/schema/defaults'
import { selectEntry } from '@/test/expertise'

const fontPath = (file: string) => ({ default: resolve('src/pdf/fonts', file) })

vi.mock('./fonts/Roboto-Regular.ttf', () => fontPath('Roboto-Regular.ttf'))
vi.mock('./fonts/Roboto-Bold.ttf', () => fontPath('Roboto-Bold.ttf'))
vi.mock('./fonts/Roboto-Italic.ttf', () => fontPath('Roboto-Italic.ttf'))
vi.mock('./fonts/Roboto-BoldItalic.ttf', () => fontPath('Roboto-BoldItalic.ttf'))

vi.mock('./assets/infosys-logo.png', () => ({
    default: readFileSync(resolve('src/pdf/assets/infosys-logo.png')),
}))

const { default: CvDocument } = await import('./CvDocument')

const populated = () => {
    const cv = defaultCv()
    cv.personal = {
        firstName: 'Bogdan',
        lastName: 'Dinu',
        headline: 'Fullstack Developer',
        location: 'Bucharest, Romania',
        email: 'bogdan@example.com',
        phone: '+40 700 000 000',
        website: 'https://example.com',
        linkedin: '',
        photo: '',
    }
    cv.profile.summary = 'Over 18 years of experience.\nGood infrastructure knowledge.'
    cv.qualifications = [
        {
            id: 'q1',
            institution: 'Politehnica Bucharest',
            degree: "Bachelor's Degree",
            field: 'Electrical Engineering',
            location: 'Bucharest',
            startDate: '2003-10',
            endDate: '2007-06',
            grade: '',
        },
    ]
    // Expertise mirrors the skills.md catalog: check the group, then the technology
    // under it, then fill in that technology's skills.
    selectEntry(cv, 'Programming')
    selectEntry(cv, 'Programming > PHP', [
        {
            ...blankSkill(),
            id: 's1',
            name: 'Drupal',
            level: 5,
            experienceYears: 12,
            experienceMonths: 3,
            lastUsed: 'Within last month',
            certificationLinks: [{ id: 'l1', url: 'https://example.com/drupal-cert' }],
        },
        {
            ...blankSkill(),
            id: 's2',
            name: 'Laravel',
            level: 4,
            experienceYears: 4,
            lastUsed: 'Within last year',
        },
    ])
    cv.experience = [
        {
            id: 'e1',
            company: 'United Nations Office at Geneva',
            position: 'Senior Drupal Developer',
            location: 'Geneva',
            startDate: '2019-04',
            endDate: '',
            current: true,
            bullets: [
                { id: 'b1', text: 'Website maintenance and development' },
                { id: 'b2', text: 'Design system implementation' },
            ],
            tech: ['Drupal', 'PHP'],
        },
    ]
    return cv
}

test('render populated CV to file', async () => {
    const buffer = await renderToBuffer(<CvDocument cv={populated()} />)
    const outdir = resolve('tmp')
    // ensure output folder exists in the test environment
    try {
        await import('node:fs').then(({ mkdirSync }) => mkdirSync(outdir, { recursive: true }))
    } catch { }
    const out = resolve(outdir, 'bogdan-cv.pdf')
    writeFileSync(out, buffer)
    // smoke assert
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF')
})
