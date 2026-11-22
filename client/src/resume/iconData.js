// Icon shapes for the header's contact details and online presence (rendered by icons.jsx).
// Contact icons come from Lucide (outlined, ISC license) and brand logos from Simple Icons
// (filled, CC0). Both use a 24×24 view box.
import { Globe, Mail, MapPin, Phone } from 'lucide'
import {
  siBehance,
  siBluesky,
  siDevdotto,
  siDribbble,
  siFacebook,
  siGithub,
  siGitlab,
  siHashnode,
  siHuggingface,
  siInstagram,
  siKaggle,
  siLeetcode,
  siMedium,
  siStackoverflow,
  siX,
  siYoutube,
} from 'simple-icons'

const outline = (nodes) => ({ kind: 'outline', nodes })
const filled = (d, fillRule) => ({ kind: 'filled', d, fillRule })

// Simple Icons no longer ships LinkedIn (removed at LinkedIn's request), so this is a plain
// "in" monogram cut out of a rounded square.
const LINKEDIN = filled(
  'M3 1h18a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2Z' +
    'M4.75 6.5a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0Z' +
    'M5 9.5h3V19H5Z' +
    'M10 9.5h2.9v1.4c.6-1 1.7-1.7 3.2-1.7 2.6 0 3.9 1.6 3.9 4.6V19h-3v-5.4c0-1.5-.6-2.3-1.8-2.3-1.3 0-2.2.9-2.2 2.5V19H10Z',
  'evenodd',
)

export const CONTACT_ICONS = {
  email: outline(Mail),
  phone: outline(Phone),
  location: outline(MapPin),
}

const WEBSITE = outline(Globe)

// Online-presence icons, matched against the JSON key (e.g. "github") and the URL's host.
// Order matters: the first entry whose pattern matches wins.
const LINK_ICONS = [
  [/linkedin/, LINKEDIN],
  [/github/, filled(siGithub.path)],
  [/gitlab/, filled(siGitlab.path)],
  [/stack ?overflow/, filled(siStackoverflow.path)],
  [/(^|\.)x\.com$|twitter/, filled(siX.path)],
  [/bsky|bluesky/, filled(siBluesky.path)],
  [/medium/, filled(siMedium.path)],
  [/dev\.to|^dev(to)?$/, filled(siDevdotto.path)],
  [/hashnode/, filled(siHashnode.path)],
  [/kaggle/, filled(siKaggle.path)],
  [/leetcode/, filled(siLeetcode.path)],
  [/hugging ?face/, filled(siHuggingface.path)],
  [/dribbble/, filled(siDribbble.path)],
  [/behance/, filled(siBehance.path)],
  [/youtube|youtu\.be/, filled(siYoutube.path)],
  [/instagram/, filled(siInstagram.path)],
  [/facebook/, filled(siFacebook.path)],
]

const hostOf = (url) => {
  const m = /^(?:[a-z][a-z\d+.-]*:\/\/)?([^/?#:]+)/i.exec(url)
  return m ? m[1].toLowerCase().replace(/^www\./, '') : ''
}

// The icon for an online-presence entry; anything unrecognized (portfolio, blog, …) gets a globe.
export function linkIcon(key, url) {
  const name = key.toLowerCase().replace(/[_-]/g, ' ')
  const host = hostOf(url)
  return LINK_ICONS.find(([re]) => re.test(name) || re.test(host))?.[1] ?? WEBSITE
}
