import React, { useState } from 'react';
import {
  DocumentAnnotations,
  DocumentItem,
  DocumentPage,
  Flashcard,
} from '../types';
import {
  Bookmark as BookmarkIcon,
  Sparkles,
  FileText,
  Volume2,
  Download,
  Share2,
  Trash2,
  ChevronRight,
  LayoutGrid,
  CheckCircle2,
  Play,
  RotateCcw,
} from 'lucide-react';

interface StudyPanelProps {
  document: DocumentItem;
  pages: DocumentPage[];
  annotations: DocumentAnnotations;
  activePageIndex: number;
  onPageSelect: (pageIndex: number) => void;
  onOpenFlashcards: () => void;
  onToggleBookmark: (pageIndex: number) => void;
  onExportMarkdown: () => void;
  onExportCanvasImage: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const StudyPanel: React.FC<StudyPanelProps> = ({
  document,
  pages,
  annotations,
  activePageIndex,
  onPageSelect,
  onOpenFlashcards,
  onToggleBookmark,
  onExportMarkdown,
  onExportCanvasImage,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'pages' | 'flashcards' | 'notes' | 'export'>('pages');

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <span>Study Companion</span>
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-3 pt-2 border-b border-stone-200 dark:border-stone-800 gap-1 text-xs">
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex-1 pb-2 font-medium border-b-2 text-center transition-colors cursor-pointer ${
            activeTab === 'pages'
              ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Pages
        </button>
        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex-1 pb-2 font-medium border-b-2 text-center transition-colors cursor-pointer ${
            activeTab === 'flashcards'
              ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Cards ({annotations.flashcards.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 pb-2 font-medium border-b-2 text-center transition-colors cursor-pointer ${
            activeTab === 'notes'
              ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Notes & Memos
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 pb-2 font-medium border-b-2 text-center transition-colors cursor-pointer ${
            activeTab === 'export'
              ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Export
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'pages' && (
          <div className="grid grid-cols-2 gap-3">
            {pages.map((p, idx) => {
              const isCurrent = idx === activePageIndex;
              const hasBookmark = annotations.bookmarks.some((b) => b.pageIndex === idx);
              const strokeCount = annotations.strokes.filter((s) => s.pageIndex === idx).length;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onPageSelect(idx);
                  }}
                  className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all ${
                    isCurrent
                      ? 'ring-2 ring-stone-900 dark:ring-stone-100 border-transparent shadow-md'
                      : 'border-stone-200 dark:border-stone-800 hover:border-stone-400'
                  }`}
                >
                  <div className="aspect-[3/4] bg-stone-100 dark:bg-stone-800 relative flex items-center justify-center overflow-hidden">
                    {p.bgDataUrl ? (
                      <img
                        src={p.bgDataUrl}
                        alt={`Page ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-[11px] font-mono text-stone-400 capitalize">
                        {p.template}
                      </div>
                    )}
                    {hasBookmark && (
                      <div className="absolute top-1 right-1 bg-rose-600 text-white p-0.5 rounded shadow">
                        <BookmarkIcon className="w-2.5 h-2.5 fill-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-1.5 bg-white dark:bg-stone-900 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">
                      Page {idx + 1}
                    </span>
                    {strokeCount > 0 && (
                      <span className="text-[10px] text-stone-400">
                        {strokeCount} ink
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'flashcards' && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  SRS Study Deck
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  {annotations.flashcards.length} cards
                </span>
              </div>
              <button
                onClick={onOpenFlashcards}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 fill-stone-950" />
                <span>Launch Spaced Review</span>
              </button>
            </div>

            <div className="space-y-2">
              {annotations.flashcards.map((card, i) => (
                <div
                  key={card.id}
                  className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 rounded-xl text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                    <span>Card #{i + 1} · Page {card.pageIndex + 1}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Interval: {card.intervalDays}d
                    </span>
                  </div>
                  <div className="font-medium text-stone-900 dark:text-stone-100">
                    {card.question}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            {/* Sticky notes list */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                Sticky Notes ({annotations.stickyNotes.length})
              </div>
              {annotations.stickyNotes.map((sn) => (
                <div
                  key={sn.id}
                  onClick={() => onPageSelect(sn.pageIndex)}
                  className="p-2.5 mb-2 bg-amber-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-lg text-xs cursor-pointer hover:border-amber-400 transition-colors"
                >
                  <div className="text-[10px] text-stone-400 mb-1">
                    Page {sn.pageIndex + 1}
                  </div>
                  <div className="text-stone-800 dark:text-stone-200 line-clamp-2">
                    {sn.content || '(Empty sticky note)'}
                  </div>
                </div>
              ))}
            </div>

            {/* Audio notes list */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                Audio Voice Memos ({annotations.audioNotes.length})
              </div>
              {annotations.audioNotes.map((an) => (
                <div
                  key={an.id}
                  onClick={() => onPageSelect(an.pageIndex)}
                  className="p-2.5 mb-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs flex items-center justify-between cursor-pointer hover:border-stone-400"
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                    <div>
                      <div className="font-medium text-stone-800 dark:text-stone-200">
                        {an.title}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        Page {an.pageIndex + 1} · {an.durationSeconds}s
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-4">
            <div className="p-4 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 rounded-xl space-y-3">
              <h3 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                Flatten & Export Annotations
              </h3>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Export current page with all high-resolution ink strokes, shapes, and notes flattened into an image or PDF.
              </p>
              <button
                onClick={onExportCanvasImage}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Flattened Page</span>
              </button>
            </div>

            <div className="p-4 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 rounded-xl space-y-3">
              <h3 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                Markdown Study Summary
              </h3>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Download a clean Markdown document containing all your typed notes, sticky notes, and flashcard Q&A sets.
              </p>
              <button
                onClick={onExportMarkdown}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export Notes to Markdown</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
