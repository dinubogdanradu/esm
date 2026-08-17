import {
  EXPERTISE_ENTRIES,
  SKILL_TREE,
  TOP_LEVEL_ENTRIES,
  buildEntries,
  childEntries,
  entryIndex,
  findEntry,
  isKnownEntry,
  parseSkillTree,
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

describe('buildEntries', () => {
  test('a level-1 leaf holds skills itself', () => {
    expect(buildEntries(parseSkillTree('# Infrastructure'))).toEqual([
      {
        key: 'Infrastructure',
        name: 'Infrastructure',
        depth: 1,
        parentKey: null,
        childKeys: [],
        options: [],
        holdsSkills: true,
      },
    ])
  })

  test('a level-1 node with sub-items is selectable but holds no skills', () => {
    const [group, child] = buildEntries(
      parseSkillTree(['# Programming', '## Java'].join('\n')),
    )

    expect(group).toMatchObject({
      key: 'Programming',
      depth: 1,
      childKeys: ['Programming > Java'],
      holdsSkills: false,
    })
    expect(child).toMatchObject({
      key: 'Programming > Java',
      name: 'Java',
      depth: 2,
      parentKey: 'Programming',
      options: [],
      holdsSkills: true,
    })
  })

  test('a level-2 node with children exposes them as predefined options', () => {
    const entries = buildEntries(
      parseSkillTree(['# Programming', '## Node.js', '### React', '### Vue'].join('\n')),
    )

    expect(findFrom(entries, 'Programming > Node.js')).toMatchObject({
      options: ['React', 'Vue'],
      holdsSkills: true,
    })
  })

  test('lists each group immediately before its children', () => {
    const entries = buildEntries(
      parseSkillTree(['# A', '## A1', '## A2', '# B'].join('\n')),
    )

    expect(entries.map((entry) => entry.key)).toEqual(['A', 'A > A1', 'A > A2', 'B'])
  })
})

const findFrom = (entries: ReturnType<typeof buildEntries>, key: string) =>
  entries.find((entry) => entry.key === key)

describe('the catalog read from skills.md', () => {
  test('exposes the documented top-level groups in file order', () => {
    expect(SKILL_TREE.map((node) => node.name)).toEqual([
      'Programming',
      'Infrastructure',
      'Data engineering',
      'Testing',
      'Security',
      'Management',
      'AI',
    ])
  })

  test('every level-1 heading is selectable, sub-items or not', () => {
    expect(TOP_LEVEL_ENTRIES.map((entry) => entry.name)).toEqual([
      'Programming',
      'Infrastructure',
      'Data engineering',
      'Testing',
      'Security',
      'Management',
      'AI',
    ])
    expect(isKnownEntry('Programming')).toBe(true)
  })

  test('Programming groups its technologies rather than holding skills', () => {
    const programming = findEntry('Programming')

    expect(programming?.holdsSkills).toBe(false)
    expect(childEntries(programming!).map((child) => child.name)).toEqual([
      'Java',
      'Python',
      'PHP',
      'C# / .NET',
      'C++',
      'Rust',
      'Go',
      'Node.js',
      'Mobile development',
    ])
  })

  test('level-1 leaves hold skills directly', () => {
    for (const key of [
      'Infrastructure',
      'Data engineering',
      'Testing',
      'Security',
      'Management',
      'AI',
    ]) {
      expect(findEntry(key)).toMatchObject({
        holdsSkills: true,
        childKeys: [],
        options: [],
      })
    }
  })

  test('treats language entries as open containers', () => {
    expect(findEntry('Programming > Java')?.options).toEqual([])
    expect(findEntry('Programming > C# / .NET')?.options).toEqual([])
  })

  test('treats Node.js and Mobile development as predefined containers', () => {
    expect(findEntry('Programming > Node.js')?.options).toEqual([
      'React',
      'Angular',
      'Vue',
    ])
    expect(findEntry('Programming > Mobile development')?.options).toEqual([
      'React Native',
      'Flutter',
      'Kotlin',
      'Swift',
    ])
  })

  test('rejects keys that are not selectable entries', () => {
    expect(isKnownEntry('Programming > Node.js > React')).toBe(false)
    expect(isKnownEntry('Cloud')).toBe(false)
  })

  test('entryIndex matches position in the entry list', () => {
    EXPERTISE_ENTRIES.forEach((entry, index) => {
      expect(entryIndex(entry.key)).toBe(index)
    })
    expect(entryIndex('Cloud')).toBe(-1)
  })

  test('has one entry per level-1 heading plus one per technology', () => {
    expect(EXPERTISE_ENTRIES).toHaveLength(16)
  })
})
