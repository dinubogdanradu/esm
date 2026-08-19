import { plainRun, type RichText } from '@/schema/richText'
import { fromEditorDoc, toEditorDoc } from './richTextDoc'

const marked = (text: string, marks: Partial<Record<'bold' | 'italic' | 'underline', boolean>>) => ({
  text,
  bold: false,
  italic: false,
  underline: false,
  ...marks,
})

describe('fromEditorDoc', () => {
  test('reads paragraphs and their marks', () => {
    const value = fromEditorDoc({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Cut deploys ' },
            { type: 'text', text: '45min', marks: [{ type: 'bold' }] },
            {
              type: 'text',
              text: ' overall',
              marks: [{ type: 'italic' }, { type: 'underline' }],
            },
          ],
        },
      ],
    })

    expect(value.blocks).toHaveLength(1)
    expect(value.blocks[0]?.type).toBe('paragraph')
    expect(value.blocks[0]?.runs).toEqual([
      marked('Cut deploys ', {}),
      marked('45min', { bold: true }),
      marked(' overall', { italic: true, underline: true }),
    ])
  })

  test('flattens a bullet list into one block per item', () => {
    const value = fromEditorDoc({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }],
            },
          ],
        },
      ],
    })

    expect(value.blocks.map((block) => block.type)).toEqual(['bullet', 'bullet'])
    expect(value.blocks.map((block) => block.runs[0]?.text)).toEqual([
      'First',
      'Second',
    ])
  })

  test('an empty paragraph survives as a block with no runs', () => {
    const value = fromEditorDoc({ type: 'doc', content: [{ type: 'paragraph' }] })

    expect(value.blocks).toEqual([{ type: 'paragraph', runs: [] }])
  })

  test('a hard break becomes a space rather than a lost character', () => {
    const value = fromEditorDoc({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'One' },
            { type: 'hardBreak' },
            { type: 'text', text: 'two' },
          ],
        },
      ],
    })

    expect(value.blocks[0]?.runs.map((run) => run.text)).toEqual(['One', ' ', 'two'])
  })
})

describe('toEditorDoc', () => {
  test('groups consecutive bullets into a single list', () => {
    const doc = toEditorDoc({
      blocks: [
        { type: 'bullet', runs: [plainRun('First')] },
        { type: 'bullet', runs: [plainRun('Second')] },
        { type: 'paragraph', runs: [plainRun('After')] },
        { type: 'bullet', runs: [plainRun('Third')] },
      ],
    })

    expect(doc.content?.map((node) => node.type)).toEqual([
      'bulletList',
      'paragraph',
      'bulletList',
    ])
    expect(doc.content?.[0]?.content).toHaveLength(2)
    expect(doc.content?.[2]?.content).toHaveLength(1)
  })

  test('carries marks back onto the runs', () => {
    const doc = toEditorDoc({
      blocks: [
        { type: 'paragraph', runs: [marked('Led', { bold: true, italic: true })] },
      ],
    })

    const run = doc.content?.[0]?.content?.[0]
    expect(run?.marks?.map((mark) => mark.type).sort()).toEqual(['bold', 'italic'])
  })

  test('an empty document still yields one paragraph for the editor', () => {
    expect(toEditorDoc({ blocks: [] })).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
  })
})

describe('round trip', () => {
  test('survives editor and back unchanged', () => {
    const value: RichText = {
      blocks: [
        { type: 'paragraph', runs: [marked('Intro', { underline: true })] },
        { type: 'bullet', runs: [plainRun('First'), marked(' bold', { bold: true })] },
        { type: 'bullet', runs: [plainRun('Second')] },
      ],
    }

    expect(fromEditorDoc(toEditorDoc(value))).toEqual(value)
  })
})
