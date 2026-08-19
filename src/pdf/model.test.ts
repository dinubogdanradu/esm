import { blankSkill, defaultCv } from '@/schema/defaults'
import type { Cv, Skill } from '@/schema/cv'
import { blockText, plainRun, richTextFromPlain } from '@/schema/richText'
import { EXPERTISE_ENTRIES, ancestorKeys } from '@/schema/skillCatalog'
import { ratedEntry } from '@/test/expertise'
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
  renderableRichText,
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

describe('renderableRichText', () => {
  test('drops blank runs and blocks the editor leaves behind', () => {
    const value = renderableRichText({
      blocks: [
        { type: 'bullet', runs: [plainRun('Shipped'), plainRun('')] },
        { type: 'paragraph', runs: [plainRun('   ')] },
        { type: 'bullet', runs: [] },
      ],
    })

    expect(value.blocks).toHaveLength(1)
    expect(value.blocks[0]?.runs.map((run) => run.text)).toEqual(['Shipped'])
  })

  test('keeps the marks on surviving runs', () => {
    const bold = { ...plainRun('Led'), bold: true }
    const value = renderableRichText({
      blocks: [{ type: 'paragraph', runs: [bold, plainRun(' the migration')] }],
    })

    expect(value.blocks[0]?.runs[0]).toMatchObject({ text: 'Led', bold: true })
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
  test('splits a total in months into years and months', () => {
    expect(formatExperience(66)).toBe('5y 6m')
    expect(formatExperience(60)).toBe('5y')
    expect(formatExperience(6)).toBe('6m')
    expect(formatExperience(0)).toBe('')
    expect(formatExperience(12)).toBe('1y')
    expect(formatExperience(13)).toBe('1y 1m')
  })
})

describe('expertiseLines', () => {
  const skill = (overrides: Partial<Skill> = {}): Skill => ({
    ...blankSkill(),
    ...overrides,
  })

  // Catalog-derived: only the key matters here, since the skills are set directly.
  const rated = ratedEntry()
  const nested = EXPERTISE_ENTRIES.find((entry) => entry.depth > 1)
  if (!nested) throw new Error('skills.md has no nested category')

  const withProgramming = (skills: Skill[], selected = true): Cv => {
    const cv = defaultCv()
    const group = cv.expertise.find((entry) => entry.key === rated.key)
    if (!group) throw new Error('rated category missing from the catalog')
    // Ancestors too, or the category never reaches the CV.
    for (const key of ancestorKeys(rated.key)) {
      const ancestor = cv.expertise.find((entry) => entry.key === key)
      if (ancestor) ancestor.selected = selected
    }
    group.selected = selected
    group.skills = skills
    return cv
  }

  test('includes proficiency, experience and recency for each skill', () => {
    const cv = withProgramming([
      skill({
        name: 'Java',
        level: 5,
        experienceMonths: 66,
        lastUsed: 'Within last month',
      }),
    ])

    expect(expertiseLines(cv)[0]).toMatchObject({
      key: rated.key,
      label: rated.name,
      value: 'Java (Expert, 5y 6m, Within last month)',
    })
  })

  test('excludes skills that are present but unchecked', () => {
    const cv = withProgramming([
      skill({ name: 'Java', level: 5 }),
      skill({ name: 'Rust', level: 2, selected: false }),
    ])

    expect(expertiseLines(cv)[0]?.value).toBe('Java (Expert)')
  })

  test('omits detail parts that were not filled in', () => {
    const cv = withProgramming([skill({ name: 'Go', level: 4 })])

    expect(expertiseLines(cv)[0]?.value).toBe('Go (Advanced)')
  })

  test('separates multiple skills and skips unnamed ones', () => {
    const cv = withProgramming([
      skill({ name: 'Java', level: 5 }),
      skill({ name: '  ', level: 3 }),
      skill({ name: 'Go', level: 3 }),
    ])

    expect(expertiseLines(cv)[0]?.value).toBe('Java (Expert); Go (Proficient)')
  })

  test('collects certification links across the category', () => {
    const cv = withProgramming([
      skill({
        name: 'Java',
        certificationLinks: [
          { id: 'l1', url: 'https://example.com/a' },
          { id: 'l2', url: '   ' },
        ],
      }),
      skill({
        name: 'Go',
        certificationLinks: [{ id: 'l3', url: 'https://example.com/b' }],
      }),
    ])

    expect(expertiseLines(cv)[0]?.links).toEqual([
      'https://example.com/a',
      'https://example.com/b',
    ])
  })

  test('excludes unchecked categories even when they hold skills', () => {
    const cv = withProgramming([skill({ name: 'Java' })], false)

    expect(expertiseLines(cv)).toEqual([])
  })

  test('excludes a checked category with nothing filled in', () => {
    expect(expertiseLines(withProgramming([]))).toEqual([])
  })

  test('a nested category needs every ancestor checked', () => {
    const build = (parentSelected: boolean, childSelected: boolean): Cv => {
      const cv = defaultCv()
      for (const key of ancestorKeys(nested.key)) {
        const ancestor = cv.expertise.find((entry) => entry.key === key)
        if (ancestor) ancestor.selected = parentSelected
      }
      const child = cv.expertise.find((entry) => entry.key === nested.key)
      if (!child) throw new Error('catalog entries missing')
      child.selected = childSelected
      child.skills = [skill({ name: 'React', level: 4 })]
      return cv
    }

    expect(expertiseLines(build(true, true)).map((line) => line.label)).toEqual([
      nested.name,
    ])
    expect(expertiseLines(build(false, true))).toEqual([])
  })

  test('labels a nested category by its own name, not its path', () => {
    const cv = defaultCv()
    for (const key of [...ancestorKeys(nested.key), nested.key]) {
      const entry = cv.expertise.find((candidate) => candidate.key === key)
      if (entry) entry.selected = true
    }
    const child = cv.expertise.find((entry) => entry.key === nested.key)
    if (!child) throw new Error('catalog entries missing')
    child.skills = [skill({ name: 'Flutter', level: 3 })]

    expect(expertiseLines(cv)[0]?.label).toBe(nested.name)
    expect(nested.name).not.toContain('>')
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
        achievements: richTextFromPlain('Shipped the thing\n   '),
        tech: ['React', 'Go'],
      },
    ])

    expect(entry?.title).toBe('Senior Engineer – Dice')
    expect(entry?.meta).toBe('Berlin | Mar 2016 – Present')
    expect(entry?.achievements.blocks.map(blockText)).toEqual(['Shipped the thing'])
    expect(entry?.tech).toBe('React, Go')
  })
})

describe('certificationLine', () => {
  test('uses a range only when an expiry exists', () => {
    const base = {
      id: 'c1',
      name: 'Certified Platform Engineer',
      issuer: 'Acquia',
      date: '2024-05',
      credentialUrl: '',
    }

    expect(certificationLine({ ...base, expiryDate: '' })).toBe(
      'Certified Platform Engineer – Acquia – May 2024',
    )
    expect(certificationLine({ ...base, expiryDate: '2027-05' })).toBe(
      'Certified Platform Engineer – Acquia – May 2024 – May 2027',
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
        description: richTextFromPlain('A theme starterkit.', 'paragraph'),
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
    cv.profile.summary = richTextFromPlain('Builds things.')

    expect(hasSecondPageContent(cv)).toBe(false)
  })
})

describe('documentFileName', () => {
  test('slugifies the name', () => {
    const cv = defaultCv()
    cv.personal.firstName = 'Avery'
    cv.personal.lastName = 'Quinn'

    expect(documentFileName(cv)).toBe('avery-quinn-cv.pdf')
  })

  test('falls back when there is no name', () => {
    expect(documentFileName(defaultCv())).toBe('cv.pdf')
  })
})
