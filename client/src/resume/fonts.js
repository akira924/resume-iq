// Registers the bundled web fonts with the PDF renderer. Helvetica and Times are
// built into PDF viewers and need no registration. Fonts are served by Vite from
// node_modules, so rendering works without any network fetch.
import { Font } from '@react-pdf/renderer'
import roboto400 from '@fontsource/roboto/files/roboto-latin-400-normal.woff'
import roboto700 from '@fontsource/roboto/files/roboto-latin-700-normal.woff'
import openSans400 from '@fontsource/open-sans/files/open-sans-latin-400-normal.woff'
import openSans700 from '@fontsource/open-sans/files/open-sans-latin-700-normal.woff'
import lato400 from '@fontsource/lato/files/lato-latin-400-normal.woff'
import lato700 from '@fontsource/lato/files/lato-latin-700-normal.woff'
import sourceSans400 from '@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff'
import sourceSans700 from '@fontsource/source-sans-3/files/source-sans-3-latin-700-normal.woff'
import merriweather400 from '@fontsource/merriweather/files/merriweather-latin-400-normal.woff'
import merriweather700 from '@fontsource/merriweather/files/merriweather-latin-700-normal.woff'
import garamond400 from '@fontsource/eb-garamond/files/eb-garamond-latin-400-normal.woff'
import garamond700 from '@fontsource/eb-garamond/files/eb-garamond-latin-700-normal.woff'

const FONTS = {
  Roboto: [roboto400, roboto700],
  'Open Sans': [openSans400, openSans700],
  Lato: [lato400, lato700],
  'Source Sans 3': [sourceSans400, sourceSans700],
  Merriweather: [merriweather400, merriweather700],
  'EB Garamond': [garamond400, garamond700],
}

for (const [family, [regular, bold]] of Object.entries(FONTS)) {
  Font.register({
    family,
    fonts: [
      { src: regular, fontWeight: 400 },
      { src: bold, fontWeight: 700 },
    ],
  })
}

// Don't hyphenate words across lines — resumes read better with whole words.
Font.registerHyphenationCallback((word) => [word])
