/**
 * React-PDF (@react-pdf/renderer) template recreating the "Avery Quinn"
 * PowerPoint CV, pixel-matched to the original slide geometry
 * (960x600 unit "slide" -> used directly as the PDF page size).
 *
 * Install:  npm install @react-pdf/renderer
 *
 * Usage:
 *   import { pdf } from '@react-pdf/renderer';
 *   import CVDocument from './CVPdfTemplate';
 *   const blob = await pdf(<CVDocument />).toBlob();
 *
 * Or render straight to a browser preview with <PDFViewer><CVDocument /></PDFViewer>.
 *
 * Assets: put the two images referenced below in an `assets/` folder next
 * to this file (already exported alongside this template):
 *   assets/photo.jpeg          - profile photo
 *   assets/infosys-logo.png    - company logo
 */
import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';

// The deck used Calibri (Office default). Calibri isn't embeddable without a
// licensed font file, so this registers Roboto (metrically similar, freely
// licensed) as the closest open substitute. Swap the src for a real Calibri
// .ttf if you have a license, and the styles below will render identically.
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf', fontWeight: 700 },
  ],
});

const BLUE = '#0F9CD8';
const NAVY = '#0b2540';
const TEXT = '#000000';
const LABEL = '#0F9CD8';

const styles = StyleSheet.create({
  page: { width: 960, height: 600, fontFamily: 'Roboto', backgroundColor: '#ffffff', position: 'relative' },
  headerBar: { position: 'absolute', top: 0, left: 0, width: 960, height: 146, backgroundColor: BLUE },
  photo: { position: 'absolute', top: 5, left: 26, width: 130, height: 130, borderRadius: 65, objectFit: 'cover' },
  namePill: { position: 'absolute', top: 48, left: 173, width: 313, height: 33, backgroundColor: '#ffffff', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nameText: { fontSize: 15, fontWeight: 700, color: TEXT },
  titleText: { position: 'absolute', top: 88, left: 240, width: 220, fontSize: 13.5, fontWeight: 700, color: '#ffffff' },
  contactText: { position: 'absolute', top: 116, fontSize: 10, color: '#ffffff' },
  logo: { position: 'absolute', top: 24, left: 851, width: 97, height: 49, objectFit: 'contain' },

  card: { position: 'absolute', border: '1pt solid #000000', borderRadius: 8 },
  label: { position: 'absolute', fontSize: 10, fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: 0.5, backgroundColor: '#ffffff', paddingHorizontal: 4 },
  body: { fontSize: 8, lineHeight: 1.5, color: TEXT },
  bullet: { flexDirection: 'row', marginBottom: 2 },
  bulletDot: { width: 8, fontSize: 8 },
  bulletText: { flex: 1, fontSize: 8, lineHeight: 1.4, color: TEXT },
  jobTitle: { fontSize: 10, fontWeight: 700, color: NAVY, marginBottom: 2, marginTop: 4 },
  projTitle: { fontSize: 10, fontWeight: 700, color: NAVY, marginBottom: 1 },
});

const Bullet = ({ children }) => (
  <View style={styles.bullet}>
    <Text style={styles.bulletDot}>{'\u2022'}</Text>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

const profileBullets = [
  'Over 18 years of experience with various technologies across the web spectrum (PHP, Javascript, Python, Java, CSS, bash, websockets etc)',
  'Good hardware and infrastructure knowledge (DevOps, CI/CD)',
  'Worked on more than 100 projects in Drupal, Wordpress, Django, Laravel, Zend, CodeIgniter, Magento, PrestaShop, VueJS, nodeJS, bash etc',
  'Worked for clients like retail, banking, telecoms and public sector clients',
];

const qualBullets = [
  'Bachelor\u2019s Degree (Electrical Engineering and Computer Science), Bucharest',
  'Masters in Anthropology (not graduated) \u2013 School of Social Sciences, Porto',
];

const northwindBullets = [
  'website maintenance and development',
  'design system implementation',
  'architecture design for new projects',
  'audit and improve website accessibility',
  'provide business analysis support for new features and projects (write documentation, use cases, create wireframes)',
  'oversee deployments (CI/CD)',
];

const studioBullets = [
  'develop websites and web applications for clients (from US and RO)',
  "provide support for clients' existing web applications",
  "provide hosting management and support for the company's servers and client servers",
  'write proposed architecture documentation for projects',
  'write step by step instructions of management interfaces of built applications',
  'develop internal application for credentials management',
  'develop internal development architecture based on docker',
  'develop internal web performance assessment application',
  'oversee project deployments (CI/CD)',
];

const personalProjects = [
  { title: 'Northwind Design System', text: 'Starting from the new theme for the northwind.example website I created a starterkit theme that was later used on all ITBAU Drupal projects and also projects from other departments. The main objective was to have a unified, easy to use and accessible (WCAG compliant) theme.' },
  { title: 'Digital Recordings Portal', text: 'For the Digital Recordings Portal, I created a new application from scratch that would integrate a new admin management interface, a new user-friendly and accessible player built from scratch, a new Access Control System, an integration with WIPO to provide automated transcription to meeting recordings and full-text search across all transcripts. Recently I also contributed in creating the technical documentation for an internal architecture review.' },
  { title: 'HP Event registration platform', text: 'Custom registration platform for conferences organised by HP Romania. It allows users to register their hotel rooms, confirm their attendance to conference panels and provide feedback after the event. It also integrates an SMS gateway service that notified users of the event schedule.' },
  { title: 'The Urbane Society', text: 'Online platform and mobile app API for providing discounts to private club members.' },
];

function Header() {
  return (
    <>
      <View style={styles.headerBar} />
      <Image style={styles.photo} src={require('./assets/photo.jpeg')} />
      <View style={styles.namePill}><Text style={styles.nameText}>Avery Quinn</Text></View>
      <Text style={styles.titleText}>Fullstack Developer</Text>
      <Text style={[styles.contactText, { left: 572 }]}>avery.quinn@example.com</Text>
      <Text style={[styles.contactText, { left: 797 }]}>Lisbon, Portugal</Text>
      <Image style={styles.logo} src={require('./assets/infosys-logo.png')} />
    </>
  );
}

function PageOne() {
  return (
    <Page size={[960, 600]} style={styles.page}>
      <Header />

      <View style={[styles.card, { top: 168, left: 26, width: 915, height: 427 }]} />

      <Text style={[styles.label, { top: 152, left: 40 }]}>Profile summary</Text>
      <View style={{ position: 'absolute', top: 189, left: 25, width: 373 }}>
        {profileBullets.map((b, i) => <Bullet key={i}>{b}</Bullet>)}
      </View>

      <Text style={[styles.label, { top: 345, left: 40 }]}>Qualifications</Text>
      <View style={{ position: 'absolute', top: 376, left: 25, width: 373 }}>
        {qualBullets.map((b, i) => <Bullet key={i}>{b}</Bullet>)}
      </View>

      <Text style={[styles.label, { top: 458, left: 40 }]}>Areas of expertise</Text>
      <View style={{ position: 'absolute', top: 500, left: 26, width: 373 }}>
        <Text style={styles.body}><Text style={{ fontWeight: 700 }}>Languages: </Text>PHP, Javascript, Python, Java, CSS, bash, websockets</Text>
        <Text style={[styles.body, { marginTop: 3 }]}><Text style={{ fontWeight: 700 }}>Frameworks: </Text>Drupal, Wordpress, Django, Laravel, Zend, CodeIgniter, Magento, PrestaShop, VueJS</Text>
        <Text style={[styles.body, { marginTop: 3 }]}><Text style={{ fontWeight: 700 }}>Database: </Text>MySQL, PostgreSQL, Oracle</Text>
        <Text style={[styles.body, { marginTop: 3 }]}><Text style={{ fontWeight: 700 }}>Versioning: </Text>GitLab, GitHub, Bitbucket</Text>
      </View>

      <Text style={[styles.label, { top: 152, left: 415 }]}>Experience summary</Text>
      <View style={{ position: 'absolute', top: 181, left: 415, width: 516 }}>
        <Text style={styles.jobTitle}>Senior Platform Developer &ndash; Northwind Analytics (Platform)</Text>
        {northwindBullets.map((b, i) => <Bullet key={i}>{b}</Bullet>)}
        <Text style={styles.jobTitle}>Senior Fullstack Web Developer &ndash; Harbourline Studio, Lisbon, Portugal</Text>
        {studioBullets.map((b, i) => <Bullet key={i}>{b}</Bullet>)}
      </View>
    </Page>
  );
}

function PageTwo() {
  return (
    <Page size={[960, 600]} style={styles.page}>
      <View style={[styles.card, { top: 51, left: 26, width: 915, height: 537 }]} />

      <Text style={[styles.label, { top: 35, left: 40 }]}>Certifications &amp; Trainings</Text>
      <View style={{ position: 'absolute', top: 75, left: 27, width: 373 }}>
        <Text style={[styles.body, { fontWeight: 700 }]}>Certifications</Text>
        <Bullet>Certified Platform Engineer</Bullet>
        <Bullet>Certified Systems Architect</Bullet>
        <Text style={[styles.body, { fontWeight: 700, marginTop: 6 }]}>Trainings</Text>
        <Bullet>PL/SQL</Bullet>
        <Bullet>Drupal content deployment</Bullet>
        <Bullet>Web accessibility</Bullet>
      </View>

      <Text style={[styles.label, { top: 35, left: 414 }]}>Languages &amp; Soft Skills</Text>
      <View style={{ position: 'absolute', top: 71, left: 399, width: 373 }}>
        <Text style={[styles.body, { fontWeight: 700 }]}>Languages</Text>
        <Bullet>English - Proficient</Bullet>
        <Bullet>French - Advanced</Bullet>
        <Bullet>Italian &ndash; Beginner</Bullet>
        <Bullet>Spanish - Beginner</Bullet>
        <Text style={[styles.body, { fontWeight: 700, marginTop: 6 }]}>Soft Skills</Text>
        <Text style={styles.body}>Communication, active listening, teamwork, integrity, adaptability, critical thinking, empathy, problem-solving</Text>
      </View>

      <Text style={[styles.label, { top: 302, left: 40 }]}>Personal Projects</Text>
      <View style={{ position: 'absolute', top: 335, left: 25, width: 906 }}>
        {personalProjects.map((p, i) => (
          <View key={i} style={{ marginBottom: 8 }}>
            <Text style={styles.projTitle}>{p.title}</Text>
            <Text style={styles.body}>{p.text}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

export default function CVDocument() {
  return (
    <Document title="Avery Quinn - CV">
      <PageOne />
      <PageTwo />
    </Document>
  );
}
