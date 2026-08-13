import type { ReactNode } from 'react'
import {
  Document,
  Image,
  Page,
  Path,
  Polygon,
  StyleSheet,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer'
import type { Cv } from '@/schema/cv'
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
  profileBullets,
  projectEntries,
  qualificationLine,
} from './model'
import { FONT_FAMILY, PAGE_SIZE, colors, layout, type } from './theme'

/**
 * Static branding from the original slide, not part of the CV data model. Set to
 * null to drop it, or thread it through props to make it per-user.
 */
const BRAND_LOGO: string | null = brandLogo

registerFonts()

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    backgroundColor: colors.pageBg,
    color: colors.text,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.headerHeight,
    paddingHorizontal: layout.cardMargin,
    paddingVertical: 8,
    backgroundColor: colors.accent,
  },
  chevrons: {
    marginRight: 14,
  },
  photo: {
    width: layout.photoSize,
    height: layout.photoSize,
    marginRight: 18,
    borderRadius: layout.photoSize / 2,
    objectFit: 'cover',
  },
  identity: {
    flex: 1,
    alignItems: 'flex-start',
  },
  namePill: {
    minWidth: 240,
    marginBottom: 10,
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 16,
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
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: 420,
    marginTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  contactIcon: {
    marginRight: 5,
  },
  contactText: {
    fontSize: type.contact,
    color: colors.surface,
  },
  logo: {
    width: layout.logoWidth,
    height: layout.logoHeight,
    marginLeft: 18,
    objectFit: 'contain',
  },

  card: {
    position: 'relative',
    flexGrow: 1,
    marginHorizontal: layout.cardMargin,
    marginTop: 22,
    marginBottom: layout.cardMargin,
    padding: 14,
    backgroundColor: colors.cardFill,
    borderRadius: layout.cardRadius,
  },
  cardTab: {
    position: 'absolute',
    top: '42%',
    width: layout.tabWidth,
    height: layout.tabHeight,
    backgroundColor: colors.accent,
    borderRadius: 2,
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
    marginVertical: 14,
  },

  section: {
    marginBottom: 14,
  },
  labelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.labelBg,
    borderRadius: 4,
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
    marginTop: -20,
    marginLeft: 4,
  },

  body: {
    fontSize: type.body,
    lineHeight: 1.5,
  },
  strong: {
    fontWeight: 700,
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 2,
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
  children: ReactNode
}

function Section({ label, onBorder, children }: SectionProps) {
  return (
    // minPresenceAhead keeps a heading from being orphaned at the foot of a page.
    <View style={styles.section} minPresenceAhead={40}>
      <View style={onBorder ? [styles.labelBar, styles.labelOnBorder] : styles.labelBar}>
        <View style={styles.labelDash} />
        <Text style={styles.label}>{label}</Text>
      </View>
      {children}
    </View>
  )
}

/** Decorative chevrons beside the logo, colors lifted from the original slide's circles. */
function Chevrons() {
  return (
    <Svg width={54} height={40} viewBox="0 0 54 40" style={styles.chevrons}>
      <Polygon points="36,4 16,20 36,36 44,36 24,20 44,4" fill={colors.accentLight} />
      <Polygon points="44,4 24,20 44,36 52,36 32,20 52,4" fill={colors.accentMid} />
    </Svg>
  )
}

function MailIcon() {
  return (
    <Svg width={10} height={8} viewBox="0 0 20 16" style={styles.contactIcon}>
      <Path d="M1 1 H19 V15 H1 Z M1 1 L10 9 L19 1" stroke={colors.surface} strokeWidth={1.4} fill="none" />
    </Svg>
  )
}

function PinIcon() {
  return (
    <Svg width={9} height={11} viewBox="0 0 16 20" style={styles.contactIcon}>
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
        <Image style={styles.photo} src={cv.personal.photo} />
      )}

      <View style={styles.identity}>
        {name !== '' && (
          <View style={styles.namePill}>
            <Text style={styles.nameText}>{name}</Text>
          </View>
        )}
        {cv.personal.headline.trim() !== '' && (
          <Text style={styles.headlineText}>{cv.personal.headline}</Text>
        )}
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

      {BRAND_LOGO !== null && <Chevrons />}
      {BRAND_LOGO !== null && <Image style={styles.logo} src={BRAND_LOGO} />}
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
        <Header cv={cv} />

        <View style={styles.card}>
          <View style={[styles.cardTab, styles.cardTabLeft]} />
          <View style={[styles.cardTab, styles.cardTabRight]} />
          <View style={styles.columns}>
            <View style={styles.leftColumn}>
              {present.profile && (
                <Section label="Profile summary" onBorder>
                  {profileBullets(cv.profile.summary).map((line) => (
                    <Bullet key={line}>{line}</Bullet>
                  ))}
                </Section>
              )}

              {present.qualifications && (
                <Section label="Qualifications" onBorder={!present.profile}>
                  {cv.qualifications.map((entry) => (
                    <Bullet key={entry.id}>{qualificationLine(entry)}</Bullet>
                  ))}
                </Section>
              )}

              {present.expertise && (
                <Section
                  label="Areas of expertise"
                  onBorder={!present.profile && !present.qualifications}
                >
                  {expertiseLines(cv).map((line) => (
                    <Text key={line.id} style={styles.body}>
                      <Text style={styles.strong}>{line.label}: </Text>
                      {line.value}
                    </Text>
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
                      {entry.bullets.map((bullet) => (
                        <Bullet key={bullet}>{bullet}</Bullet>
                      ))}
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
          <View style={styles.card}>
            <View style={[styles.cardTab, styles.cardTabLeft]} />
            <View style={[styles.cardTab, styles.cardTabRight]} />
            <View style={styles.columns}>
              <View style={styles.leftColumn}>
                {present.certifications && (
                  <Section label="Certifications & Trainings" onBorder>
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
                    {project.description !== '' && (
                      <Text style={styles.body}>{project.description}</Text>
                    )}
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
