import React, { useRef, useState, useEffect } from 'react';
import {
  DocumentAnnotations,
  DocumentItem,
  DocumentPage,
  InkStroke,
  PageTemplate,
  PenStyle,
  ShapeAnnotation,
  ShapeType,
  StickyNote,
  TextNote,
  ToolType,
} from '../types';
import { CanvasOverlay } from './CanvasOverlay';
import {
  BookmarkBadge,
  StickyNoteItem,
  TextNoteItem,
  AudioNoteItem,
} from './AnnotationOverlays';
import {
  Plus,
  Bookmark as BookmarkIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FilePlus,
  Columns,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { renderTemplateBackground } from '../lib/pdfRenderer';

interface PDFDocumentViewProps {
  document: DocumentItem;
  pages: DocumentPage[];
  annotations: DocumentAnnotations;
  scale: number;
  setScale: (scale: number | ((prev: number) => number)) => void;
  isDark: boolean;
  tool: ToolType;
  penStyle: PenStyle;
  color: string;
  strokeWidth: number;
  opacity: number;
  eraserType: 'stroke' | 'pixel';
  eraserRadius: number;
  shapeType: ShapeType;
  palmRejection: boolean;
  activePageIndex: number;
  splitView: boolean;
  splitPageIndex: number;
  onPageChange: (index: number) => void;
  onSplitPageChange: (index: number) => void;
  onAddStroke: (stroke: InkStroke) => void;
  onRemoveStrokes: (strokeIds: string[]) => void;
  onAddShape: (shape: ShapeAnnotation) => void;
  onRemoveShapes: (shapeIds: string[]) => void;
  onMoveStrokes: (strokeIds: string[], dx: number, dy: number) => void;
  onUpdateTextNote: (note: TextNote) => void;
  onDeleteTextNote: (id: string) => void;
  onUpdateStickyNote: (note: StickyNote) => void;
  onDeleteStickyNote: (id: string) => void;
  onDeleteAudioNote: (id: string) => void;
  onToggleBookmark: (pageIndex: number) => void;
  onInsertPage: (template: PageTemplate, afterPageIndex: number) => void;
  onCanvasClickToAddNote: (x: number, y: number, tool: 'text' | 'sticky' | 'audio', pageIndex: number) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const PDFDocumentView: React.FC<PDFDocumentViewProps> = ({
  document,
  pages,
  annotations,
  scale,
  setScale,
  isDark,
  tool,
  penStyle,
  color,
  strokeWidth,
  opacity,
  eraserType,
  eraserRadius,
  shapeType,
  palmRejection,
  activePageIndex,
  splitView,
  splitPageIndex,
  onPageChange,
  onSplitPageChange,
  onAddStroke,
  onRemoveStrokes,
  onAddShape,
  onRemoveShapes,
  onMoveStrokes,
  onUpdateTextNote,
  onDeleteTextNote,
  onUpdateStickyNote,
  onDeleteStickyNote,
  onDeleteAudioNote,
  onToggleBookmark,
  onInsertPage,
  onCanvasClickToAddNote,
  onUndo,
}) => {
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pinch-to-zoom multi-touch tracking
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(scale);

  // Wheel zoom listener for trackpads & Ctrl+wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = -e.deltaY * 0.003;
        setScale((s) => Math.min(2.5, Math.max(0.4, Number((s + factor).toFixed(2)))));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setScale]);

  // Touch pinch-to-zoom gestures
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = d;
      pinchStartScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = d / pinchStartDistRef.current;
      const nextScale = Math.min(2.5, Math.max(0.4, Number((pinchStartScaleRef.current * ratio).toFixed(2))));
      setScale(nextScale);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
    }
  };

  // Helper to render a single page frame
  const renderSinglePage = (pageIndex: number, isSecondary: boolean = false) => {
    const page = pages[pageIndex];
    if (!page) return null;

    const pageWidth = 850;
    const pageHeight = Math.round(pageWidth * (page.aspectRatio || 1.333));
    const pageStrokes = annotations.strokes.filter((s) => s.pageIndex === pageIndex);
    const pageShapes = annotations.shapes.filter((sh) => sh.pageIndex === pageIndex);
    const pageTextNotes = annotations.textNotes.filter((t) => t.pageIndex === pageIndex);
    const pageStickyNotes = annotations.stickyNotes.filter((s) => s.pageIndex === pageIndex);
    const pageAudioNotes = annotations.audioNotes.filter((a) => a.pageIndex === pageIndex);
    const pageBookmark = annotations.bookmarks.find((b) => b.pageIndex === pageIndex);

    const changePageHandler = isSecondary ? onSplitPageChange : onPageChange;

    return (
      <div
        key={`page-${pageIndex}-${isSecondary ? 'sec' : 'prim'}`}
        className="flex flex-col items-center mb-10 transition-all"
      >
        {/* Page Top Indicator Bar with Direct Next/Prev Navigation */}
        <div
          className="flex items-center justify-between pb-2 text-xs text-stone-500 select-none"
          style={{ width: pageWidth * scale }}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700 dark:text-stone-300">
              Page {pageIndex + 1} of {pages.length}
            </span>

            {/* Direct Page Navigation Arrows */}
            <div className="flex items-center gap-0.5 bg-stone-200/80 dark:bg-stone-800 rounded-lg p-0.5">
              <button
                onClick={() => changePageHandler(Math.max(0, pageIndex - 1))}
                disabled={pageIndex === 0}
                className="p-1 rounded hover:bg-white dark:hover:bg-stone-700 disabled:opacity-30 transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => changePageHandler(Math.min(pages.length - 1, pageIndex + 1))}
                disabled={pageIndex >= pages.length - 1}
                className="p-1 rounded hover:bg-white dark:hover:bg-stone-700 disabled:opacity-30 transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-stone-400">·</span>
            <span className="capitalize">{page.template} {page.template === 'cornell' ? 'Notes' : 'Sheet'}</span>
            {page.title && (
              <>
                <span className="text-stone-400">·</span>
                <span className="truncate max-w-[200px] text-stone-600 dark:text-stone-400 font-medium">
                  {page.title}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleBookmark(pageIndex)}
              className={`p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer ${
                pageBookmark ? 'text-rose-600' : 'text-stone-400'
              }`}
              title={pageBookmark ? 'Remove Bookmark' : 'Add Bookmark'}
            >
              <BookmarkIcon className={`w-4 h-4 ${pageBookmark ? 'fill-rose-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Page Sheet Container */}
        <div
          className={`relative shadow-xl rounded-sm border overflow-hidden select-none ${
            isDark ? 'border-stone-800 bg-[#1a1918]' : 'border-stone-200 bg-white'
          }`}
          style={{
            width: pageWidth * scale,
            height: pageHeight * scale,
          }}
        >
          {/* Background Layer: PDF raster or generated template texture */}
          {page.bgDataUrl ? (
            <img
              src={page.bgDataUrl}
              alt={`Page ${pageIndex + 1}`}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`w-full h-full ${page.template === 'cornell' ? 'cornell-paper' : page.template === 'lined' ? 'lined-paper' : page.template === 'grid' ? 'grid-paper' : 'paper-texture'}`} />
          )}

          {/* Bookmark Badge Banner */}
          {pageBookmark && (
            <BookmarkBadge
              bookmark={pageBookmark}
              onClick={() => onToggleBookmark(pageIndex)}
            />
          )}

          {/* Canvas Ink & Shapes Overlay */}
          <CanvasOverlay
            width={pageWidth}
            height={pageHeight}
            scale={scale}
            pageIndex={pageIndex}
            tool={tool}
            penStyle={penStyle}
            color={color}
            strokeWidth={strokeWidth}
            opacity={opacity}
            eraserType={eraserType}
            eraserRadius={eraserRadius}
            shapeType={shapeType}
            palmRejection={palmRejection}
            strokes={pageStrokes}
            shapes={pageShapes}
            onAddStroke={onAddStroke}
            onRemoveStrokes={onRemoveStrokes}
            onAddShape={onAddShape}
            onRemoveShapes={onRemoveShapes}
            onMoveStrokes={onMoveStrokes}
            onCanvasClickToAddNote={(x, y, noteTool) =>
              onCanvasClickToAddNote(x, y, noteTool, pageIndex)
            }
            onUndo={onUndo}
          />

          {/* Interactive Annotation Overlays */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Text Notes */}
            {pageTextNotes.map((note) => (
              <div key={note.id} className="pointer-events-auto">
                <TextNoteItem
                  note={note}
                  scale={scale}
                  onUpdate={onUpdateTextNote}
                  onDelete={onDeleteTextNote}
                />
              </div>
            ))}

            {/* Sticky Notes */}
            {pageStickyNotes.map((sNote) => (
              <div key={sNote.id} className="pointer-events-auto">
                <StickyNoteItem
                  note={sNote}
                  scale={scale}
                  onUpdate={onUpdateStickyNote}
                  onDelete={onDeleteStickyNote}
                />
              </div>
            ))}

            {/* Audio Voice Memos */}
            {pageAudioNotes.map((aNote) => (
              <div key={aNote.id} className="pointer-events-auto">
                <AudioNoteItem
                  note={aNote}
                  scale={scale}
                  onUpdate={() => {}}
                  onDelete={onDeleteAudioNote}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Page Insertion Bar */}
        {!isSecondary && (
          <div className="py-4 flex items-center gap-2 select-none">
            <button
              onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1 bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-full text-xs font-medium transition-colors cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Insert Study Page Here</span>
            </button>

            {templateMenuOpen && (
              <div className="flex items-center gap-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-1 rounded-lg shadow-lg text-xs">
                {(['cornell', 'lined', 'grid', 'blank'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      onInsertPage(t, pageIndex);
                      setTemplateMenuOpen(false);
                    }}
                    className="px-2.5 py-1 hover:bg-stone-100 dark:hover:bg-stone-700 rounded capitalize font-medium text-stone-700 dark:text-stone-300 cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full overflow-auto p-6 md:p-8 flex justify-center relative touch-pan-x touch-pan-y"
    >
      {splitView ? (
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center w-full max-w-7xl">
          {/* ================================================================= */}
          {/* Primary View Pane with Dedicated Page Navigator */}
          {/* ================================================================= */}
          <div className="flex-1 flex flex-col items-center w-full">
            <div className="w-full flex items-center justify-between bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-2.5 mb-3 shadow-sm select-none">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  Primary Pane
                </span>
                <span className="text-stone-300 dark:text-stone-700">|</span>
                <span className="text-xs text-stone-500 font-mono">
                  Page {activePageIndex + 1} of {pages.length}
                </span>
              </div>

              {/* Page Switcher Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onPageChange(Math.max(0, activePageIndex - 1))}
                  disabled={activePageIndex === 0}
                  className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Previous Page (Primary)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={activePageIndex}
                  onChange={(e) => onPageChange(Number(e.target.value))}
                  className="text-xs py-1.5 px-3 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none font-medium cursor-pointer text-stone-800 dark:text-stone-200"
                >
                  {pages.map((p, idx) => (
                    <option key={`primary-opt-${p.id}`} value={idx}>
                      Page {idx + 1}: {p.title || `${p.template} page`}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => onPageChange(Math.min(pages.length - 1, activePageIndex + 1))}
                  disabled={activePageIndex >= pages.length - 1}
                  className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Next Page (Primary)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {renderSinglePage(activePageIndex, false)}
          </div>

          {/* ================================================================= */}
          {/* Split Reference View Pane with Independent Page Navigator */}
          {/* ================================================================= */}
          <div className="flex-1 flex flex-col items-center w-full">
            <div className="w-full flex items-center justify-between bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-2.5 mb-3 shadow-sm select-none">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5" />
                  <span>Split Reference Pane</span>
                </span>
                <span className="text-stone-300 dark:text-stone-700">|</span>
                <span className="text-xs text-stone-500 font-mono">
                  Page {splitPageIndex + 1} of {pages.length}
                </span>
              </div>

              {/* Split Page Switcher Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onSplitPageChange(Math.max(0, splitPageIndex - 1))}
                  disabled={splitPageIndex === 0}
                  className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Previous Page (Reference)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={splitPageIndex}
                  onChange={(e) => onSplitPageChange(Number(e.target.value))}
                  className="text-xs py-1.5 px-3 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none font-medium cursor-pointer text-stone-800 dark:text-stone-200"
                >
                  {pages.map((p, idx) => (
                    <option key={`split-opt-${p.id}`} value={idx}>
                      Page {idx + 1}: {p.title || `${p.template} page`}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => onSplitPageChange(Math.min(pages.length - 1, splitPageIndex + 1))}
                  disabled={splitPageIndex >= pages.length - 1}
                  className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Next Page (Reference)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {renderSinglePage(splitPageIndex, true)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {pages.map((_, idx) => renderSinglePage(idx, false))}
        </div>
      )}

      {/* Floating Touch-Friendly Zoom Widget for Fingers */}
      <div className="fixed bottom-6 right-6 z-30 flex items-center bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl p-1 gap-1 select-none">
        <button
          onClick={() => setScale((s) => Math.max(0.4, Number((s - 0.15).toFixed(2))))}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-lg transition-colors cursor-pointer"
          title="Zoom out"
        >
          -
        </button>
        <button
          onClick={() => setScale(1.0)}
          className="px-2.5 h-10 flex items-center justify-center rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-mono tabular-nums text-stone-800 dark:text-stone-200 font-semibold cursor-pointer"
          title="Tap to Reset 100%"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-lg transition-colors cursor-pointer"
          title="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
};
