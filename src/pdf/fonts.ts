import { Font } from '@react-pdf/renderer'
import RobotoBold from './fonts/Roboto-Bold.ttf'
import RobotoRegular from './fonts/Roboto-Regular.ttf'
import { FONT_FAMILY } from './theme'

let registered = false

/**
 * Fonts are bundled rather than fetched from Google's CDN: the URLs the original
 * template used had already gone stale (404), and a network round trip inside PDF
 * generation is a failure mode with no upside.
 */
export const registerFonts = (): void => {
  if (registered) return

  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: RobotoRegular, fontWeight: 400 },
      { src: RobotoBold, fontWeight: 700 },
    ],
  })

  // react-pdf hyphenates aggressively by default, breaking words mid-line in a
  // way that reads badly in a CV. Returning the whole word disables it.
  Font.registerHyphenationCallback((word) => [word])

  registered = true
}
