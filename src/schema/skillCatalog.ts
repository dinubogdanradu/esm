import markdown from './skills.md?raw'

/**
 * The hierarchy is read from skills.md at module load rather than copied into
 * TypeScript, so that file stays the single source of truth and can be edited
 * without a codegen step. The cost is that entry keys are `string` rather than a
 * literal union, so membership is checked at runtime instead of by the compiler.
 */
export type CatalogNode = {
  name: string
  children: CatalogNode[]
}

const HEADING = /^(#{1,3})\s+(.+?)\s*$/

export const parseSkillTree = (source: string): CatalogNode[] => {
  const roots: CatalogNode[] = []
  // Index 0 holds the current level-1 node, index 1 the current level-2 node.
  const ancestors: (CatalogNode | undefined)[] = []

  for (const line of source.split(/\r?\n/)) {
    const match = HEADING.exec(line)
    if (!match) continue

    const [, hashes, name] = match
    if (!hashes || !name) continue

    const depth = hashes.length
    const node: CatalogNode = { name, children: [] }

    if (depth === 1) {
      roots.push(node)
    } else {
      const parent = ancestors[depth - 2]
      // A heading that skips a level has no parent to attach to; ignore it rather
      // than guessing where it belongs.
      if (!parent) continue
      parent.children.push(node)
    }

    ancestors[depth - 1] = node
    ancestors.length = depth
  }

  return roots
}

export const SKILL_TREE: CatalogNode[] = parseSkillTree(markdown)

export const ENTRY_KEY_SEPARATOR = ' > '

/**
 * One selectable node of the hierarchy. Levels 1 and 2 are both selectable, so the
 * form mirrors the file's shape: level-1 checkboxes at the top, and a level-1 node
 * with sub-items reveals checkboxes for them rather than holding skills itself.
 */
export type CatalogEntry = {
  /** Stable identity, also what drafts store. */
  key: string
  name: string
  depth: 1 | 2
  parentKey: string | null
  /** Keys of selectable level-2 children; empty unless this is a level-1 group. */
  childKeys: string[]
  /**
   * Predefined skill names taken from level-3 sub-items. Empty means the user types
   * their own.
   */
  options: string[]
  /** Whether skills attach here, as opposed to further down. */
  holdsSkills: boolean
}

export const buildEntries = (tree: CatalogNode[]): CatalogEntry[] =>
  tree.flatMap((group) => {
    const childKeys = group.children.map(
      (child) => `${group.name}${ENTRY_KEY_SEPARATOR}${child.name}`,
    )

    const groupEntry: CatalogEntry = {
      key: group.name,
      name: group.name,
      depth: 1,
      parentKey: null,
      childKeys,
      // Always empty: the parser only attaches level-3 nodes under a level-2 parent,
      // so predefined options never appear directly under a level-1 heading.
      options: [],
      holdsSkills: group.children.length === 0,
    }

    const childEntries: CatalogEntry[] = group.children.map((technology) => ({
      key: `${group.name}${ENTRY_KEY_SEPARATOR}${technology.name}`,
      name: technology.name,
      depth: 2,
      parentKey: group.name,
      childKeys: [],
      options: technology.children.map((framework) => framework.name),
      holdsSkills: true,
    }))

    return [groupEntry, ...childEntries]
  })

export const EXPERTISE_ENTRIES: CatalogEntry[] = buildEntries(SKILL_TREE)

const ENTRIES_BY_KEY = new Map(
  EXPERTISE_ENTRIES.map((entry) => [entry.key, entry]),
)

const INDEX_BY_KEY = new Map(
  EXPERTISE_ENTRIES.map((entry, index) => [entry.key, index]),
)

export const findEntry = (key: string): CatalogEntry | undefined =>
  ENTRIES_BY_KEY.get(key)

export const isKnownEntry = (key: string): boolean => ENTRIES_BY_KEY.has(key)

/** Position in `expertise`, which mirrors EXPERTISE_ENTRIES order. */
export const entryIndex = (key: string): number => INDEX_BY_KEY.get(key) ?? -1

/** Level-1 entries, in file order: the top row of checkboxes. */
export const TOP_LEVEL_ENTRIES: CatalogEntry[] = EXPERTISE_ENTRIES.filter(
  (entry) => entry.depth === 1,
)

export const childEntries = (entry: CatalogEntry): CatalogEntry[] =>
  entry.childKeys
    .map((key) => findEntry(key))
    .filter((child): child is CatalogEntry => child !== undefined)
