import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import Bold from '@tiptap/extension-bold'
import BulletList from '@tiptap/extension-bullet-list'
import Document from '@tiptap/extension-document'
import HardBreak from '@tiptap/extension-hard-break'
import History from '@tiptap/extension-history'
import Italic from '@tiptap/extension-italic'
import ListItem from '@tiptap/extension-list-item'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Underline from '@tiptap/extension-underline'
import type { RichText } from '@/schema/richText'
import { fromEditorDoc, toEditorDoc } from './richTextDoc'
import styles from './RichTextField.module.css'

/**
 * Only the marks and nodes the stored model can represent are enabled, so the editor
 * cannot produce anything the PDF and PPTX exporters would have to drop.
 */
const EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  Bold,
  Italic,
  Underline,
  BulletList,
  ListItem,
  HardBreak,
  History,
]

export type RichTextEditorProps = {
  value: RichText
  onChange: (value: RichText) => void
  onBlur: () => void
  label: string
  inputId: string
  invalid: boolean
}

/**
 * Split from RichTextField and loaded lazily: ProseMirror is a large dependency and
 * only three steps need it, so it stays out of the initial bundle.
 */
export default function RichTextEditor({
  value,
  onChange,
  onBlur,
  label,
  inputId,
  invalid,
}: RichTextEditorProps) {
  // Held in refs because useEditor captures its options once: without this, an editor
  // inside a RepeatableSection would keep writing to the index it was created with
  // after a sibling is removed.
  const onChangeRef = useRef(onChange)
  const onBlurRef = useRef(onBlur)
  useEffect(() => {
    onChangeRef.current = onChange
    onBlurRef.current = onBlur
  })

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: toEditorDoc(value),
    editorProps: {
      attributes: {
        id: inputId,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        ...(invalid ? { 'aria-invalid': 'true' } : {}),
      },
    },
    onUpdate: ({ editor: instance }) =>
      onChangeRef.current(fromEditorDoc(instance.getJSON())),
    onBlur: () => onBlurRef.current(),
  })

  /**
   * Tiptap nulls its command manager on destroy, and the `commands` getter — unlike
   * `chain()` and `can()` — does not guard against that, so touching it after a
   * teardown throws "Cannot read properties of null (reading 'commands')". StrictMode
   * tears the editor down and remounts it, which is when this bites.
   */
  const usable = editor !== null && !editor.isDestroyed

  // Reflect changes that did not come from typing — a rehydrated draft, or a reset.
  // Comparing serialised documents avoids a feedback loop with onUpdate.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const incoming = toEditorDoc(value)
    if (JSON.stringify(editor.getJSON()) === JSON.stringify(incoming)) return

    // chain() rather than commands: the library guards it against a torn-down editor.
    editor.chain().setContent(incoming, { emitUpdate: false }).run()
  }, [editor, value])

  const toggles = [
    { mark: 'bold', label: 'Bold', className: styles.bold, glyph: 'B' },
    { mark: 'italic', label: 'Italic', className: styles.italic, glyph: 'I' },
    { mark: 'underline', label: 'Underline', className: styles.underline, glyph: 'U' },
  ] as const

  return (
    <>
      <div className={styles.toolbar}>
        {toggles.map((toggle) => (
          <button
            key={toggle.mark}
            type="button"
            className={`${styles.toolButton} ${toggle.className}`}
            aria-label={toggle.label}
            aria-pressed={usable && editor.isActive(toggle.mark)}
            onClick={() =>
              usable && editor.chain().focus().toggleMark(toggle.mark).run()
            }
          >
            {toggle.glyph}
          </button>
        ))}
        <button
          type="button"
          className={styles.toolButton}
          aria-label="Bullet list"
          aria-pressed={usable && editor.isActive('bulletList')}
          onClick={() => usable && editor.chain().focus().toggleBulletList().run()}
        >
          {'•≡'}
        </button>
      </div>

      <EditorContent className={styles.editor} editor={editor} />
    </>
  )
}
