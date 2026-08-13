import type { ReactNode } from 'react'
import {
  Document,
  Image,
  Page,
  StyleSheet,
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
    backgroundColor: colors.surface,
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
    marginRight: 14,
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
    flexGrow: 1,
    marginHorizontal: layout.cardMargin,
    marginTop: 22,
    marginBottom: layout.cardMargin,
    padding: 14,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.text,
    borderRadius: layout.cardRadius,
  },
  columns: {
    flexDirection: 'row',
  },
  leftColumn: {
    flexBasis: `${layout.leftColumnFlex}%`,
    paddingRight: layout.columnGap,
  },
  rightColumn: {
    flexBasis: `${layout.rightColumnFlex}%`,
  },

  section: {
    marginBottom: 14,
  },
  label: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
    color: colors.accent,
    fontSize: type.label,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  /** Lifts the topmost label so it straddles the card border, as in the slide. */
  labelOnBorder: {
    marginTop: -21,
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
      <Text style={onBorder ? [styles.label, styles.labelOnBorder] : styles.label}>
        {label}
      </Text>
      {children}
    </View>
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
            {contacts.map((contact) => (
              <Text key={contact} style={styles.contactItem}>
                {contact}
              </Text>
            ))}
          </View>
        )}
      </View>

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

            {present.projects && (
              <Section label="Projects">
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
