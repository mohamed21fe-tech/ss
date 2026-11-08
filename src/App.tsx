import React, { useState, useEffect, useCallback } from 'react';
import {
  DocumentAnnotations,
  DocumentItem,
  DocumentPage,
  EraserType,
  Flashcard,
  InkStroke,
  PageTemplate,
  PenStyle,
  ShapeAnnotation,
  ShapeType,
  StickyNote,
  TextNote,
  ToolType,
} from './types';
import {
  SAMPLE_DOCUMENTS,
  getSamplePagesForDoc,
  getInitialAnnotationsForDoc,
} from './data/sampleDocuments';
import { Toolbar } from './components/Toolbar';
import { PDFDocumentView } from './components/PDFDocumentView';
import { LibrarySidebar } from './components/LibrarySidebar';
import { StudyPanel } from './components/StudyPanel';
import { MainMenu } from './components/MainMenu';
import { FlashcardReviewModal } from './components/FlashcardReviewModal';
import { AudioRecorderModal } from './components/AudioRecorderModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { renderTemplateBackground } from './lib/pdfRenderer';
import {
  BookOpen,
  Folder,
  Columns,
  Sparkles,
  Database,
  Moon,
  Sun,
  PanelRight,
  Menu,
  ChevronDown,
  LayoutGrid,
  ChevronLeft,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function App() {
  // Navigation View State: 'workspace' (PDF Viewer + Ink) or 'menu' (Organized Dashboard)
  const [currentView, setCurrentView] = useState<'workspace' | 'menu'>('menu');

  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('scriptor_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  });

  // Documents and Pages Map
  const [documents, setDocuments] = useState<DocumentItem[]>(SAMPLE_DOCUMENTS);
  const [activeDocId, setActiveDocId] = useState<string>('doc-neuro-101');

  // Multi-document pages cache to prevent uploaded PDFs from disappearing
  const [pagesMap, setPagesMap] = useState<Record<string, DocumentPage[]>>(() => {
    return {
      'doc-neuro-101': getSamplePagesForDoc('doc-neuro-101'),
      'doc-ochem-2': getSamplePagesForDoc('doc-ochem-2'),
      'doc-calc-3': getSamplePagesForDoc('doc-calc-3'),
    };
  });

  // Current active pages list
  const [pages, setPages] = useState<DocumentPage[]>([]);

  // Annotations map per document
  const [allAnnotations, setAllAnnotations] = useState<Record<string, DocumentAnnotations>>(() => {
    return {
      'doc-neuro-101': getInitialAnnotationsForDoc('doc-neuro-101'),
      'doc-ochem-2': getInitialAnnotationsForDoc('doc-ochem-2'),
      'doc-calc-3': getInitialAnnotationsForDoc('doc-calc-3'),
    };
  });

  // Active document's annotations
  const [annotations, setAnnotations] = useState<DocumentAnnotations>(allAnnotations['doc-neuro-101']);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<DocumentAnnotations[]>([]);
  const [redoStack, setRedoStack] = useState<DocumentAnnotations[]>([]);

  // Viewport & Scale State
  const [scale, setScale] = useState<number>(1.0);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [splitView, setSplitView] = useState<boolean>(false);
  const [splitPageIndex, setSplitPageIndex] = useState<number>(1);

  // Active Tooling State
  const [tool, setTool] = useState<ToolType>('pen');
  const [penStyle, setPenStyle] = useState<PenStyle>('fountain');
  const [color, setColor] = useState<string>('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState<number>(3.5);
  const [opacity, setOpacity] = useState<number>(1.0);
  const [eraserType, setEraserType] = useState<EraserType>('stroke');
  const [eraserRadius, setEraserRadius] = useState<number>(18);
  const [shapeType, setShapeType] = useState<ShapeType>('line');
  const [palmRejection, setPalmRejection] = useState<boolean>(true);

  // Modals & Drawers
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isStudyPanelOpen, setIsStudyPanelOpen] = useState<boolean>(false);
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState<boolean>(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);
  const [audioModalState, setAudioModalState] = useState<{
    isOpen: boolean;
    pageIndex: number;
    coords: { x: number; y: number };
  }>({
    isOpen: false,
    pageIndex: 0,
    coords: { x: 100, y: 200 },
  });

  // Hide/Show Top Navigation Bar (Zen Mode)
  const [isTopBarHidden, setIsTopBarHidden] = useState<boolean>(false);

  // Sync dark class on html root
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('scriptor_theme', isDark ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [isDark]);

  // Load document pages and annotations when activeDocId changes
  useEffect(() => {
    // 1. Load or retrieve annotations
    const saved = localStorage.getItem(`scriptor_annos_${activeDocId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnnotations(parsed);
        setAllAnnotations((prev) => ({ ...prev, [activeDocId]: parsed }));
      } catch {
        const initial = allAnnotations[activeDocId] || getInitialAnnotationsForDoc(activeDocId);
        setAnnotations(initial);
      }
    } else {
      const initial = allAnnotations[activeDocId] || getInitialAnnotationsForDoc(activeDocId);
      setAnnotations(initial);
    }

    // 2. Load pages from cache (ensuring uploaded PDFs NEVER disappear)
    if (pagesMap[activeDocId] && pagesMap[activeDocId].length > 0) {
      const existingPages = pagesMap[activeDocId];
      setPages(existingPages);
      setActivePageIndex(0);
      setSplitPageIndex(existingPages.length > 1 ? 1 : 0);
    } else {
      const docPages = getSamplePagesForDoc(activeDocId);
      setPagesMap((prev) => ({ ...prev, [activeDocId]: docPages }));
      setPages(docPages);
      setActivePageIndex(0);
      setSplitPageIndex(docPages.length > 1 ? 1 : 0);
    }

    setHistory([]);
    setRedoStack([]);
  }, [activeDocId]);

  // Save annotations to LocalStorage on change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`scriptor_annos_${activeDocId}`, JSON.stringify(annotations));
      setAllAnnotations((prev) => ({ ...prev, [activeDocId]: annotations }));
    }, 400);
    return () => clearTimeout(timer);
  }, [annotations, activeDocId]);

  // Push snapshot to undo history
  const pushHistory = (current: DocumentAnnotations) => {
    setHistory((prev) => [...prev.slice(-30), JSON.parse(JSON.stringify(current))]);
    setRedoStack([]);
  };

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(annotations))]);
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setAnnotations(previous);
  }, [history, annotations]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(annotations))]);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setAnnotations(next);
  }, [redoStack, annotations]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === 'p') {
        setTool('pen');
      } else if (e.key.toLowerCase() === 'h') {
        setTool('highlighter');
      } else if (e.key.toLowerCase() === 'e') {
        setTool('eraser');
      } else if (e.key.toLowerCase() === 'l') {
        setTool('lasso');
      } else if (e.key.toLowerCase() === 't') {
        setTool('text');
      } else if (e.key.toLowerCase() === 's') {
        setTool('sticky');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Stroke handlers
  const handleAddStroke = (newStroke: InkStroke) => {
    pushHistory(annotations);
    setAnnotations((prev) => ({
      ...prev,
      strokes: [...prev.strokes, newStroke],
    }));
  };

  const handleRemoveStrokes = (strokeIds: string[]) => {
    pushHistory(annotations);
    setAnnotations((prev) => ({
      ...prev,
      strokes: prev.strokes.filter((s) => !strokeIds.includes(s.id)),
    }));
  };

  const handleMoveStrokes = (strokeIds: string[], dx: number, dy: number) => {
    setAnnotations((prev) => ({
      ...prev,
      strokes: prev.strokes.map((s) => {
        if (!strokeIds.includes(s.id)) return s;
        return {
          ...s,
          points: s.points.map((p) => ({
            ...p,
            x: p.x + dx,
            y: p.y + dy,
          })),
        };
      }),
    }));
  };

  // Shape handlers
  const handleAddShape = (shape: ShapeAnnotation) => {
    pushHistory(annotations);
    setAnnotations((prev) => ({
      ...prev,
      shapes: [...prev.shapes, shape],
    }));
  };

  const handleRemoveShapes = (shapeIds: string[]) => {
    pushHistory(annotations);
    setAnnotations((prev) => ({
      ...prev,
      shapes: prev.shapes.filter((sh) => !shapeIds.includes(sh.id)),
    }));
  };

  // Text note handlers
  const handleUpdateTextNote = (updated: TextNote) => {
    setAnnotations((prev) => ({
      ...prev,
      textNotes: prev.textNotes.map((t) => (t.id === updated.id ? updated : t)),
    }));
  };

  const handleDeleteTextNote = (id: string) => {
    pushHistory(annotations);
    setAnnotations((prev) => ({
      ...prev,
      textNotes: prev.textNotes.filter((t) => t.id !== id),
    }));
  };

  // Sticky note handlers
  const handleUpdateStickyNote = (updated: StickyNote) => {
    setAnnotations((prev) => ({
      ...prev,
      stickyNotes: prev.stickyNotes.map((s) => (s.id === updated.id ? updated : s)),
    }));
  };

  const handleDeleteStickyNote = (id: string) => {
    pushHistory(annotations);
    setAnnotations((prev) => ({
      ...prev,
      stickyNotes: prev.stickyNotes.filter((s) => s.id !== id),
    }));
  };

  // Audio note handlers
  const handleDeleteAudioNote = (id: string) => {
    pushHistory(annotations);
    setAnnotations((prev) => ({
      ...prev,
      audioNotes: prev.audioNotes.filter((a) => a.id !== id),
    }));
  };

  const handleSaveAudioFromModal = (title: string, durationSeconds: number, blobUrl: string) => {
    pushHistory(annotations);
    setAnnotations((prev) => ({
      ...prev,
      audioNotes: [
        ...prev.audioNotes,
        {
          id: `audio-${Date.now()}`,
          pageIndex: audioModalState.pageIndex,
          x: audioModalState.coords.x,
          y: audioModalState.coords.y,
          title,
          durationSeconds,
          audioBlobUrl: blobUrl,
          createdAt: Date.now(),
        },
      ],
    }));
  };

  // Bookmarks
  const handleToggleBookmark = (pageIndex: number) => {
    pushHistory(annotations);
    setAnnotations((prev) => {
      const exists = prev.bookmarks.find((b) => b.pageIndex === pageIndex);
      if (exists) {
        return {
          ...prev,
          bookmarks: prev.bookmarks.filter((b) => b.pageIndex !== pageIndex),
        };
      } else {
        return {
          ...prev,
          bookmarks: [
            ...prev.bookmarks,
            {
              id: `bm-${Date.now()}`,
              pageIndex,
              title: `Page ${pageIndex + 1} Bookmark`,
              createdAt: Date.now(),
            },
          ],
        };
      }
    });
  };

  // Insert custom template page (blank, lined, grid, cornell)
  const handleInsertPage = (template: PageTemplate, afterPageIndex: number) => {
    const newPage: DocumentPage = {
      id: `page-custom-${Date.now()}`,
      pageNumber: pages.length + 1,
      template,
      title: `${template.charAt(0).toUpperCase() + template.slice(1)} Study Page`,
      aspectRatio: 1200 / 900,
      bgDataUrl: renderTemplateBackground(
        template === 'pdf' ? 'blank' : template,
        900,
        1200,
        isDark
      ),
    };

    const newPages = [...pages];
    newPages.splice(afterPageIndex + 1, 0, newPage);
    setPages(newPages);
    setPagesMap((prev) => ({ ...prev, [activeDocId]: newPages }));

    // Adjust existing annotations for pages shifted downward
    setAnnotations((prev) => ({
      ...prev,
      strokes: prev.strokes.map((s) => (s.pageIndex > afterPageIndex ? { ...s, pageIndex: s.pageIndex + 1 } : s)),
      shapes: prev.shapes.map((sh) => (sh.pageIndex > afterPageIndex ? { ...sh, pageIndex: sh.pageIndex + 1 } : sh)),
      textNotes: prev.textNotes.map((t) => (t.pageIndex > afterPageIndex ? { ...t, pageIndex: t.pageIndex + 1 } : t)),
      stickyNotes: prev.stickyNotes.map((sn) => (sn.pageIndex > afterPageIndex ? { ...sn, pageIndex: sn.pageIndex + 1 } : sn)),
      audioNotes: prev.audioNotes.map((an) => (an.pageIndex > afterPageIndex ? { ...an, pageIndex: an.pageIndex + 1 } : an)),
      bookmarks: prev.bookmarks.map((bm) => (bm.pageIndex > afterPageIndex ? { ...bm, pageIndex: bm.pageIndex + 1 } : bm)),
      flashcards: prev.flashcards.map((fc) => (fc.pageIndex > afterPageIndex ? { ...fc, pageIndex: fc.pageIndex + 1 } : fc)),
    }));
  };

  // Canvas click to place text, sticky, or audio note
  const handleCanvasClickToAddNote = (
    x: number,
    y: number,
    noteTool: 'text' | 'sticky' | 'audio',
    pageIndex: number
  ) => {
    if (noteTool === 'text') {
      pushHistory(annotations);
      setAnnotations((prev) => ({
        ...prev,
        textNotes: [
          ...prev.textNotes,
          {
            id: `text-${Date.now()}`,
            pageIndex,
            x,
            y,
            content: 'Write your note here...',
            fontSize: 14,
            color: isDark ? '#f5f5f4' : '#1c1917',
          },
        ],
      }));
      setTool('pen');
    } else if (noteTool === 'sticky') {
      pushHistory(annotations);
      setAnnotations((prev) => ({
        ...prev,
        stickyNotes: [
          ...prev.stickyNotes,
          {
            id: `sticky-${Date.now()}`,
            pageIndex,
            x,
            y,
            width: 200,
            height: 150,
            color: 'yellow',
            content: '',
          },
        ],
      }));
      setTool('pen');
    } else if (noteTool === 'audio') {
      setAudioModalState({
        isOpen: true,
        pageIndex,
        coords: { x, y },
      });
      setTool('pen');
    }
  };

  // Flashcards CRUD
  const handleUpdateFlashcard = (updated: Flashcard) => {
    setAnnotations((prev) => ({
      ...prev,
      flashcards: prev.flashcards.map((f) => (f.id === updated.id ? updated : f)),
    }));
  };

  const handleAddFlashcard = (newCard: Flashcard) => {
    pushHistory(annotations);
    setAnnotations((prev) => ({
      ...prev,
      flashcards: [...prev.flashcards, newCard],
    }));
  };

  // Robust PDF Upload Handler: stores rendered pages into pagesMap to prevent disappearing!
  const handleUploadPdf = (newDoc: DocumentItem, renderedPages: any[]) => {
    const docPages: DocumentPage[] = renderedPages.map((rp, i) => ({
      id: `up-page-${newDoc.id}-${i + 1}`,
      pageNumber: rp.pageNumber,
      template: 'pdf',
      title: `Page ${rp.pageNumber}`,
      aspectRatio: rp.height / (rp.width || 850),
      bgDataUrl: rp.dataUrl,
    }));

    // 1. Store pages in map first so useEffect preserves them
    setPagesMap((prev) => ({
      ...prev,
      [newDoc.id]: docPages,
    }));

    // 2. Add document to list
    setDocuments((prev) => [newDoc, ...prev]);

    // 3. Initialize blank annotations for the new document
    const emptyAnnos: DocumentAnnotations = {
      strokes: [],
      shapes: [],
      textNotes: [],
      stickyNotes: [],
      audioNotes: [],
      bookmarks: [],
      flashcards: [],
    };

    setAllAnnotations((prev) => ({
      ...prev,
      [newDoc.id]: emptyAnnos,
    }));
    setAnnotations(emptyAnnos);

    // 4. Set active document and pages
    setActiveDocId(newDoc.id);
    setPages(docPages);
    setActivePageIndex(0);

    // 5. Open workspace
    setCurrentView('workspace');
  };

  // Create new blank notebook with selected paper template
  const handleCreateNotebook = (title: string, course: string, template: PageTemplate, color: string) => {
    const newDocId = `nb-${Date.now()}`;
    const initialPages: DocumentPage[] = [
      {
        id: `p-${newDocId}-1`,
        pageNumber: 1,
        template,
        title: `${template.charAt(0).toUpperCase() + template.slice(1)} Page 1`,
        aspectRatio: 1200 / 900,
        bgDataUrl: renderTemplateBackground(template === 'pdf' ? 'blank' : template, 900, 1200, isDark),
      },
    ];

    const newDoc: DocumentItem = {
      id: newDocId,
      title: title.endsWith('.pdf') ? title : `${title}.pdf`,
      courseName: course,
      folderId: 'folder-custom',
      totalPages: 1,
      fileSize: '0.4 MB',
      isSample: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: ['notebook', template],
    };

    setPagesMap((prev) => ({ ...prev, [newDocId]: initialPages }));
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(newDocId);
    setPages(initialPages);
    setActivePageIndex(0);

    const emptyAnnos: DocumentAnnotations = {
      strokes: [],
      shapes: [],
      textNotes: [],
      stickyNotes: [],
      audioNotes: [],
      bookmarks: [],
      flashcards: [],
    };
    setAnnotations(emptyAnnos);
    setAllAnnotations((prev) => ({ ...prev, [newDocId]: emptyAnnos }));

    setCurrentView('workspace');
  };

  // Delete Document
  const handleDeleteDoc = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    if (activeDocId === docId) {
      const remaining = documents.filter((d) => d.id !== docId);
      if (remaining.length > 0) {
        setActiveDocId(remaining[0].id);
      }
    }
  };

  // Export to Markdown
  const handleExportMarkdown = () => {
    const currentDoc = documents.find((d) => d.id === activeDocId);
    let md = `# ${currentDoc?.title || 'Lecture Study Notes'}\n`;
    md += `**Course**: ${currentDoc?.courseName || 'General'}\n`;
    md += `**Date**: ${new Date().toLocaleDateString()}\n\n`;

    md += `## Table of Contents & Bookmarks\n`;
    annotations.bookmarks.forEach((b) => {
      md += `- Page ${b.pageIndex + 1}: ${b.title}\n`;
    });
    md += `\n`;

    md += `## Typed & Sticky Notes\n`;
    pages.forEach((_, idx) => {
      const textNotes = annotations.textNotes.filter((t) => t.pageIndex === idx);
      const stickyNotes = annotations.stickyNotes.filter((s) => s.pageIndex === idx);
      const audioNotes = annotations.audioNotes.filter((a) => a.pageIndex === idx);

      if (textNotes.length > 0 || stickyNotes.length > 0 || audioNotes.length > 0) {
        md += `### Page ${idx + 1}\n`;
        textNotes.forEach((t) => {
          md += `- **Note**: ${t.content}\n`;
        });
        stickyNotes.forEach((s) => {
          md += `> **Sticky Note**: ${s.content}\n\n`;
        });
        audioNotes.forEach((a) => {
          md += `- 🎙️ **Voice Memo** (${a.durationSeconds}s): ${a.title}\n`;
        });
        md += `\n`;
      }
    });

    md += `## Spaced Repetition Flashcards\n`;
    annotations.flashcards.forEach((f, i) => {
      md += `### Card ${i + 1} (Page ${f.pageIndex + 1})\n`;
      md += `**Q**: ${f.question}\n\n`;
      md += `**A**: ${f.answer}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDoc?.title.replace(/\.[^/.]+$/, '')}_Notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Flattened Page Image
  const handleExportCanvasImage = () => {
    const page = pages[activePageIndex];
    if (!page) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1700;
    canvas.height = Math.round(1700 * (page.aspectRatio || 1.333));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load background image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = page.bgDataUrl || '';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Page_${activePageIndex + 1}_Annotated.png`;
      a.click();
    };
  };

  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0];

  return (
    <div className={`w-full h-screen flex flex-col overflow-hidden ${isDark ? 'dark bg-stone-950 text-stone-100' : 'bg-stone-100 text-stone-900'}`}>
      {/* ================================================================= */}
      {/* 1. Main Menu View: Organized Dashboard & Document Hub */}
      {/* ================================================================= */}
      {currentView === 'menu' ? (
        <MainMenu
          documents={documents}
          activeDocId={activeDocId}
          annotationsMap={allAnnotations}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          onSelectDocument={(id) => {
            setActiveDocId(id);
            setCurrentView('workspace');
          }}
          onUploadPdf={handleUploadPdf}
          onCreateNotebook={handleCreateNotebook}
          onDeleteDocument={handleDeleteDoc}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
          onOpenFlashcards={() => setIsFlashcardsOpen(true)}
          onExportMarkdown={handleExportMarkdown}
        />
      ) : (
        /* ================================================================= */
        /* 2. Workspace View: PDF Viewer + Ink Overlay + Floating Toolbar */
        /* ================================================================= */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Bar Contract (§2): [Brand title] — [4-5 nav links] — [1 action] */}
          {!isTopBarHidden ? (
            <header className="h-14 border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-6 flex items-center justify-between gap-8 shrink-0 z-30 select-none">
              {/* Zone 1: Single text element wordmark + Breadcrumb to Main Menu */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setCurrentView('menu')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer mr-1"
                  title="Return to Main Menu"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Main Menu</span>
                </button>

                <button
                  onClick={() => setIsLibraryOpen(true)}
                  className="p-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                  title="Open Library Drawer"
                >
                  <Menu className="w-4 h-4" />
                </button>

                <span className="text-base font-bold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0 font-display">
                  Scriptor
                </span>
                <span className="text-stone-300 dark:text-stone-700">/</span>
                <span className="text-xs font-medium text-stone-600 dark:text-stone-400 truncate max-w-[180px] sm:max-w-[280px]">
                  {activeDoc?.title}
                </span>
              </div>

              {/* Zone 2: 4–5 clean single-line text navigation links */}
              <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-stone-600 dark:text-stone-400">
                <button
                  onClick={() => setCurrentView('menu')}
                  className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => setSplitView(!splitView)}
                  className={`hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    splitView ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Split View</span>
                </button>

                <button
                  onClick={() => setIsFlashcardsOpen(true)}
                  className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Study Deck ({annotations.flashcards.length})</span>
                </button>

                <button
                  onClick={() => setIsArchitectureOpen(true)}
                  className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>SQL Schema</span>
                </button>
              </nav>

              {/* Zone 3: 1 primary action */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setIsDark(!isDark)}
                  className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  title={isDark ? 'Switch to Paper Mode' : 'Switch to Dark Mode'}
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
                </button>

                <button
                  onClick={() => setIsStudyPanelOpen(!isStudyPanelOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 rounded-xl hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
                >
                  <PanelRight className="w-3.5 h-3.5" />
                  <span>Study Assistant</span>
                </button>

                <button
                  onClick={() => setIsTopBarHidden(true)}
                  className="p-2 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  title="Hide Top Navigation Bar (Zen Mode)"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </header>
          ) : (
            <div className="fixed top-3 left-4 z-40 select-none">
              <button
                onClick={() => setIsTopBarHidden(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-full shadow-lg text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
                title="Show Top Navigation Bar"
              >
                <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                <span>Show Menu Bar</span>
              </button>
            </div>
          )}

          {/* Main Workspace Frame */}
          <div className="relative flex-1 flex overflow-hidden">
            {/* Floating Customizable Smart Ink Toolbar */}
            <Toolbar
              tool={tool}
              setTool={setTool}
              penStyle={penStyle}
              setPenStyle={setPenStyle}
              color={color}
              setColor={setColor}
              strokeWidth={strokeWidth}
              setStrokeWidth={setStrokeWidth}
              eraserType={eraserType}
              setEraserType={setEraserType}
              shapeType={shapeType}
              setShapeType={setShapeType}
              palmRejection={palmRejection}
              setPalmRejection={setPalmRejection}
              scale={scale}
              setScale={setScale}
              splitView={splitView}
              setSplitView={setSplitView}
              canUndo={history.length > 0}
              canRedo={redoStack.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onOpenFlashcards={() => setIsFlashcardsOpen(true)}
              onRecordAudioClick={() =>
                setAudioModalState({
                  isOpen: true,
                  pageIndex: activePageIndex,
                  coords: { x: 120, y: 220 },
                })
              }
            />

            {/* Central PDF & Canvas Viewport with Touch Gestures */}
            <main className="flex-1 h-full overflow-hidden relative">
              <PDFDocumentView
                document={activeDoc}
                pages={pages}
                annotations={annotations}
                scale={scale}
                setScale={setScale}
                isDark={isDark}
                tool={tool}
                penStyle={penStyle}
                color={color}
                strokeWidth={strokeWidth}
                opacity={opacity}
                eraserType={eraserType}
                eraserRadius={eraserRadius}
                shapeType={shapeType}
                palmRejection={palmRejection}
                activePageIndex={activePageIndex}
                splitView={splitView}
                splitPageIndex={splitPageIndex}
                onPageChange={setActivePageIndex}
                onSplitPageChange={setSplitPageIndex}
                onAddStroke={handleAddStroke}
                onRemoveStrokes={handleRemoveStrokes}
                onAddShape={handleAddShape}
                onRemoveShapes={handleRemoveShapes}
                onMoveStrokes={handleMoveStrokes}
                onUpdateTextNote={handleUpdateTextNote}
                onDeleteTextNote={handleDeleteTextNote}
                onUpdateStickyNote={handleUpdateStickyNote}
                onDeleteStickyNote={handleDeleteStickyNote}
                onDeleteAudioNote={handleDeleteAudioNote}
                onToggleBookmark={handleToggleBookmark}
                onInsertPage={handleInsertPage}
                onCanvasClickToAddNote={handleCanvasClickToAddNote}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
            </main>

            {/* Document Library Sidebar Drawer */}
            <LibrarySidebar
              documents={documents}
              activeDocId={activeDocId}
              onSelectDoc={(id) => {
                setActiveDocId(id);
                setIsLibraryOpen(false);
              }}
              onUploadPdf={handleUploadPdf}
              onDeleteDoc={handleDeleteDoc}
              onOpenArchitecture={() => {
                setIsLibraryOpen(false);
                setIsArchitectureOpen(true);
              }}
              isOpen={isLibraryOpen}
              onClose={() => setIsLibraryOpen(false)}
            />

            {/* Right Study Panel Drawer */}
            <StudyPanel
              document={activeDoc}
              pages={pages}
              annotations={annotations}
              activePageIndex={activePageIndex}
              onPageSelect={(idx) => {
                setActivePageIndex(idx);
                setIsStudyPanelOpen(false);
              }}
              onOpenFlashcards={() => {
                setIsStudyPanelOpen(false);
                setIsFlashcardsOpen(true);
              }}
              onToggleBookmark={handleToggleBookmark}
              onExportMarkdown={handleExportMarkdown}
              onExportCanvasImage={handleExportCanvasImage}
              isOpen={isStudyPanelOpen}
              onClose={() => setIsStudyPanelOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Global Modals */}
      <FlashcardReviewModal
        flashcards={annotations.flashcards}
        isOpen={isFlashcardsOpen}
        onClose={() => setIsFlashcardsOpen(false)}
        onUpdateFlashcard={handleUpdateFlashcard}
        onAddCard={handleAddFlashcard}
        currentPageIndex={activePageIndex}
      />

      <AudioRecorderModal
        pageIndex={audioModalState.pageIndex}
        coords={audioModalState.coords}
        isOpen={audioModalState.isOpen}
        onClose={() => setAudioModalState((prev) => ({ ...prev, isOpen: false }))}
        onSaveAudio={handleSaveAudioFromModal}
      />

      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />
    </div>
  );
}
