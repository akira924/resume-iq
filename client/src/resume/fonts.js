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
import inter400 from '@fontsource/inter/files/inter-latin-400-normal.woff'
import inter700 from '@fontsource/inter/files/inter-latin-700-normal.woff'
import ibmPlexSans400 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff'
import ibmPlexSans700 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff'
import nunitoSans400 from '@fontsource/nunito-sans/files/nunito-sans-latin-400-normal.woff'
import nunitoSans700 from '@fontsource/nunito-sans/files/nunito-sans-latin-700-normal.woff'
import workSans400 from '@fontsource/work-sans/files/work-sans-latin-400-normal.woff'
import workSans700 from '@fontsource/work-sans/files/work-sans-latin-700-normal.woff'
import carlito400 from '@fontsource/carlito/files/carlito-latin-400-normal.woff'
import carlito700 from '@fontsource/carlito/files/carlito-latin-700-normal.woff'
import lora400 from '@fontsource/lora/files/lora-latin-400-normal.woff'
import lora700 from '@fontsource/lora/files/lora-latin-700-normal.woff'
import ptSerif400 from '@fontsource/pt-serif/files/pt-serif-latin-400-normal.woff'
import ptSerif700 from '@fontsource/pt-serif/files/pt-serif-latin-700-normal.woff'
import baskerville400 from '@fontsource/libre-baskerville/files/libre-baskerville-latin-400-normal.woff'
import baskerville700 from '@fontsource/libre-baskerville/files/libre-baskerville-latin-700-normal.woff'
import sourceSerif400 from '@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff'
import sourceSerif700 from '@fontsource/source-serif-4/files/source-serif-4-latin-700-normal.woff'
import crimson400 from '@fontsource/crimson-pro/files/crimson-pro-latin-400-normal.woff'
import crimson700 from '@fontsource/crimson-pro/files/crimson-pro-latin-700-normal.woff'

const FONTS = {
  Roboto: [roboto400, roboto700],
  'Open Sans': [openSans400, openSans700],
  Lato: [lato400, lato700],
  'Source Sans 3': [sourceSans400, sourceSans700],
  Merriweather: [merriweather400, merriweather700],
  'EB Garamond': [garamond400, garamond700],
  Inter: [inter400, inter700],
  'IBM Plex Sans': [ibmPlexSans400, ibmPlexSans700],
  'Nunito Sans': [nunitoSans400, nunitoSans700],
  'Work Sans': [workSans400, workSans700],
  Carlito: [carlito400, carlito700],
  Lora: [lora400, lora700],
  'PT Serif': [ptSerif400, ptSerif700],
  'Libre Baskerville': [baskerville400, baskerville700],
  'Source Serif 4': [sourceSerif400, sourceSerif700],
  'Crimson Pro': [crimson400, crimson700],
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
