import { blankSkill, defaultCv } from '@/schema/defaults'
import type { Cv, Skill } from '@/schema/cv'
import {
  certificationLine,
  contactLines,
  documentFileName,
  experienceEntries,
  expertiseLines,
  formatDateRange,
  formatExperience,
  formatMonthYear,
  hasSecondPageContent,
  presentSections,
  profileBullets,
  projectEntries,
  qualificationLine,
} from './model'

describe('formatMonthYear', () => {
  test('formats a valid month', () => {
    expect(formatMonthYear('2016-03')).toBe('Mar 2016')
    expect(formatMonthYear('2024-12')).toBe('Dec 2024')
  })

  test('returns empty for anything unparseable', () => {
    expect(formatMonthYear('')).toBe('')
    expect(formatMonthYear('2016')).toBe('')
    expect(formatMonthYear('2016-13')).toBe('')
  })
})

describe('formatDateRange', () => {
  test('joins both ends', () => {
    expect(formatDateRange('2014-01', '2016-06')).toBe('Jan 2014 – Jun 2016')
  })

  test('uses Present for a current role and ignores any stored end date', () => {
    expect(formatDateRange('2016-03', '2020-01', true)).toBe('Mar 2016 – Present')
  })

  test('falls back to whichever end is known', () => {
    expect(formatDateRange('2016-03', '')).toBe('Mar 2016')
    expect(formatDateRange('', '2016-03')).toBe('Mar 2016')
    expect(formatDateRange('', '')).toBe('')
  })
})

describe('profileBullets', () => {
  test('splits lines into bullets', () => {
    expect(profileBullets('First line\nSecond line')).toEqual([
      'First line',
      'Second line',
    ])
  })

  test('keeps a single paragraph as one bullet', () => {
    expect(profileBullets('Just one sentence.')).toEqual(['Just one sentence.'])
  })

  test('strips leading bullet characters the user typed', () => {
    expect(profileBullets('- dashed\n* starred\n• dotted')).toEqual([
      'dashed',
      'starred',
      'dotted',
    ])
  })

  test('ignores blank lines and whitespace', () => {
    expect(profileBullets('  \n\nOne\n\n   \nTwo\n')).toEqual(['One', 'Two'])
  })
})

describe('qualificationLine', () => {
  test('assembles the parts that are present', () => {
    expect(
      qualificationLine({
        id: 'q1',
        institution: 'University of Chicago',
        degree: 'MSc',
        field: 'Computer Science',
        location: 'Chicago',
        startDate: '2010-09',
        endDate: '2014-06',
        grade: 'Distinction',
      }),
    ).toBe(
      'MSc (Computer Science), University of Chicago, Chicago, Sep 2010 – Jun 2014, Distinction',
    )
  })

  test('omits empty parts without leaving separators', () => {
    expect(
      qualificationLine({
        id: 'q1',
        institution: 'TU Delft',
        degree: 'BSc',
        field: '',
        location: '',
        startDate: '',
        endDate: '',
        grade: '',
      }),
    ).toBe('BSc, TU Delft')
  })
})

describe('formatExperience', () => {
  test('renders whichever parts are non-zero', () => {
    expect(formatExperience(5, 6)).toBe('5y 6m')
    expect(formatExperience(5, 0)).toBe('5y')
    expect(formatExperience(0, 6)).toBe('6m')
    expect(formatExperience(0, 0)).toBe('')
  })
})

describe('expertiseLines', () => {
  const skill = (overrides: Partial<Skill>): Skill => ({
    ...blankSkill(),
    ...overrides,
  })

  // The parent group has to be checked too, since an entry under an unchecked
  // parent is not on the CV.
  const withJava = (skills: Skill[], selected = true, parentSelected = true): Cv => {
    const cv = defaultCv()
    const programming = cv.expertise.find((entry) => entry.key === 'Programming')
    const group = cv.expertise.find((entry) => entry.key === 'Programming > Java')
    if (!programming || !group) throw new Error('catalog entries missing')
    programming.selected = parentSelected
    group.selected = selected
    group.skills = skills
    return cv
  }

  test('includes proficiency, experience and recency for each skill', () => {
    const cv = withJava([
      skill({
        name: 'Spring',
        level: 5,
        experienceYears: 5,
        experienceMonths: 6,
        lastUsed: 'Within last month',
      }),
    ])

    expect(expertiseLines(cv)[0]).toMatchObject({
      key: 'Programming > Java',
      // Labelled by the container, not its full catalog path.
      label: 'Java',
      value: 'Spring (Expert, 5y 6m, Within last month)',
    })
  })

  test('excludes skills that are present but unchecked', () => {
    const cv = withJava([
      skill({ name: 'Spring', level: 5 }),
      skill({ name: 'Struts', level: 2, selected: false }),
    ])

    expect(expertiseLines(cv)[0]?.value).toBe('Spring (Expert)')
  })

  test('omits detail parts that were not filled in', () => {
    const cv = withJava([skill({ name: 'Hibernate', level: 4 })])

    expect(expertiseLines(cv)[0]?.value).toBe('Hibernate (Advanced)')
  })

  test('separates multiple skills and skips unnamed ones', () => {
    const cv = withJava([
      skill({ name: 'Spring', level: 5 }),
      skill({ name: '  ', level: 3 }),
      skill({ name: 'Maven', level: 3 }),
    ])

    expect(expertiseLines(cv)[0]?.value).toBe(
      'Spring (Expert); Maven (Proficient)',
    )
  })

  test('collects certification links across the group', () => {
    const cv = withJava([
      skill({
        name: 'Spring',
        certificationLinks: [
          { id: 'l1', url: 'https://example.com/a' },
          { id: 'l2', url: '   ' },
        ],
      }),
      skill({
        name: 'Maven',
        certificationLinks: [{ id: 'l3', url: 'https://example.com/b' }],
      }),
    ])

    expect(expertiseLines(cv)[0]?.links).toEqual([
      'https://example.com/a',
      'https://example.com/b',
    ])
  })

  test('excludes unchecked groups even when they hold skills', () => {
    const cv = withJava([skill({ name: 'Spring' })], false)

    expect(expertiseLines(cv)).toEqual([])
  })

  test('excludes a checked group with nothing filled in', () => {
    expect(expertiseLines(withJava([]))).toEqual([])
  })

  test('excludes a checked technology whose group is unchecked', () => {
    const cv = withJava([skill({ name: 'Spring' })], true, false)

    expect(expertiseLines(cv)).toEqual([])
  })

  test('never emits a line for a group that only holds sub-items', () => {
    const cv = withJava([skill({ name: 'Spring' })])

    expect(expertiseLines(cv).map((line) => line.label)).toEqual(['Java'])
  })
})

describe('experienceEntries', () => {
  test('builds the title and meta lines', () => {
    const [entry] = experienceEntries([
      {
        id: 'e1',
        company: 'Dice',
        position: 'Senior Engineer',
        location: 'Berlin',
        startDate: '2016-03',
        endDate: '',
        current: true,
        bullets: [
          { id: 'b1', text: 'Shipped the thing' },
          { id: 'b2', text: '   ' },
        ],
        tech: ['React', 'Go'],
      },
    ])

    expect(entry?.title).toBe('Senior Engineer – Dice')
    expect(entry?.meta).toBe('Berlin | Mar 2016 – Present')
    expect(entry?.bullets).toEqual(['Shipped the thing'])
    expect(entry?.tech).toBe('React, Go')
  })
})

describe('certificationLine', () => {
  test('uses a range only when an expiry exists', () => {
    const base = {
      id: 'c1',
      name: 'Certified Drupal 11 Developer',
      issuer: 'Acquia',
      date: '2024-05',
      credentialUrl: '',
    }

    expect(certificationLine({ ...base, expiryDate: '' })).toBe(
      'Certified Drupal 11 Developer – Acquia – May 2024',
    )
    expect(certificationLine({ ...base, expiryDate: '2027-05' })).toBe(
      'Certified Drupal 11 Developer – Acquia – May 2024 – May 2027',
    )
  })
})

describe('projectEntries', () => {
  test('assembles the meta line from role, dates and url', () => {
    const [project] = projectEntries([
      {
        id: 'p1',
        name: 'Design System',
        role: 'Lead',
        description: 'A theme starterkit.',
        tech: ['Drupal'],
        url: 'https://example.com',
        startDate: '2021-01',
        endDate: '2022-01',
      },
    ])

    expect(project?.meta).toBe('Lead | Jan 2021 – Jan 2022 | https://example.com')
  })
})

describe('contactLines', () => {
  test('keeps only the filled contact fields, in order', () => {
    const cv = defaultCv()
    cv.personal.email = 'ada@example.com'
    cv.personal.location = 'London'

    expect(contactLines(cv)).toEqual(['ada@example.com', 'London'])
  })
})

describe('presentSections', () => {
  test('reports every section absent for an empty CV', () => {
    expect(presentSections(defaultCv())).toEqual({
      profile: false,
      qualifications: false,
      expertise: false,
      experience: false,
      certifications: false,
      languages: false,
      softSkills: false,
      projects: false,
    })
  })

  test('a section holding only blank rows still counts as absent', () => {
    const cv = defaultCv()
    cv.certifications = [
      {
        id: 'c1',
        name: '',
        issuer: '',
        date: '',
        expiryDate: '',
        credentialUrl: '',
      },
    ]

    expect(presentSections(cv).certifications).toBe(false)
  })
})

describe('hasSecondPageContent', () => {
  test('is false when nothing on page two is filled', () => {
    expect(hasSecondPageContent(defaultCv())).toBe(false)
  })

  test('is true as soon as one page-two section has content', () => {
    const cv = defaultCv()
    cv.softSkills = [{ id: 's1', name: 'Mentoring' }]

    expect(hasSecondPageContent(cv)).toBe(true)
  })

  test('page-one content alone does not create a second page', () => {
    const cv = defaultCv()
    cv.profile.summary = 'Builds things.'

    expect(hasSecondPageContent(cv)).toBe(false)
  })
})

describe('documentFileName', () => {
  test('slugifies the name', () => {
    const cv = defaultCv()
    cv.personal.firstName = 'Bogdan'
    cv.personal.lastName = 'Dinu'

    expect(documentFileName(cv)).toBe('bogdan-dinu-cv.pdf')
  })

  test('falls back when there is no name', () => {
    expect(documentFileName(defaultCv())).toBe('cv.pdf')
  })
})
