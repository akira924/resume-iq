import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Bundles src/resume/exportPdf.jsx (react-pdf, the resume layout and its fonts) into one
// ES module for the Chrome extension's side panel, which has no build step of its own.
// Run `npm run build:extension` after changing the resume layout, then reload the extension.
export default defineConfig({
  plugins: [react()],
  publicDir: false, // the web app's public/ files don't belong in the bundle
  // Library builds leave process.env alone; React and react-pdf read NODE_ENV from it.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: '../extension/sidepanel/vendor',
    emptyOutDir: true,
    // Library mode inlines assets, so the fonts travel inside the bundle as data URLs.
    lib: {
      entry: 'src/resume/exportPdf.jsx',
      formats: ['es'],
      fileName: () => 'resume-pdf.js',
    },
    minify: true,
    sourcemap: false,
  },
})
