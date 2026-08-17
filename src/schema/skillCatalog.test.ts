import {
  CONTAINER_GROUPS,
  SKILL_CONTAINERS,
  SKILL_TREE,
  buildContainers,
  findContainer,
  isKnownContainer,
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

describe('buildContainers', () => {
  test('a level-1 leaf becomes its own container with no options', () => {
    const containers = buildContainers(parseSkillTree('# Infrastructure'))

    expect(containers).toEqual([
      {
        key: 'Infrastructure',
        group: 'Infrastructure',
        name: 'Infrastructure',
        options: [],
      },
    ])
  })

  test('a level-2 leaf becomes an open container under its group', () => {
    const containers = buildContainers(
      parseSkillTree(['# Programming', '## Java'].join('\n')),
    )

    expect(containers).toEqual([
      {
        key: 'Programming > Java',
        group: 'Programming',
        name: 'Java',
        options: [],
      },
    ])
  })

  test('a level-2 node with children exposes them as predefined options', () => {
    const containers = buildContainers(
      parseSkillTree(['# Programming', '## Node.js', '### React', '### Vue'].join('\n')),
    )

    expect(containers[0]).toMatchObject({
      key: 'Programming > Node.js',
      options: ['React', 'Vue'],
    })
  })

  test('a level-1 node with children is a header, not a container', () => {
    const containers = buildContainers(
      parseSkillTree(['# Programming', '## Java'].join('\n')),
    )

    expect(containers.map((container) => container.key)).not.toContain('Programming')
  })
})

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

  test('treats language entries as open containers', () => {
    expect(findContainer('Programming > Java')?.options).toEqual([])
    expect(findContainer('Programming > C# / .NET')?.options).toEqual([])
  })

  test('treats Node.js and Mobile development as predefined containers', () => {
    expect(findContainer('Programming > Node.js')?.options).toEqual([
      'React',
      'Angular',
      'Vue',
    ])
    expect(findContainer('Programming > Mobile development')?.options).toEqual([
      'React Native',
      'Flutter',
      'Kotlin',
      'Swift',
    ])
  })

  test('exposes level-1 leaves as containers in their own right', () => {
    for (const key of [
      'Infrastructure',
      'Data engineering',
      'Testing',
      'Security',
      'Management',
      'AI',
    ]) {
      expect(isKnownContainer(key)).toBe(true)
      expect(findContainer(key)?.options).toEqual([])
    }
  })

  test('rejects keys that are not containers', () => {
    expect(isKnownContainer('Programming')).toBe(false)
    expect(isKnownContainer('Programming > Node.js > React')).toBe(false)
    expect(isKnownContainer('Cloud')).toBe(false)
  })

  test('groups containers under their level-1 heading for the checkbox list', () => {
    const programming = CONTAINER_GROUPS.find(
      (entry) => entry.group === 'Programming',
    )

    expect(programming?.containers.map((container) => container.name)).toEqual([
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
    expect(SKILL_CONTAINERS).toHaveLength(15)
  })
})
