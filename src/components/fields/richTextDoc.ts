import type { JSONContent } from '@tiptap/react'
import {
  plainRun,
  type RichBlock,
  type RichRun,
  type RichText,
} from '@/schema/richText'

/**
 * Conversion between the stored flat model and Tiptap's nested document. Keeping this
 * in one place means the editor library is swappable without touching the schema or
 * either exporter.
 */
const MARKS = ['bold', 'italic', 'underline'] as const

const runsFromContent = (content: JSONContent[] | undefined): RichRun[] =>
  (content ?? []).flatMap((node) => {
    // A hard break inside a paragraph reads as a space; the model has no line break
    // within a block.
    if (node.type === 'hardBreak') return [plainRun(' ')]
    if (node.type !== 'text' || typeof node.text !== 'string') return []

    const marks = new Set((node.marks ?? []).map((mark) => mark.type))
    return [
      {
        text: node.text,
        bold: marks.has('bold'),
        italic: marks.has('italic'),
        underline: marks.has('underline'),
      },
    ]
  })

export const fromEditorDoc = (doc: JSONContent): RichText => {
  const blocks: RichBlock[] = []

  for (const node of doc.content ?? []) {
    if (node.type === 'paragraph') {
      blocks.push({ type: 'paragraph', runs: runsFromContent(node.content) })
      continue
    }

    if (node.type === 'bulletList') {
      for (const item of node.content ?? []) {
        // A listItem wraps one or more paragraphs; each becomes its own bullet.
        for (const paragraph of item.content ?? []) {
          blocks.push({
            type: 'bullet',
            runs: runsFromContent(paragraph.content),
          })
        }
      }
    }
  }

  return { blocks }
}

const contentFromRuns = (runs: RichRun[]): JSONContent[] =>
  runs
    .filter((run) => run.text !== '')
    .map((run) => {
      const marks = MARKS.filter((mark) => run[mark]).map((type) => ({ type }))
      return marks.length > 0
        ? { type: 'text', text: run.text, marks }
        : { type: 'text', text: run.text }
    })

export const toEditorDoc = (value: RichText): JSONContent => {
  const content: JSONContent[] = []

  for (const block of value.blocks) {
    const paragraph: JSONContent = { type: 'paragraph' }
    const runs = contentFromRuns(block.runs)
    if (runs.length > 0) paragraph.content = runs

    if (block.type === 'paragraph') {
      content.push(paragraph)
      continue
    }

    // Consecutive bullets belong to one list, so the editor shows them as such.
    const last = content[content.length - 1]
    const listItem: JSONContent = { type: 'listItem', content: [paragraph] }

    if (last?.type === 'bulletList') {
      last.content = [...(last.content ?? []), listItem]
    } else {
      content.push({ type: 'bulletList', content: [listItem] })
    }
  }

  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] }
}
