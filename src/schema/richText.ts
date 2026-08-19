import { z } from 'zod'

/**
 * A deliberately flat rich-text model: a list of blocks, each a list of styled runs.
 * It is not the editor's document format — Tiptap's JSON is converted at the field
 * boundary — so the schema, the PDF and the PPTX all consume one stable shape that
 * cannot drift if the editor library changes. Nested lists are not representable,
 * which is why the editor only enables a flat bullet list.
 */
export const richRunSchema = z.object({
  text: z.string(),
  bold: z.boolean(),
  italic: z.boolean(),
  underline: z.boolean(),
})

export const richBlockSchema = z.object({
  type: z.enum(['paragraph', 'bullet']),
  runs: z.array(richRunSchema),
})

export const richTextSchema = z.object({
  blocks: z.array(richBlockSchema),
})

export type RichRun = z.infer<typeof richRunSchema>
export type RichBlock = z.infer<typeof richBlockSchema>
export type RichText = z.infer<typeof richTextSchema>

export const emptyRichText = (): RichText => ({ blocks: [] })

export const plainRun = (text: string): RichRun => ({
  text,
  bold: false,
  italic: false,
  underline: false,
})

/** Text of one block, with its runs concatenated. */
export const blockText = (block: RichBlock): string =>
  block.runs.map((run) => run.text).join('')

export const richTextIsEmpty = (value: RichText): boolean =>
  value.blocks.every((block) => blockText(block).trim() === '')

export const richTextToPlain = (value: RichText): string =>
  value.blocks
    .map(blockText)
    .filter((line) => line.trim() !== '')
    .join('\n')

/**
 * Builds a document from plain text, one block per non-empty line. Used to migrate
 * drafts written before these fields were rich text, and by tests.
 */
export const richTextFromPlain = (
  text: string,
  type: RichBlock['type'] = 'bullet',
): RichText => ({
  blocks: text
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter((line) => line !== '')
    .map((line) => ({ type, runs: [plainRun(line)] })),
})

/** Drops empty runs and blocks, so trailing editor artefacts do not reach the CV. */
export const compactRichText = (value: RichText): RichText => ({
  blocks: value.blocks
    .map((block) => ({
      type: block.type,
      runs: block.runs.filter((run) => run.text !== ''),
    }))
    .filter((block) => blockText(block).trim() !== ''),
})
