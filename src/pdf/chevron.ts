import { colors } from './theme'

/**
 * Geometry for the decorative chevrons beside the logo, shared by the PDF and the
 * PPTX so the two cannot drift. Each mark is a left-pointing triangle with a
 * triangular notch cut into its right side, which leaves two vertical right edges.
 */
export const CHEVRON = {
  markWidth: 34,
  /** Padding above the tallest point, mirrored below. */
  top: 6,
  /** Horizontal depth of the cut-out. */
  notchDepth: 13.6,
} as const

/**
 * A 90-degree tip means the arms rise at 45 degrees, so the vertical span is exactly
 * twice the mark width. Deriving it keeps the angle correct if the width changes.
 */
export const CHEVRON_SPAN = CHEVRON.markWidth * 2
export const CHEVRON_HEIGHT = CHEVRON.top * 2 + CHEVRON_SPAN

export const CHEVRON_FILLS = [
  colors.surface,
  colors.accentLight,
  colors.accentMid,
] as const

export const CHEVRON_WIDTH = CHEVRON.markWidth * CHEVRON_FILLS.length

/** Tip-to-edge: no gap, so each mark starts where the previous one ends. */
export const chevronOffsets = (): number[] =>
  CHEVRON_FILLS.map((_, index) => index * CHEVRON.markWidth)

/**
 * The six points of one mark. The notch edges run parallel to the outer arms, so
 * both arms keep an even thickness, and the segments at `offset + markWidth` are the
 * vertical right edges.
 */
export const chevronPoints = (offset: number): string => {
  const { markWidth, top, notchDepth } = CHEVRON
  const midY = top + markWidth
  const bottom = top + CHEVRON_SPAN
  const right = offset + markWidth

  return [
    `${offset},${midY}`,
    `${right},${top}`,
    `${right},${midY - notchDepth}`,
    `${right - notchDepth},${midY}`,
    `${right},${midY + notchDepth}`,
    `${right},${bottom}`,
  ].join(' ')
}

/** The same marks as a standalone SVG, for consumers that cannot draw polygons. */
export const chevronSvg = (): string => {
  const polygons = chevronOffsets()
    .map(
      (offset, index) =>
        `<polygon points="${chevronPoints(offset)}" fill="${CHEVRON_FILLS[index]}"/>`,
    )
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHEVRON_WIDTH} ${CHEVRON_HEIGHT}" width="${CHEVRON_WIDTH}" height="${CHEVRON_HEIGHT}">${polygons}</svg>`
}
