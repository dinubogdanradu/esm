import markdown from './skills.md?raw'

/**
 * The hierarchy is read from skills.md at module load rather than copied into
 * TypeScript, so that file stays the single source of truth and can be edited
 * without a codegen step. The cost is that container keys are `string` rather than
 * a literal union, so membership is checked at runtime instead of by the compiler.
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

export const CONTAINER_KEY_SEPARATOR = ' > '

/**
 * A place where skills can be entered. Nodes that have sub-items are headers, not
 * containers — skills attach at the deepest level.
 */
export type SkillContainer = {
  /** Stable identity, also what drafts store. */
  key: string
  /** Level-1 heading this sits under; equals `name` for a level-1 leaf. */
  group: string
  name: string
  /**
   * Predefined skill names for this container. Empty means the user types their
   * own, which is the case for every level-1 and level-2 leaf.
   */
  options: string[]
}

export const buildContainers = (tree: CatalogNode[]): SkillContainer[] =>
  tree.flatMap((group) => {
    if (group.children.length === 0) {
      return [{ key: group.name, group: group.name, name: group.name, options: [] }]
    }

    return group.children.map((technology) => ({
      key: `${group.name}${CONTAINER_KEY_SEPARATOR}${technology.name}`,
      group: group.name,
      name: technology.name,
      options: technology.children.map((framework) => framework.name),
    }))
  })

export const SKILL_CONTAINERS: SkillContainer[] = buildContainers(SKILL_TREE)

const CONTAINERS_BY_KEY = new Map(
  SKILL_CONTAINERS.map((container) => [container.key, container]),
)

export const findContainer = (key: string): SkillContainer | undefined =>
  CONTAINERS_BY_KEY.get(key)

export const isKnownContainer = (key: string): boolean =>
  CONTAINERS_BY_KEY.has(key)

/** Level-1 headings in file order, for grouping the checkbox list. */
export const CONTAINER_GROUPS: { group: string; containers: SkillContainer[] }[] =
  SKILL_TREE.map((group) => ({
    group: group.name,
    containers: SKILL_CONTAINERS.filter(
      (container) => container.group === group.name,
    ),
  })).filter((entry) => entry.containers.length > 0)
