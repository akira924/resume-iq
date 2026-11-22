// The resume as a react-pdf document: US Letter, laid out from `settings`.
// `resume` is the output of normalizeResume(); `settings` of normalizeSettings().
import { Children } from 'react'
import { Document, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import './fonts'
import { CONTACT_ICONS, linkIcon } from './iconData'
import { Icon } from './icons'
import { charWidthOf, ENTRY_LAYOUTS, SECTIONS, themeColors } from './options'

const TEXT = '#222222'
const MUTED = '#4a4a4a'
const SEPARATOR = '#9aa0a6' // neutral gray for the header's "|" separators, whatever the theme
// Header contact line proportions, as fractions of the body font size.
const ICON_SCALE = 0.95 // icon size
const ICON_GAP = 0.35 // space between an icon and its text
const SEP_MARGIN = 0.55 // space on each side of the "|" separator
const ICON_ITEM_GAP = 1.2 // space between items when icons replace the "|" separators

// "https://www.linkedin.com/in/alex/" -> "linkedin.com/in/alex"
const displayUrl = (url) => url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')
const href = (url) => (/^[a-z][a-z\d+.-]*:/i.test(url) ? url : `https://${url}`)
const joinWith = (sep, parts) => parts.filter(Boolean).join(sep)

function makeStyles(settings) {
  const { fontSizes: fs, margins } = settings
  const { accent, rule } = themeColors(settings.theme)
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
    headerHybrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
    headerName: { flex: 1 },
    headerSide: { flexShrink: 0, gap: 1 },
    headerStacked: center ? { alignItems: 'center', textAlign: 'center' } : {},
    contactBlock: { alignSelf: 'stretch', marginTop: 2, gap: 1 },
    name: { fontSize: fs.name, fontWeight: 700, color: accent, lineHeight: 1.15 },
    headline: { fontSize: fs.headline, color: MUTED, marginTop: 2 },
    itemLine: { flexDirection: 'row', flexWrap: 'wrap' },
    item: { flexDirection: 'row', alignItems: 'center' },
    itemSep: { color: SEPARATOR, marginHorizontal: fs.body * SEP_MARGIN },
    itemIconGap: { marginLeft: fs.body * ICON_ITEM_GAP },
    icon: { marginRight: fs.body * ICON_GAP },
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
      ...(settings.showBorders && { borderBottomWidth: 0.75, borderBottomColor: rule }),
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
// Each item is { text, node, icon }; icons are drawn only when `icons` ({ size, color }) is given,
// and then the icons set the items apart, so a plain gap replaces the "|" separators.
function ItemLine({ items, justify, icons, s }) {
  if (items.length === 0) return null
  return (
    <View style={[s.itemLine, { justifyContent: justify }]}>
      {items.map((item, i) => (
        <View key={i} style={[s.item, i > 0 && icons && s.itemIconGap]}>
          {i > 0 && !icons && <Text style={s.itemSep}>|</Text>}
          {icons && <Icon icon={item.icon} size={icons.size} color={icons.color} style={s.icon} />}
          <Text style={s.muted}>{item.node}</Text>
        </View>
      ))}
    </View>
  )
}

// react-pdf can't measure text before layout, so widths are estimated from character counts
// and the chosen font's measured average glyph width (see FONT_FAMILIES in options.js).
// `font` is { size, charWidth, iconWidth }; build it with fontMetrics().
const fontMetrics = (settings) => {
  const size = settings.fontSizes.body
  return {
    size,
    charWidth: charWidthOf(settings.fontFamily),
    iconWidth: settings.showContactIcons ? size * (ICON_SCALE + ICON_GAP) : 0,
  }
}
const textWidth = (chars, font) => chars * font.size * font.charWidth
const itemWidth = (item, font) => textWidth(item.text.length, font) + font.iconWidth
// Space between two items: the icon gap when icons are on, otherwise the "|" and its margins.
const sepWidth = (font) =>
  font.iconWidth ? font.size * ICON_ITEM_GAP : textWidth(1, font) + 2 * font.size * SEP_MARGIN
const contentWidthOf = (settings) => 612 - 2 * 72 * settings.margins.horizontal // US Letter, in pt

// Icon size and color for ItemLine, or null when icons are turned off. Icons match the contact
// text color rather than the theme, so the header stays neutral.
const contactIcons = (settings) =>
  settings.showContactIcons
    ? { size: settings.fontSizes.body * ICON_SCALE, color: MUTED }
    : null

// Estimated width of `items` laid out as one ItemLine.
function itemLineWidth(items, font) {
  return items.reduce((w, it) => w + itemWidth(it, font), 0) + Math.max(0, items.length - 1) * sepWidth(font)
}

// Packs each group's items greedily into lines that fit `budget`; a group always starts a new line.
function packContactLines(groups, font, budget) {
  const lines = []
  for (const items of groups) {
    let line = null
    for (const item of items) {
      const w = itemWidth(item, font)
      if (line && line.width + sepWidth(font) + w <= budget) {
        line.items.push(item)
        line.width += sepWidth(font) + w
      } else {
        line = { items: [item], width: w }
        lines.push(line)
      }
    }
  }
  return lines
}

// The hybrid header's right column: one contact detail or link per line, right-aligned.
// react-pdf can't size a column to its text, so the column is made as wide as the widest
// estimated item (plus a 5% safety margin), within 25–65% of the content width.
function HybridContact({ items, settings, s }) {
  if (items.length === 0) return null
  const contentWidth = contentWidthOf(settings)
  const font = fontMetrics(settings)
  const widest = Math.max(...items.map((item) => itemWidth(item, font)))
  const width = Math.min(Math.max(widest * 1.05, contentWidth * 0.25), contentWidth * 0.65)
  return (
    <View style={[s.headerSide, { width }]}>
      {items.map((item, i) => (
        <ItemLine key={i} items={[item]} justify="flex-end" icons={contactIcons(settings)} s={s} />
      ))}
    </View>
  )
}

function Header({ resume, settings, s }) {
  const contact = [
    { text: resume.email, icon: CONTACT_ICONS.email },
    { text: resume.phone, icon: CONTACT_ICONS.phone },
    { text: resume.location, icon: CONTACT_ICONS.location },
  ]
    .filter((c) => c.text)
    .map((c) => ({ ...c, node: c.text }))
  const links = resume.links.map((l) => {
    const text = displayUrl(l.url)
    return {
      text,
      icon: linkIcon(l.key, l.url),
      node: (
        <Link src={href(l.url)} style={s.link}>
          {text}
        </Link>
      ),
    }
  })

  const nameBlock = (
    <>
      {resume.name && <Text style={s.name}>{resume.name}</Text>}
      {resume.headline && <Text style={s.headline}>{resume.headline}</Text>}
    </>
  )

  if (settings.headerAlign === 'hybrid') {
    return (
      <View style={[s.header, s.headerHybrid]}>
        <View style={s.headerName}>{nameBlock}</View>
        <HybridContact items={[...contact, ...links]} settings={settings} s={s} />
      </View>
    )
  }

  // Contact and links share one line when the estimate says it fits (with a 5% safety
  // margin so a borderline line doesn't wrap); otherwise each starts its own line. Lines are
  // packed here rather than left to flex-wrap, so a wrapped line never starts with a "|".
  const justify = settings.headerAlign === 'center' ? 'center' : 'flex-start'
  const font = fontMetrics(settings)
  const budget = contentWidthOf(settings) * 0.95
  const all = [...contact, ...links]
  const lines = itemLineWidth(all, font) <= budget ? [{ items: all }] : packContactLines([contact, links], font, budget)
  return (
    <View style={[s.header, s.headerStacked]}>
      {nameBlock}
      <View style={s.contactBlock}>
        {lines.map((line, i) => (
          <ItemLine key={i} items={line.items} justify={justify} icons={contactIcons(settings)} s={s} />
        ))}
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
  // Each job is its heading kept together with its role description; then "Key Contributions:"
  // kept together with the first bullet; then the remaining bullets, with the last one kept
  // together with the "Technologies:" line. Pages may break between the role description and
  // "Key Contributions:" and between bullets, but never strand a heading or a label.
  const blocks = resume.experience.flatMap((job, i) => {
    const [first, ...rest] = job.sentences
    const last = rest.pop()
    const head = (
      <View key={`${i}-head`} style={i > 0 ? s.jobGap : undefined} wrap={false}>
        <EntryHeading job={job} layout={settings.entryLayout} s={s} />
        {job.roleDescription && <Text style={s.roleDescription}>{job.roleDescription}</Text>}
        {!first && technologies(job)}
      </View>
    )
    const contributions = first && (
      <View key={`${i}-first`} style={s.bullets} wrap={false}>
        <Text style={[s.bold, s.contributionsLabel]}>Key Contributions:</Text>
        {bullet(first)}
        {!last && technologies(job)}
      </View>
    )
    return [
      head,
      contributions,
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
