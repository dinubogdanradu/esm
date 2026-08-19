import type { ReactNode } from 'react'
import {
  Defs,
  Document,
  Image,
  LinearGradient,
  Page,
  Path,
  Polygon,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer'
import type { Cv } from '@/schema/cv'
import type { RichRun, RichText as RichTextValue } from '@/schema/richText'
import brandLogo from './assets/infosys-logo.png'
import { registerFonts } from './fonts'
import {
  certificationLine,
  contactLines,
  experienceEntries,
  expertiseLines,
  fullName,
  hasSecondPageContent,
  languageLine,
  presentSections,
  renderableRichText,
  projectEntries,
  qualificationLine,
} from './model'
import { FONT_FAMILY, PAGE_SIZE, colors, layout, type } from './theme'

const [PAGE_WIDTH, PAGE_HEIGHT] = PAGE_SIZE

/**
 * Static branding from the original slide, not part of the CV data model. Set to
 * null to drop it, or thread it through props to make it per-user.
 */
const BRAND_LOGO: string | null = brandLogo

registerFonts()

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    // Only a fallback: the gradient is drawn by PageBackground. react-pdf's
    // backgroundColor takes solid colours only.
    backgroundColor: colors.pageGradientTop,
    color: colors.text,
  },
  pageBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  },

  header: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.headerHeight,
    paddingHorizontal: layout.cardMargin,
    paddingVertical: 12,
    backgroundColor: colors.header,
  },
  chevrons: {
    marginRight: 16,
  },
  /**
   * The white ring is the frame's own background, not a border on the Image:
   * react-pdf strokes an image's border *before* painting the image, so the image
   * covers it and nothing shows. The outer diameter stays photoSize, so the header
   * layout is unchanged.
   */
  photoFrame: {
    width: layout.photoSize,
    height: layout.photoSize,
    marginRight: 18,
    padding: layout.photoBorder,
    borderRadius: layout.photoSize / 2,
    backgroundColor: colors.surface,
  },
  photo: {
    width: layout.photoSize - layout.photoBorder * 2,
    height: layout.photoSize - layout.photoBorder * 2,
    borderRadius: (layout.photoSize - layout.photoBorder * 2) / 2,
    objectFit: 'cover',
  },
  identity: {
    flex: 1,
    alignItems: 'flex-start',
  },
  /**
   * Shrinks to the pill's width, so centring here puts both the name and the
   * headline on the pill's centre axis rather than the header's.
   */
  identityBlock: {
    alignItems: 'center',
  },
  namePill: {
    minWidth: 260,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  nameText: {
    fontSize: type.name,
    fontWeight: 700,
    textAlign: 'center',
  },
  headlineText: {
    fontSize: type.headline,
    fontWeight: 700,
    color: colors.surface,
    textAlign: 'center',
  },
  contactRow: {
    position: 'absolute',
    // Both edges are anchored on purpose: with only `right` set the box collapses
    // to a narrow width and the addresses wrap mid-word.
    left: layout.cardMargin,
    right: layout.cardMargin,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 18,
  },
  contactIcon: {
    marginRight: 6,
  },
  contactText: {
    fontSize: type.contact,
    fontWeight: 700,
    color: colors.surface,
  },
  logo: {
    width: layout.logoWidth,
    height: layout.logoHeight,
    marginLeft: 20,
    objectFit: 'contain',
  },

  card: {
    position: 'relative',
    flexGrow: 1,
    marginHorizontal: layout.cardMargin,
    marginTop: 26,
    marginBottom: layout.cardMargin,
    padding: 16,
    backgroundColor: colors.cardFill,
    // Top-right only, so the card reads as a folded corner rather than a pill.
    borderTopRightRadius: layout.cardRadius,
  },
  cardTab: {
    position: 'absolute',
    top: '42%',
    width: layout.tabWidth,
    height: layout.tabHeight,
    backgroundColor: colors.accent,
  },
  cardTabLeft: {
    left: -layout.tabWidth / 2,
  },
  cardTabRight: {
    right: -layout.tabWidth / 2,
  },
  columns: {
    flexDirection: 'row',
  },
  leftColumn: {
    flexBasis: `${layout.leftColumnFlex}%`,
    paddingRight: layout.columnGap,
  },
  columnDivider: {
    width: 1,
    borderLeftWidth: 1,
    borderLeftStyle: 'dashed',
    borderLeftColor: colors.dashDivider,
    marginHorizontal: 4,
  },
  rightColumn: {
    flexBasis: `${layout.rightColumnFlex}%`,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopStyle: 'dashed',
    borderTopColor: colors.dashDivider,
    // Deliberately tight, and asymmetric so the rule reads as closing the section it
    // follows. These values are load-bearing for pagination, not just taste — see the
    // page-budget note in docs/PLAN.md before growing them.
    marginTop: 2,
    marginBottom: 6,
  },

  section: {
    marginBottom: 4,
  },
  labelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  labelBarDark: {
    backgroundColor: colors.labelBgDark,
  },
  labelBarBlue: {
    backgroundColor: colors.labelBgBlue,
  },
  labelDash: {
    width: 20,
    height: 2,
    marginRight: 8,
    backgroundColor: colors.surface,
  },
  label: {
    color: colors.surface,
    fontSize: type.label,
    fontStyle: 'italic',
  },
  /** Lifts the topmost label so it straddles the card's top edge, as in the slide. */
  labelOnBorder: {
    marginTop: -24,
    marginLeft: 0,
  },

  body: {
    fontSize: type.body,
    lineHeight: 1.5,
  },
  strong: {
    fontWeight: 700,
  },
  runBold: {
    fontWeight: 700,
  },
  runItalic: {
    fontStyle: 'italic',
  },
  runUnderline: {
    textDecoration: 'underline',
  },
  /** Certification URLs under an expertise group; restyle freely. */
  expertiseLink: {
    marginLeft: 8,
    color: colors.accent,
    fontSize: type.body,
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 1,
  },
  bulletDot: {
    width: 8,
    fontSize: type.body,
  },
  bulletText: {
    flex: 1,
    fontSize: type.body,
    lineHeight: 1.4,
  },
  entryTitle: {
    marginTop: 4,
    marginBottom: 1,
    color: colors.navy,
    fontSize: type.entryTitle,
    fontWeight: 700,
    textDecoration: 'underline',
  },
  entryMeta: {
    marginBottom: 3,
    color: colors.navy,
    fontSize: type.body,
  },
  entryTech: {
    marginTop: 2,
    color: colors.accent,
    fontSize: type.body,
  },
  subheading: {
    marginBottom: 2,
    fontSize: type.body,
    fontWeight: 700,
  },
  spacedSubheading: {
    marginTop: 8,
    marginBottom: 2,
    fontSize: type.body,
    fontWeight: 700,
  },
})

const PAGE_GRADIENT_ID = 'pageBackdrop'

/**
 * The page's vertical gradient, drawn as an SVG shading rect because react-pdf's
 * `backgroundColor` only accepts solid colours. `fixed` repeats it on continuation
 * pages, and rendering it as each Page's first child puts it behind the content.
 */
function PageBackground() {
  return (
    <View fixed style={styles.pageBackground}>
      <Svg
        width={PAGE_WIDTH}
        height={PAGE_HEIGHT}
        viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
      >
        <Defs>
          {/*
            Vertical axis down the page's centre line. x must be the same non-zero
            value on both ends: react-pdf reads `x2` as `props.x2 || 1`, so passing 0
            silently becomes 1 and tilts the gradient.
          */}
          <LinearGradient
            id={PAGE_GRADIENT_ID}
            gradientUnits="userSpaceOnUse"
            x1={PAGE_WIDTH / 2}
            y1={0}
            x2={PAGE_WIDTH / 2}
            y2={PAGE_HEIGHT}
          >
            <Stop offset={0} stopColor={colors.pageGradientTop} />
            <Stop offset={1} stopColor={colors.pageGradientBottom} />
          </LinearGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={PAGE_WIDTH}
          height={PAGE_HEIGHT}
          fill={`url(#${PAGE_GRADIENT_ID})`}
        />
      </Svg>
    </View>
  )
}

/**
 * Rich text runs. Bold and italic combine because all four Roboto variants are
 * registered; an unregistered combination would fail the whole render.
 */
function Runs({ runs }: { runs: RichRun[] }) {
  return (
    <>
      {runs.map((run, index) => {
        const marks = [
          run.bold ? styles.runBold : undefined,
          run.italic ? styles.runItalic : undefined,
          run.underline ? styles.runUnderline : undefined,
        ].filter((mark) => mark !== undefined)

        return marks.length === 0 ? (
          <Text key={index}>{run.text}</Text>
        ) : (
          <Text key={index} style={marks}>
            {run.text}
          </Text>
        )
      })}
    </>
  )
}

/** Blocks of a rich-text field: bullets keep the shared Bullet layout. */
function RichText({ value }: { value: RichTextValue }) {
  return (
    <>
      {renderableRichText(value).blocks.map((block, index) =>
        block.type === 'bullet' ? (
          <Bullet key={index}>
            <Runs runs={block.runs} />
          </Bullet>
        ) : (
          <Text key={index} style={styles.body}>
            <Runs runs={block.runs} />
          </Text>
        ),
      )}
    </>
  )
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>{'•'}</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  )
}

type SectionProps = {
  label: string
  onBorder?: boolean
  variant?: 'dark' | 'blue'
  children: ReactNode
}

function Section({ label, onBorder, variant = 'blue', children }: SectionProps) {
  const background =
    variant === 'dark' ? styles.labelBarDark : styles.labelBarBlue

  return (
    // minPresenceAhead keeps a heading from being orphaned at the foot of a page.
    <View style={styles.section} minPresenceAhead={40}>
      <View
        style={
          onBorder
            ? [styles.labelBar, background, styles.labelOnBorder]
            : [styles.labelBar, background]
        }
      >
        <View style={styles.labelDash} />
        <Text style={styles.label}>{label}</Text>
      </View>
      {children}
    </View>
  )
}

/**
 * Decorative chevrons beside the logo: left-pointing marks with a 90-degree tip and
 * a triangular notch cut into the right side, which leaves two vertical right edges.
 * Three of them, palest first, set tip-to-edge so each tip lands on the axis formed
 * by the right edges of the mark before it.
 */
const CHEVRON = {
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
const CHEVRON_SPAN = CHEVRON.markWidth * 2
const CHEVRON_HEIGHT = CHEVRON.top * 2 + CHEVRON_SPAN

const CHEVRON_FILLS = [colors.surface, colors.accentLight, colors.accentMid] as const

/** Tip-to-edge: no gap, so each mark starts where the previous one ends. */
export const chevronOffsets = (): number[] =>
  CHEVRON_FILLS.map((_, index) => index * CHEVRON.markWidth)

const CHEVRON_WIDTH = CHEVRON.markWidth * CHEVRON_FILLS.length

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

function Chevrons() {
  return (
    <Svg
      width={CHEVRON_WIDTH}
      height={CHEVRON_HEIGHT}
      viewBox={`0 0 ${CHEVRON_WIDTH} ${CHEVRON_HEIGHT}`}
      style={styles.chevrons}
    >
      {chevronOffsets().map((offset, index) => (
        <Polygon
          key={offset}
          points={chevronPoints(offset)}
          fill={CHEVRON_FILLS[index]}
        />
      ))}
    </Svg>
  )
}

function MailIcon() {
  return (
    <Svg width={13} height={10.4} viewBox="0 0 20 16" style={styles.contactIcon}>
      <Path d="M1 1 H19 V15 H1 Z M1 1 L10 9 L19 1" stroke={colors.surface} strokeWidth={1.4} fill="none" />
    </Svg>
  )
}

function PinIcon() {
  return (
    <Svg width={11.7} height={14.3} viewBox="0 0 16 20" style={styles.contactIcon}>
      <Path
        d="M8 0 C3.6 0 0 3.4 0 7.6 C0 13 8 20 8 20 C8 20 16 13 16 7.6 C16 3.4 12.4 0 8 0 Z"
        fill={colors.surface}
      />
    </Svg>
  )
}

function Header({ cv }: { cv: Cv }) {
  const name = fullName(cv)
  const contacts = contactLines(cv)

  return (
    <View style={styles.header}>
      {cv.personal.photo !== '' && (
        <View style={styles.photoFrame}>
          <Image style={styles.photo} src={cv.personal.photo} />
        </View>
      )}

      <View style={styles.identity}>
        <View style={styles.identityBlock}>
          {name !== '' && (
            <View style={styles.namePill}>
              <Text style={styles.nameText}>{name}</Text>
            </View>
          )}
          {cv.personal.headline.trim() !== '' && (
            <Text style={styles.headlineText}>{cv.personal.headline}</Text>
          )}
        </View>
      </View>

      {BRAND_LOGO !== null && <Chevrons />}
      {BRAND_LOGO !== null && <Image style={styles.logo} src={BRAND_LOGO} />}

      {contacts.length > 0 && (
        <View style={styles.contactRow}>
          {contacts.map((contact, index) => (
            <View key={contact} style={styles.contactItem}>
              {index === 0 ? <MailIcon /> : <PinIcon />}
              <Text style={styles.contactText}>{contact}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export default function CvDocument({ cv }: { cv: Cv }) {
  const present = presentSections(cv)
  const experience = experienceEntries(cv.experience)
  const projects = projectEntries(cv.projects)
  const name = fullName(cv)

  return (
    <Document title={name === '' ? 'CV' : `${name} - CV`} author={name}>
      <Page size={PAGE_SIZE} style={styles.page} wrap>
        <PageBackground />
        <Header cv={cv} />

        <View style={styles.card}>
          <View style={[styles.cardTab, styles.cardTabLeft]} />
          <View style={[styles.cardTab, styles.cardTabRight]} />
          <View style={styles.columns}>
            <View style={styles.leftColumn}>
              {present.profile && (
                <Section label="Profile summary" onBorder variant="dark">
                  <RichText value={cv.profile.summary} />
                </Section>
              )}

              {present.profile && (present.qualifications || present.expertise) && (
                <View style={styles.rowDivider} />
              )}

              {present.qualifications && (
                <Section label="Qualifications" onBorder={!present.profile}>
                  {cv.qualifications.map((entry) => (
                    <Bullet key={entry.id}>{qualificationLine(entry)}</Bullet>
                  ))}
                </Section>
              )}

              {present.qualifications && present.expertise && (
                <View style={styles.rowDivider} />
              )}

              {present.expertise && (
                <Section
                  label="Areas of expertise"
                  onBorder={!present.profile && !present.qualifications}
                  variant="dark"
                >
                  {expertiseLines(cv).map((line) => (
                    <View key={line.key}>
                      <Text style={styles.body}>
                        <Text style={styles.strong}>{line.label}: </Text>
                        {line.value}
                      </Text>
                      {line.links.map((link) => (
                        <Text key={link} style={styles.expertiseLink}>
                          {link}
                        </Text>
                      ))}
                    </View>
                  ))}
                </Section>
              )}
            </View>

            <View style={styles.columnDivider} />

            <View style={styles.rightColumn}>
              {present.experience && (
                <Section label="Experience summary" onBorder>
                  {experience.map((entry) => (
                    <View key={entry.id} minPresenceAhead={30}>
                      <Text style={styles.entryTitle}>{entry.title}</Text>
                      {entry.meta !== '' && (
                        <Text style={styles.entryMeta}>{entry.meta}</Text>
                      )}
                      <RichText value={entry.achievements} />
                      {entry.tech !== '' && (
                        <Text style={styles.entryTech}>{entry.tech}</Text>
                      )}
                    </View>
                  ))}
                </Section>
              )}
            </View>
          </View>
        </View>
      </Page>

      {hasSecondPageContent(cv) && (
        <Page size={PAGE_SIZE} style={styles.page} wrap>
          <PageBackground />
          <View style={styles.card}>
            <View style={[styles.cardTab, styles.cardTabLeft]} />
            <View style={[styles.cardTab, styles.cardTabRight]} />
            <View style={styles.columns}>
              <View style={styles.leftColumn}>
                {present.certifications && (
                  <Section label="Certifications & Trainings" onBorder variant="dark">
                    {cv.certifications.map((entry) => (
                      <Bullet key={entry.id}>{certificationLine(entry)}</Bullet>
                    ))}
                  </Section>
                )}
              </View>

              <View style={styles.columnDivider} />

              <View style={styles.rightColumn}>
                {(present.languages || present.softSkills) && (
                  <Section label="Languages & Soft Skills" onBorder>
                    {present.languages && (
                      <>
                        <Text style={styles.subheading}>Languages</Text>
                        {cv.languages.map((language) => (
                          <Bullet key={language.id}>
                            {languageLine(language.name, language.level)}
                          </Bullet>
                        ))}
                      </>
                    )}
                    {present.softSkills && (
                      <>
                        <Text
                          style={
                            present.languages
                              ? styles.spacedSubheading
                              : styles.subheading
                          }
                        >
                          Soft Skills
                        </Text>
                        <Text style={styles.body}>
                          {cv.softSkills
                            .map((skill) => skill.name.trim())
                            .filter((skill) => skill !== '')
                            .join(', ')}
                        </Text>
                      </>
                    )}
                  </Section>
                )}
              </View>
            </View>

            {(present.certifications || present.languages || present.softSkills) &&
              present.projects && <View style={styles.rowDivider} />}

            {present.projects && (
              <Section label="Personal Projects">
                {projects.map((project) => (
                  <View key={project.id} minPresenceAhead={30}>
                    <Text style={styles.entryTitle}>{project.title}</Text>
                    {project.meta !== '' && (
                      <Text style={styles.entryMeta}>{project.meta}</Text>
                    )}
                    <RichText value={project.description} />
                    {project.tech !== '' && (
                      <Text style={styles.entryTech}>{project.tech}</Text>
                    )}
                  </View>
                ))}
              </Section>
            )}
          </View>
        </Page>
      )}
    </Document>
  )
}
