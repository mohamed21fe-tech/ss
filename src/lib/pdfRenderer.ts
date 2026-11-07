import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;
}

export interface RenderedPDFPage {
  pageNumber: number;
  width: number;
  height: number;
  dataUrl: string;
  textItems?: { str: string; x: number; y: number; width: number; height: number }[];
}

// Loads and renders a PDF from an ArrayBuffer or base64 string
export async function loadAndRenderPdf(
  data: ArrayBuffer | Uint8Array,
  maxPages: number = 20,
  scale: number = 1.5
): Promise<RenderedPDFPage[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;
    const numPages = Math.min(pdfDoc.numPages, maxPages);
    const pages: RenderedPDFPage[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) continue;

      // Render page
      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      } as any).promise;

      // Extract text content for full-text search
      let textItems: RenderedPDFPage['textItems'] = [];
      try {
        const textContent = await page.getTextContent();
        textItems = textContent.items
          .filter((item: any) => item && typeof item.str === 'string')
          .map((item: any) => ({
            str: item.str,
            x: item.transform[4] * (scale / (viewport.scale / scale)),
            y: viewport.height - (item.transform[5] * (scale / (viewport.scale / scale))),
            width: item.width * scale,
            height: item.height * scale,
          }));
      } catch (err) {
        console.warn('Could not extract text content for page', i, err);
      }

      pages.push({
        pageNumber: i,
        width: viewport.width / scale,
        height: viewport.height / scale,
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        textItems,
      });
    }

    return pages;
  } catch (error) {
    console.error('Error rendering PDF:', error);
    throw error;
  }
}

// Renders page background for built-in template types (Cornell notes, lined, grid, blank)
export function renderTemplateBackground(
  template: 'blank' | 'lined' | 'grid' | 'cornell',
  width: number = 800,
  height: number = 1100,
  isDark: boolean = false
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const bgColor = isDark ? '#1a1918' : '#fdfbf7';
  const lineColor = isDark ? '#2e2c29' : '#e6e2d8';
  const marginColor = isDark ? '#452a2a' : '#f8b4b4'; // subtle red vertical margin
  const headerRuleColor = isDark ? '#3d3a36' : '#d5cfc2';

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  switch (template) {
    case 'blank':
      // Clean paper with very subtle paper grain border
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, width - 2, height - 2);
      break;

    case 'lined': {
      const lineHeight = 30;
      const topMargin = 70;
      const leftMargin = 72;

      // Vertical red/rose margin line
      ctx.strokeStyle = marginColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftMargin, 0);
      ctx.lineTo(leftMargin, height);
      ctx.stroke();

      // Horizontal lines
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      for (let y = topMargin; y < height - 20; y += lineHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;
    }

    case 'grid': {
      const gridSize = 24;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 0.75;

      // Vertical lines
      for (let x = gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;
    }

    case 'cornell': {
      // Cornell Note System:
      // Header area (top 80px)
      // Cue / Questions column on left (width 220px)
      // Notes column on right (width - 220px)
      // Summary area on bottom (height 160px)
      const cueWidth = 220;
      const headerHeight = 70;
      const summaryHeight = 150;

      // Header divider
      ctx.strokeStyle = headerRuleColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, headerHeight);
      ctx.lineTo(width, headerHeight);
      ctx.stroke();

      // Cue column divider
      ctx.beginPath();
      ctx.moveTo(cueWidth, headerHeight);
      ctx.lineTo(cueWidth, height - summaryHeight);
      ctx.stroke();

      // Summary divider
      ctx.beginPath();
      ctx.moveTo(0, height - summaryHeight);
      ctx.lineTo(width, height - summaryHeight);
      ctx.stroke();

      // Lined notes inside right column
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 0.75;
      for (let y = headerHeight + 26; y < height - summaryHeight - 10; y += 26) {
        ctx.beginPath();
        ctx.moveTo(cueWidth + 8, y);
        ctx.lineTo(width - 16, y);
        ctx.stroke();
      }

      // Lined notes inside summary area
      for (let y = height - summaryHeight + 32; y < height - 10; y += 26) {
        ctx.beginPath();
        ctx.moveTo(16, y);
        ctx.lineTo(width - 16, y);
        ctx.stroke();
      }

      // Cornell Section Labels
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillStyle = isDark ? '#78716c' : '#a8a29e';
      ctx.fillText('TOPIC / TITLE', 24, 42);
      ctx.fillText('DATE', width - 120, 42);
      ctx.fillText('CUES & KEY QUESTIONS', 16, headerHeight + 28);
      ctx.fillText('NOTES & LECTURE DETAILS', cueWidth + 16, headerHeight + 28);
      ctx.fillText('SUMMARY & SYNTHESIS', 16, height - summaryHeight + 22);
      break;
    }
  }

  return canvas.toDataURL('image/png');
}
