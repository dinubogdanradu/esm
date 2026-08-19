import markdown from './skills.md?raw'

/**
 * The hierarchy is read from skills.md at module load rather than copied into
 * TypeScript, so that file stays the single source of truth and can be edited
 * without a codegen step. The cost is that entry keys are `string` rather than a
 * literal union, so membership is checked at runtime instead of by the compiler.
 *
 * A heading ending in "!" is a leaf: a concrete skill named by the heading itself,
 * rather than a category to nest under. Everything else is a category — one with
 * sub-items groups them, one without lets the user name its own skills.
 */
export type CatalogNode = {
  name: string
  leaf: boolean
  children: CatalogNode[]
}

const HEADING = /^(#{1,6})\s+(.+?)\s*$/
const LEAF_SUFFIX = /\s*!$/

export const parseSkillTree = (source: string): CatalogNode[] => {
  const roots: CatalogNode[] = []
  const ancestors: (CatalogNode | undefined)[] = []

  for (const line of source.split(/\r?\n/)) {
    const match = HEADING.exec(line)
    if (!match) continue

    const [, hashes, rawName] = match
    if (!hashes || !rawName) continue

    const depth = hashes.length
    const node: CatalogNode = {
      name: rawName.replace(LEAF_SUFFIX, '').trim(),
      leaf: LEAF_SUFFIX.test(rawName),
      children: [],
    }

    if (node.name === '') continue

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

/** A category's children, in file order, so the form can mirror the file. */
export type CatalogItem =
  | { kind: 'skill'; name: string }
  | { kind: 'entry'; key: string }

/**
 * A selectable category. Leaves are not entries — they belong to their parent as
 * `options`, because a leaf is a skill rather than something to nest under.
 */
export type CatalogEntry = {
  /** Stable identity, also what drafts store. */
  key: string
  name: string
  depth: number
  parentKey: string | null
  /** Children in file order, mixing leaf skills and nested categories. */
  items: CatalogItem[]
  /** Names of leaf children, index-aligned with this entry's `skills` array. */
  options: string[]
  /** Keys of nested categories. */
  childKeys: string[]
  /** No children at all, so the user names this category's skills. */
  open: boolean
}

const collectEntries = (
  node: CatalogNode,
  parentKey: string | null,
  depth: number,
  out: CatalogEntry[],
): void => {
  const key =
    parentKey === null ? node.name : `${parentKey}${ENTRY_KEY_SEPARATOR}${node.name}`

  const items: CatalogItem[] = []
  const options: string[] = []
  const childKeys: string[] = []

  for (const child of node.children) {
    if (child.leaf) {
      items.push({ kind: 'skill', name: child.name })
      options.push(child.name)
    } else {
      const childKey = `${key}${ENTRY_KEY_SEPARATOR}${child.name}`
      items.push({ kind: 'entry', key: childKey })
      childKeys.push(childKey)
    }
  }

  out.push({
    key,
    name: node.name,
    depth,
    parentKey,
    items,
    options,
    childKeys,
    open: node.children.length === 0,
  })

  for (const child of node.children) {
    if (!child.leaf) collectEntries(child, key, depth + 1, out)
  }
}

export const buildEntries = (tree: CatalogNode[]): CatalogEntry[] => {
  const entries: CatalogEntry[] = []
  // A "!" on a top-level heading is ignored: a leaf is a skill of its parent, and a
  // root has no parent to belong to.
  for (const root of tree) collectEntries(root, null, 1, entries)
  return entries
}

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

/** Top-level categories, in file order. */
export const TOP_LEVEL_ENTRIES: CatalogEntry[] = EXPERTISE_ENTRIES.filter(
  (entry) => entry.depth === 1,
)

export const childEntries = (entry: CatalogEntry): CatalogEntry[] =>
  entry.childKeys
    .map((key) => findEntry(key))
    .filter((child): child is CatalogEntry => child !== undefined)

/** Keys from the entry's parent up to its root, nearest first. */
export const ancestorKeys = (key: string): string[] => {
  const keys: string[] = []
  let current = findEntry(key)?.parentKey ?? null

  while (current !== null) {
    keys.push(current)
    current = findEntry(current)?.parentKey ?? null
  }

  return keys
}
