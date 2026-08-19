import {
  ancestorKeys,
  SKILL_TREE,
  EXPERTISE_ENTRIES,

  TOP_LEVEL_ENTRIES,
  buildEntries,
  childEntries,
  entryIndex,
  findEntry,
  isKnownEntry,
  parseSkillTree,
  type CatalogEntry,
} from './skillCatalog'

describe('parseSkillTree', () => {
  test('nests headings by level', () => {
    const tree = parseSkillTree(
      ['# Programming', '## Node.js', '### React', '### Vue', '# Testing'].join('\n'),
    )

    expect(tree.map((node) => node.name)).toEqual(['Programming', 'Testing'])
    expect(tree[0]?.children.map((node) => node.name)).toEqual(['Node.js'])
    expect(tree[0]?.children[0]?.children.map((node) => node.name)).toEqual([
      'React',
      'Vue',
    ])
  })

  test('closes deeper levels when a shallower heading appears', () => {
    const tree = parseSkillTree(
      ['# A', '## A1', '### A1a', '## A2', '# B'].join('\n'),
    )

    expect(tree[0]?.children.map((node) => node.name)).toEqual(['A1', 'A2'])
    expect(tree[0]?.children[1]?.children).toEqual([])
  })

  test('ignores blank lines, prose and headings that skip a level', () => {
    const tree = parseSkillTree(
      ['', 'some prose', '### orphan', '# A', '## A1'].join('\n'),
    )

    expect(tree).toHaveLength(1)
    expect(tree[0]?.name).toBe('A')
  })

  test('trims trailing whitespace from names', () => {
    expect(parseSkillTree('#   Programming   ')[0]?.name).toBe('Programming')
  })
})

describe('the "!" leaf marker', () => {
  test('strips the marker from the name and flags the node', () => {
    const tree = parseSkillTree(['# Programming', '## Java !', '## Other'].join('\n'))
    const [java, other] = tree[0]?.children ?? []

    expect(java).toMatchObject({ name: 'Java', leaf: true })
    expect(other).toMatchObject({ name: 'Other', leaf: false })
  })

  test('tolerates a missing space before the marker', () => {
    const tree = parseSkillTree(['# A', '## Go!'].join('\n'))

    expect(tree[0]?.children[0]).toMatchObject({ name: 'Go', leaf: true })
  })
})

describe('buildEntries', () => {
  const find = (entries: CatalogEntry[], key: string) =>
    entries.find((entry) => entry.key === key)

  test('a leaf becomes an option of its parent, not an entry of its own', () => {
    const entries = buildEntries(
      parseSkillTree(['# Programming', '## Java !', '## Python !'].join('\n')),
    )

    expect(entries.map((entry) => entry.key)).toEqual(['Programming'])
    expect(find(entries, 'Programming')).toMatchObject({
      options: ['Java', 'Python'],
      childKeys: [],
      open: false,
    })
  })

  test('a childless category with no marker is open for user-named skills', () => {
    const entries = buildEntries(parseSkillTree(['# Programming', '## Other'].join('\n')))

    expect(find(entries, 'Programming > Other')).toMatchObject({
      options: [],
      childKeys: [],
      open: true,
    })
  })

  test('a category can hold both leaf skills and sub-categories', () => {
    const entries = buildEntries(
      parseSkillTree(
        ['# Programming', '## Java !', '## Node.js', '### React !', '### Other'].join(
          '\n',
        ),
      ),
    )

    expect(find(entries, 'Programming')).toMatchObject({
      options: ['Java'],
      childKeys: ['Programming > Node.js'],
    })
    expect(find(entries, 'Programming > Node.js')).toMatchObject({
      options: ['React'],
      childKeys: ['Programming > Node.js > Other'],
      depth: 2,
    })
    expect(find(entries, 'Programming > Node.js > Other')).toMatchObject({
      depth: 3,
      open: true,
    })
  })

  test('items keep file order so leaves and sub-categories interleave', () => {
    const entries = buildEntries(
      parseSkillTree(['# A', '## One !', '## Deep', '## Two !'].join('\n')),
    )

    expect(find(entries, 'A')?.items).toEqual([
      { kind: 'skill', name: 'One' },
      { kind: 'entry', key: 'A > Deep' },
      { kind: 'skill', name: 'Two' },
    ])
  })

  test('options are index-aligned for seeding the skills array', () => {
    const entry = find(
      buildEntries(parseSkillTree(['# A', '## X !', '## Sub', '## Y !'].join('\n'))),
      'A',
    )

    expect(entry?.options).toEqual(['X', 'Y'])
  })

  test('ignores the children of a node marked as a leaf', () => {
    const entries = buildEntries(
      parseSkillTree(['# A', '## Java !', '### Spring'].join('\n')),
    )

    expect(entries.map((entry) => entry.key)).toEqual(['A'])
    expect(find(entries, 'A')?.options).toEqual(['Java'])
  })

  test('ignores a marker on a top-level heading, which has no parent', () => {
    const entries = buildEntries(parseSkillTree('# Solo !'))

    expect(entries.map((entry) => entry.key)).toEqual(['Solo'])
    expect(find(entries, 'Solo')?.open).toBe(true)
  })
})

describe('the catalog read from skills.md', () => {
  // Structural invariants rather than the file's current contents: skills.md is data
  // the user edits, so asserting specific names here would break on every edit.

  test('every entry has a unique key', () => {
    const keys = EXPERTISE_ENTRIES.map((entry) => entry.key)

    expect(new Set(keys).size).toBe(keys.length)
  })

  test("every entry's parent is itself an entry", () => {
    for (const entry of EXPERTISE_ENTRIES) {
      if (entry.parentKey === null) continue
      expect(findEntry(entry.parentKey)).toBeDefined()
    }
  })

  test('top-level entries are exactly the depth-1 headings', () => {
    expect(TOP_LEVEL_ENTRIES).toEqual(
      EXPERTISE_ENTRIES.filter((entry) => entry.depth === 1),
    )
    expect(TOP_LEVEL_ENTRIES.every((entry) => entry.parentKey === null)).toBe(true)
  })

  test('a leaf is an option of its parent, never an entry', () => {
    for (const entry of EXPERTISE_ENTRIES) {
      for (const option of entry.options) {
        expect(isKnownEntry(`${entry.key} > ${option}`)).toBe(false)
      }
    }
  })

  test('every "!" heading in the file appears as exactly one option', () => {
    const collect = (node: { children: { name: string; leaf: boolean; children: unknown[] }[] }): string[] =>
      node.children.flatMap((child) =>
        child.leaf
          ? [child.name]
          : collect(child as Parameters<typeof collect>[0]),
      )
    const marked = SKILL_TREE.flatMap((root) => collect(root))
    const options = EXPERTISE_ENTRIES.flatMap((entry) => entry.options)

    expect(options).toHaveLength(marked.length)
    for (const name of marked) expect(options).toContain(name)
  })

  test('an entry is open exactly when it has neither options nor children', () => {
    for (const entry of EXPERTISE_ENTRIES) {
      expect(entry.open).toBe(
        entry.options.length === 0 && entry.childKeys.length === 0,
      )
    }
  })

  test('childEntries resolves every child key', () => {
    for (const entry of EXPERTISE_ENTRIES) {
      expect(childEntries(entry).map((child) => child.key)).toEqual(entry.childKeys)
    }
  })

  test('ancestorKeys walks to the root, nearest first', () => {
    for (const entry of EXPERTISE_ENTRIES) {
      const ancestors = ancestorKeys(entry.key)

      expect(ancestors).toHaveLength(entry.depth - 1)
      expect(ancestors[0]).toBe(entry.parentKey ?? undefined)
      // The last ancestor is always a top-level entry.
      if (ancestors.length > 0) {
        expect(findEntry(ancestors[ancestors.length - 1] ?? '')?.depth).toBe(1)
      }
    }
  })

  test('entryIndex matches position in the entry list', () => {
    EXPERTISE_ENTRIES.forEach((entry, index) => {
      expect(entryIndex(entry.key)).toBe(index)
    })
    expect(entryIndex('Not a catalog key')).toBe(-1)
  })

  test('the file yields a usable catalog', () => {
    // Guards against a malformed skills.md producing an empty or flat catalog.
    expect(TOP_LEVEL_ENTRIES.length).toBeGreaterThan(0)
    expect(
      EXPERTISE_ENTRIES.some((entry) => entry.options.length > 0),
    ).toBe(true)
    expect(EXPERTISE_ENTRIES.some((entry) => entry.open)).toBe(true)
  })
})
