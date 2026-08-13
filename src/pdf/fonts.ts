import { Font } from '@react-pdf/renderer'
import RobotoBold from './fonts/Roboto-Bold.ttf'
import RobotoBoldItalic from './fonts/Roboto-BoldItalic.ttf'
import RobotoItalic from './fonts/Roboto-Italic.ttf'
import RobotoRegular from './fonts/Roboto-Regular.ttf'
import { FONT_FAMILY } from './theme'

let registered = false

/**
 * Fonts are bundled rather than fetched from Google's CDN: the URLs the original
 * template used had already gone stale (404), and a network round trip inside PDF
 * generation is a failure mode with no upside.
 *
 * All four variants are registered because react-pdf throws rather than falling
 * back — a style using an unregistered weight or fontStyle fails the whole render
 * with "Could not resolve font for Roboto". Adding a new variant to a style means
 * adding the matching file here.
 */
export const registerFonts = (): void => {
  if (registered) return

  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: RobotoRegular, fontWeight: 400 },
      { src: RobotoBold, fontWeight: 700 },
      { src: RobotoItalic, fontWeight: 400, fontStyle: 'italic' },
      { src: RobotoBoldItalic, fontWeight: 700, fontStyle: 'italic' },
    ],
  })

  // react-pdf hyphenates aggressively by default, breaking words mid-line in a
  // way that reads badly in a CV. Returning the whole word disables it.
  Font.registerHyphenationCallback((word) => [word])

  registered = true
}
