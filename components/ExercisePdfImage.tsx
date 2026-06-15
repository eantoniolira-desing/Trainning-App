'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface ExercisePdfImageProps {
  pdfFile: string
  page: number
  position: 'top' | 'bottom' | 'single'
}

const pdfCache = new Map<string, PDFDocumentProxy>()
const imageCache = new Map<string, ImageBitmap>()

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null
function getPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then(lib => {
      lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      return lib
    })
  }
  return pdfjsPromise
}

const CROP: Record<string, { y: number; h: number }> = {
  top:    { y: 0.19, h: 0.29 },
  bottom: { y: 0.52, h: 0.29 },
  single: { y: 0.19, h: 0.38 },
}

export function ExercisePdfImage({ pdfFile, page, position }: ExercisePdfImageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const pdfjs = await getPdfJs()
        const cacheKey = `${pdfFile}-${page}`

        let bitmap: ImageBitmap
        if (imageCache.has(cacheKey)) {
          bitmap = imageCache.get(cacheKey)!
        } else {
          let pdf = pdfCache.get(pdfFile)
          if (!pdf) {
            pdf = await pdfjs.getDocument({ url: `/pdfs/${pdfFile}.pdf` }).promise
            pdfCache.set(pdfFile, pdf)
          }

          const pdfPage = await pdf.getPage(page)
          const scale = 2
          const viewport = pdfPage.getViewport({ scale })

          const off = document.createElement('canvas')
          off.width = viewport.width
          off.height = viewport.height
          await pdfPage.render({ canvas: off, viewport }).promise

          bitmap = await createImageBitmap(off)
          imageCache.set(cacheKey, bitmap)
        }

        if (cancelled) return

        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const { y: cropY, h: cropH } = CROP[position]
        const srcY = Math.floor(cropY * bitmap.height)
        const srcH = Math.floor(cropH * bitmap.height)
        const srcW = bitmap.width

        const displayW = container.clientWidth || 320
        const displayH = Math.floor((srcH / srcW) * displayW)

        canvas.width = displayW * 2
        canvas.height = displayH * 2
        canvas.style.width = `${displayW}px`
        canvas.style.height = `${displayH}px`

        const ctx = canvas.getContext('2d')!
        ctx.drawImage(bitmap, 0, srcY, srcW, srcH, 0, 0, displayW * 2, displayH * 2)

        setLoaded(true)
      } catch {
        if (!cancelled) setError(true)
      }
    }

    render()
    return () => { cancelled = true }
  }, [pdfFile, page, position])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        background: '#F5F5F6',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: loaded ? undefined : 160,
      }}
    >
      {!loaded && !error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div
            className="animate-spin"
            style={{
              width: 20, height: 20,
              border: '2px solid #E8E9EB',
              borderTopColor: '#A8FF00',
              borderRadius: '50%',
            }}
          />
        </div>
      )}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 160, fontSize: '2rem', color: '#D5D8DD',
        }}>
          🏋️
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ display: loaded ? 'block' : 'none', width: '100%' }}
      />
    </div>
  )
}
