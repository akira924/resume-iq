// Draws every page of a PDF blob onto canvases with pdf.js. New pages are drawn
// off-screen and swapped in when ready, so the preview never flickers and keeps
// its scroll position while the resume is edited.
import { useEffect, useRef } from 'react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

// Pixels per PDF point. 2× keeps text sharp on most screens; CSS scales it to fit.
const RENDER_SCALE = 2

export default function PdfPreview({ blob, onError }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!blob) return
    let cancelled = false
    let task = null

    ;(async () => {
      try {
        task = getDocument({ data: new Uint8Array(await blob.arrayBuffer()) })
        const pdf = await task.promise
        const canvases = []
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n)
          if (cancelled) return
          const viewport = page.getViewport({ scale: RENDER_SCALE })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.className = 'pdf-page'
          canvas.setAttribute('role', 'img')
          canvas.setAttribute('aria-label', `Resume page ${n} of ${pdf.numPages}`)
          await page.render({ canvas, viewport }).promise
          canvases.push(canvas)
        }
        if (!cancelled) containerRef.current?.replaceChildren(...canvases)
      } catch (err) {
        if (!cancelled) onError?.(err)
      } finally {
        task?.destroy() // frees the document in the worker
      }
    })()

    return () => {
      cancelled = true
    }
  }, [blob, onError])

  return <div ref={containerRef} className="pdf-pages" />
}
