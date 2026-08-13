/**
 * Design tokens lifted from the original slide template. The page is the slide's
 * 960x600 geometry used directly as PDF units, so it is landscape and the type
 * sizes look small relative to A4 numbers.
 */
export const PAGE_SIZE: [number, number] = [960, 600]

export const colors = {
  accent: '#0F9CD8',
  navy: '#0b2540',
  text: '#000000',
  surface: '#ffffff',
} as const

export const layout = {
  headerHeight: 146,
  cardMargin: 26,
  cardRadius: 8,
  photoSize: 130,
  logoWidth: 97,
  logoHeight: 49,
  /** Left column holds the narrow sections; right column holds experience. */
  leftColumnFlex: 40,
  rightColumnFlex: 60,
  columnGap: 18,
} as const

export const type = {
  name: 15,
  headline: 13.5,
  contact: 10,
  label: 10,
  entryTitle: 10,
  body: 8,
} as const

export const FONT_FAMILY = 'Roboto'
