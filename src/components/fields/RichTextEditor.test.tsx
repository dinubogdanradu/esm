import { StrictMode } from 'react'
import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from '@/AppRoutes'
import { clearDraft } from '@/storage/draft'

import { DRAFT_KEY } from '@/storage/draft'

beforeEach(() => clearDraft())

test('mounts with existing content under StrictMode without touching a torn-down editor', async () => {
  const errors: unknown[] = []
  const original = console.error
  console.error = (...args: unknown[]) => {
    errors.push(args[0])
    original(...args)
  }

  // Content matters: an empty document takes the early return before the editor is
  // touched, which is why an empty fixture never reproduced this.
  window.localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({ profile: { summary: 'Already written elsewhere.' } }),
  )

  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/build/profile']}>
        <AppRoutes />
      </MemoryRouter>
    </StrictMode>,
  )

  expect(
    await screen.findByRole('textbox', { name: 'Profile summary' }),
  ).toBeVisible()

  console.error = original
  const fatal = errors.filter((e) => String(e).includes('commands'))
  expect(fatal).toEqual([])
}, 20000)

test('the reason for the isDestroyed guard still holds', () => {
  // Tiptap's `commands` getter is `this.commandManager.commands` with no null check,
  // while `chain()` and `can()` fall back safely. If a future version guards it too,
  // this fails and the guard in RichTextEditor can be simplified.
  const editor = new Editor({
    element: document.createElement('div'),
    extensions: [Document, Paragraph, Text],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
  })

  editor.destroy()

  expect(editor.isDestroyed).toBe(true)
  expect(() => editor.commands).toThrow(/reading 'commands'/)
  expect(() => editor.chain()).not.toThrow()
})
