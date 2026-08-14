/**
 * Design tokens lifted from the original slide template. The page is the slide's
 * 960x600 geometry used directly as PDF units, so it is landscape and the type
 * sizes look small relative to A4 numbers.
 */
export const PAGE_SIZE: [number, number] = [960, 600]

export const colors = {
  accent: '#007CC3',
  navy: '#362451',
  text: '#000000',
  surface: '#ffffff',
  /** Page backdrop — sampled from slide background. */
  pageBg: '#FDFDFD',
  /** Section-label bar background (sampled). */
  labelBgDark: '#17375E',
  /** PowerPoint accent1 with its 75% luminance modifier applied. */
  labelBgBlue: '#3B618E',
  /** Content card fill (sampled). */
  cardFill: '#FDFDFD',
  dashDivider: '#A9BAC6',
  /** Decorative header accent variants derived from primary accent. */
  accentLight: '#D5EAF8',
  accentMid: '#7FB0E0',
} as const

export const layout = {
  headerHeight: 160,
  cardMargin: 22,
  cardRadius: 26,
  photoSize: 140,
  logoWidth: 120,
  logoHeight: 60,
  /** Left column holds the narrow sections; right column holds experience. */
  leftColumnFlex: 40,
  rightColumnFlex: 60,
  columnGap: 18,
  tabWidth: 10,
  tabHeight: 46,
} as const

export const type = {
  name: 20,
  headline: 14,
  contact: 11,
  label: 11,
  entryTitle: 12,
  body: 9,
} as const

export const FONT_FAMILY = 'Roboto'
