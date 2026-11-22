// The resume as a react-pdf document: US Letter, laid out from `settings`.
// `resume` is the output of normalizeResume(); `settings` of normalizeSettings().
import { Children, Fragment } from 'react'
import { Document, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import './fonts'
import { COLOR_THEMES, ENTRY_LAYOUTS, SECTIONS } from './options'

const TEXT = '#222222'
const MUTED = '#4a4a4a'
const RULE = '#9aa0a6'

// "https://www.linkedin.com/in/alex/" -> "linkedin.com/in/alex"
const displayUrl = (url) => url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')
const href = (url) => (/^[a-z][a-z\d+.-]*:/i.test(url) ? url : `https://${url}`)
const joinWith = (sep, parts) => parts.filter(Boolean).join(sep)

function makeStyles(settings) {
  const { fontSizes: fs, margins } = settings
  const accent = (COLOR_THEMES.find((t) => t.value === settings.theme) ?? COLOR_THEMES[0]).color
  const center = settings.headerAlign === 'center'
  const gap = fs.body * 0.45

  return StyleSheet.create({
    page: {
      paddingVertical: margins.vertical * 72,
      paddingHorizontal: margins.horizontal * 72,
      fontFamily: settings.fontFamily,
      fontSize: fs.body,
      lineHeight: 1.3,
      color: TEXT,
    },
    header: { marginBottom: fs.body * 0.6 },
    headerHybrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 },
    headerName: { flex: 1 },
    headerSide: { flexShrink: 0, gap: 1 },
    rightLine: { color: MUTED, textAlign: 'right' },
    headerStacked: center ? { alignItems: 'center', textAlign: 'center' } : {},
    contactBlock: { alignSelf: 'stretch', marginTop: 2, gap: 1 },
    name: { fontSize: fs.name, fontWeight: 700, color: accent, lineHeight: 1.15 },
    headline: { fontSize: fs.headline, color: MUTED, marginTop: 2 },
    itemLine: { flexDirection: 'row', flexWrap: 'wrap' },
    item: { flexDirection: 'row' },
    itemSep: { color: RULE, marginHorizontal: fs.body * 0.55 },
    link: { color: MUTED, textDecoration: 'none' },

    section: { marginTop: fs.body * 0.7 },
    sectionTitle: {
      fontSize: fs.sectionTitle,
      fontWeight: 700,
      color: accent,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      textAlign: settings.sectionTitleAlign,
      paddingBottom: 2,
      marginBottom: gap,
      ...(settings.showBorders && { borderBottomWidth: 0.75, borderBottomColor: RULE }),
    },

    entry: { marginBottom: gap * 1.4 },
    jobGap: { marginTop: gap * 1.4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    rowLeft: { flexShrink: 1 },
    rowRight: { flexShrink: 0, textAlign: 'right' },
    bold: { fontWeight: 700 },
    accentBold: { fontWeight: 700, color: accent },
    muted: { color: MUTED },

    roleDescription: { marginTop: gap * 0.6 },
    bullets: { marginTop: gap * 0.6 },
    contributionsLabel: { marginBottom: 1.5 },
    technologies: { marginTop: gap * 0.4 },
    bullet: { flexDirection: 'row', marginBottom: 1.5 },
    bulletMark: { width: fs.body * 1.1, paddingLeft: fs.body * 0.25 },
    bulletText: { flex: 1 },
    skillLine: { marginBottom: 2 },
  })
}

// A line of "a  |  b  |  c" that wraps between items, never inside one.
function ItemLine({ items, justify, s }) {
  if (items.length === 0) return null
  return (
    <View style={[s.itemLine, { justifyContent: justify }]}>
      {items.map((item, i) => (
        <View key={i} style={s.item}>
          {i > 0 && <Text style={s.itemSep}>|</Text>}
          <Text style={s.muted}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

// The hybrid header's right column. react-pdf can't size a column to its text, so item widths
// are estimated from character counts: items are packed greedily into lines that fit
// `budget`, and the column is made as wide as the widest line.
const SEP = '  |  '
function packContactLines(groups, fontSize, budget) {
  const widthOf = (chars) => chars * fontSize * 0.5 // roughly the average glyph width of these fonts
  const lines = []
  for (const items of groups) {
    let line = null
    for (const item of items) {
      const w = widthOf(item.text.length)
      if (line && line.width + widthOf(SEP.length) + w <= budget) {
        line.items.push(item)
        line.width += widthOf(SEP.length) + w
      } else {
        line = { items: [item], width: w }
        lines.push(line)
      }
    }
  }
  return lines
}

function HybridContact({ groups, settings, s }) {
  const contentWidth = 612 - 2 * 72 * settings.margins.horizontal
  const lines = packContactLines(groups, settings.fontSizes.body, contentWidth * 0.62)
  if (lines.length === 0) return null
  const widest = Math.max(...lines.map((l) => l.width))
  const width = Math.min(Math.max(widest * 1.05, contentWidth * 0.25), contentWidth * 0.65)
  return (
    <View style={[s.headerSide, { width }]}>
      {lines.map((line, i) => (
        <Text key={i} style={s.rightLine}>
          {line.items.map((item, j) => (
            <Fragment key={j}>
              {j > 0 && SEP}
              {item.node}
            </Fragment>
          ))}
        </Text>
      ))}
    </View>
  )
}

function Header({ resume, settings, s }) {
  const contact = [resume.email, resume.phone, resume.location].filter(Boolean)
  const links = resume.links.map((l) => (
    <Link key={l.key} src={href(l.url)} style={s.link}>
      {displayUrl(l.url)}
    </Link>
  ))

  const nameBlock = (
    <>
      {resume.name && <Text style={s.name}>{resume.name}</Text>}
      {resume.headline && <Text style={s.headline}>{resume.headline}</Text>}
    </>
  )

  if (settings.headerAlign === 'hybrid') {
    const groups = [
      contact.map((text) => ({ text, node: text })),
      resume.links.map((l, i) => ({ text: displayUrl(l.url), node: links[i] })),
    ]
    return (
      <View style={[s.header, s.headerHybrid]}>
        <View style={s.headerName}>{nameBlock}</View>
        <HybridContact groups={groups} settings={settings} s={s} />
      </View>
    )
  }

  const justify = settings.headerAlign === 'center' ? 'center' : 'flex-start'
  return (
    <View style={[s.header, s.headerStacked]}>
      {nameBlock}
      <View style={s.contactBlock}>
        <ItemLine items={contact} justify={justify} s={s} />
        <ItemLine items={links} justify={justify} s={s} />
      </View>
    </View>
  )
}

// The title is kept on the same page as the first child so it's never stranded
// at the bottom of a page. Pass children as a flat list of page-breakable blocks.
function Section({ title, s, children }) {
  const [first, ...rest] = Children.toArray(children)
  return (
    <View style={s.section}>
      <View wrap={false}>
        <Text style={s.sectionTitle}>{title}</Text>
        {first}
      </View>
      {rest}
    </View>
  )
}

function Row({ left, right, s }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLeft}>{left}</Text>
      {right ? <Text style={[s.rowRight, s.muted]}>{right}</Text> : null}
    </View>
  )
}

// The heading rows of one job, in the chosen company-entry layout.
function EntryHeading({ job, layout, s }) {
  const accentField = ENTRY_LAYOUTS.find((l) => l.value === layout)?.accent
  const title = job.title && <Text style={accentField === 'title' ? s.accentBold : s.bold}>{job.title}</Text>
  const company = job.company && <Text style={accentField === 'company' ? s.accentBold : s.bold}>{job.company}</Text>
  const companyAndTitle = (
    <>
      {company}
      {job.company && job.title && ' - '}
      {title}
    </>
  )
  const periodAndLocation = joinWith(' | ', [job.period, job.location])

  switch (layout) {
    case 2:
      return (
        <>
          <Row s={s} left={company} right={job.location} />
          <Row s={s} left={job.title} right={job.period} />
        </>
      )
    case 3:
      return (
        <>
          <Text>{companyAndTitle}</Text>
          {periodAndLocation && <Text style={s.muted}>{periodAndLocation}</Text>}
        </>
      )
    case 4:
      return <Row s={s} left={companyAndTitle} right={periodAndLocation} />
    default:
      return (
        <>
          <Row s={s} left={title} right={job.period} />
          <Row s={s} left={job.company} right={job.location} />
        </>
      )
  }
}

function Skills({ resume, s }) {
  if (resume.skillsets.length === 0) return null
  return (
    <Section title={SECTIONS.skills} s={s}>
      {resume.skillsets.map((set, i) => (
        <Text key={i} style={s.skillLine}>
          {set.category && <Text style={s.bold}>{set.category}: </Text>}
          {set.skills.join(', ')}
        </Text>
      ))}
    </Section>
  )
}

function Experience({ resume, settings, s }) {
  if (resume.experience.length === 0) return null
  const bullet = (sentence, key) => (
    <View key={key} style={s.bullet} wrap={false}>
      <Text style={s.bulletMark}>•</Text>
      <Text style={s.bulletText}>{sentence}</Text>
    </View>
  )
  const technologies = (job) =>
    job.usedSkills.length > 0 && (
      <Text style={s.technologies}>
        <Text style={s.bold}>Technologies: </Text>
        {job.usedSkills.join(', ')}
      </Text>
    )
  // Each job is its heading, role description and "Key Contributions:" kept together with the
  // first bullet, then the remaining bullets, with the last one kept together with the
  // "Technologies:" line, so pages break between bullets but never strand a label.
  const blocks = resume.experience.flatMap((job, i) => {
    const [first, ...rest] = job.sentences
    const last = rest.pop()
    const head = (
      <View key={`${i}-head`} style={i > 0 ? s.jobGap : undefined} wrap={false}>
        <EntryHeading job={job} layout={settings.entryLayout} s={s} />
        {job.roleDescription && <Text style={s.roleDescription}>{job.roleDescription}</Text>}
        {first && (
          <View style={s.bullets}>
            <Text style={[s.bold, s.contributionsLabel]}>Key Contributions:</Text>
            {bullet(first)}
          </View>
        )}
        {!last && technologies(job)}
      </View>
    )
    return [
      head,
      ...rest.map((sentence, j) => bullet(sentence, `${i}-${j}`)),
      last && (
        <View key={`${i}-tail`} wrap={false}>
          {bullet(last)}
          {technologies(job)}
        </View>
      ),
    ].filter(Boolean)
  })
  return (
    <Section title={SECTIONS.experience} s={s}>
      {blocks}
    </Section>
  )
}

function Education({ resume, s }) {
  if (resume.education.length === 0) return null
  return (
    <Section title={SECTIONS.education} s={s}>
      {resume.education.map((ed, i) => (
        <View key={i} style={s.entry} wrap={false}>
          <Row s={s} left={<Text style={s.bold}>{ed.institution}</Text>} right={ed.period} />
          {ed.degree && <Text>{ed.degree}</Text>}
        </View>
      ))}
    </Section>
  )
}

function Certifications({ resume, s }) {
  if (resume.certification.length === 0) return null
  return (
    <Section title={SECTIONS.certification} s={s}>
      {resume.certification.map((c, i) => (
        <View key={i} style={s.entry} wrap={false}>
          <Row s={s} left={<Text style={s.bold}>{c.name}</Text>} right={c.date} />
          {c.institution && <Text style={s.muted}>{c.institution}</Text>}
        </View>
      ))}
    </Section>
  )
}

const SECTION_COMPONENTS = {
  skills: Skills,
  experience: Experience,
  education: Education,
  certification: Certifications,
}

export default function ResumeDocument({ resume, settings }) {
  const s = makeStyles(settings)
  return (
    <Document title={resume.name ? `${resume.name} - Resume` : 'Resume'} author={resume.name || undefined}>
      <Page size="LETTER" style={s.page}>
        <Header resume={resume} settings={settings} s={s} />
        {resume.summary && (
          <Section title="Summary" s={s}>
            <Text>{resume.summary}</Text>
          </Section>
        )}
        {settings.sectionOrder.map((key) => {
          const Component = SECTION_COMPONENTS[key]
          return <Component key={key} resume={resume} settings={settings} s={s} />
        })}
      </Page>
    </Document>
  )
}
