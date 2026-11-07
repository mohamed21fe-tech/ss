import React, { useState, useRef } from 'react';
import {
  DocumentAnnotations,
  DocumentItem,
  DocumentPage,
  FolderItem,
  PageTemplate,
} from '../types';
import {
  BookOpen,
  Folder,
  UploadCloud,
  Search,
  Plus,
  Sparkles,
  FileText,
  Clock,
  ArrowRight,
  Database,
  Trash2,
  Bookmark as BookmarkIcon,
  Volume2,
  Download,
  Grid,
  Sun,
  Moon,
  FolderPlus,
  CheckCircle2,
  Compass,
  GraduationCap,
} from 'lucide-react';
import { loadAndRenderPdf, renderTemplateBackground } from '../lib/pdfRenderer';

interface MainMenuProps {
  documents: DocumentItem[];
  activeDocId: string;
  annotationsMap: Record<string, DocumentAnnotations>;
  isDark: boolean;
  onToggleTheme: () => void;
  onSelectDocument: (docId: string) => void;
  onUploadPdf: (newDoc: DocumentItem, renderedPages: any[]) => void;
  onCreateNotebook: (title: string, course: string, template: PageTemplate, color: string) => void;
  onDeleteDocument: (docId: string) => void;
  onOpenArchitecture: () => void;
  onOpenFlashcards: () => void;
  onExportMarkdown: () => void;
}

const DEFAULT_FOLDERS: FolderItem[] = [
  { id: 'all', name: 'All Courses', course: 'All', color: '#0f172a' },
  { id: 'folder-neuro', name: 'NEUR 101: Cellular Neuroscience', course: 'Neuroscience', term: 'Fall 2026', color: '#0284c7' },
  { id: 'folder-chem', name: 'CHEM 220: Organic Chemistry II', course: 'Chemistry', term: 'Fall 2026', color: '#16a34a' },
  { id: 'folder-math', name: 'MATH 213: Multivariable Calculus', course: 'Mathematics', term: 'Fall 2026', color: '#9333ea' },
];

export const MainMenu: React.FC<MainMenuProps> = ({
  documents,
  activeDocId,
  annotationsMap,
  isDark,
  onToggleTheme,
  onSelectDocument,
  onUploadPdf,
  onCreateNotebook,
  onDeleteDocument,
  onOpenArchitecture,
  onOpenFlashcards,
  onExportMarkdown,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New notebook form state
  const [newTitle, setNewTitle] = useState('');
  const [newCourse, setNewCourse] = useState('General Notes');
  const [newTemplate, setNewTemplate] = useState<PageTemplate>('cornell');
  const [newColor, setNewColor] = useState('#0284c7');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0];
  const activeDocAnnotations = annotationsMap[activeDoc?.id] || {
    strokes: [],
    shapes: [],
    textNotes: [],
    stickyNotes: [],
    audioNotes: [],
    bookmarks: [],
    flashcards: [],
  };

  // Compute total stats across platform
  const totalCards = Object.values(annotationsMap).reduce((acc, a) => acc + (a.flashcards?.length || 0), 0);
  const totalMemos = Object.values(annotationsMap).reduce((acc, a) => acc + (a.audioNotes?.length || 0), 0);
  const totalBookmarks = Object.values(annotationsMap).reduce((acc, a) => acc + (a.bookmarks?.length || 0), 0);

  const handleFileUpload = async (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF document.');
      return;
    }

    try {
      setIsUploading(true);
      const buffer = await file.arrayBuffer();
      const renderedPages = await loadAndRenderPdf(buffer, 30, 1.4);

      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        title: file.name,
        courseName: selectedFolder !== 'all' ? DEFAULT_FOLDERS.find((f) => f.id === selectedFolder)?.name || 'General' : 'Uploaded Course Notes',
        folderId: selectedFolder !== 'all' ? selectedFolder : 'folder-neuro',
        totalPages: renderedPages.length,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        isSample: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['uploaded', 'pdf-import'],
      };

      onUploadPdf(newDoc, renderedPages);
      setIsUploading(false);
    } catch (err) {
      console.error('Failed to parse uploaded PDF:', err);
      alert('Could not render this PDF. The document might be password-protected or corrupted.');
      setIsUploading(false);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateNotebook(newTitle.trim(), newCourse.trim() || 'General Notes', newTemplate, newColor);
    setNewTitle('');
    setCreateModalOpen(false);
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFolder = selectedFolder === 'all' || doc.folderId === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  return (
    <div className={`w-full min-h-screen overflow-y-auto ${isDark ? 'bg-stone-950 text-stone-100' : 'bg-stone-50 text-stone-900'} antialiased`}>
      {/* Main Menu Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-6 md:px-12 py-3.5 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center font-bold text-lg font-display shadow-sm">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold font-display tracking-tight text-stone-900 dark:text-stone-100">
                Scriptor Hub
              </span>
              <span className="text-[11px] font-medium text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
                Dashboard
              </span>
            </div>
            <p className="text-[11px] text-stone-500 hidden sm:block">
              Organized smart pen notes, PDF annotations & study aids
            </p>
          </div>
        </div>

        {/* Global Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lectures, topics, tags, or notes..."
              className="w-full text-xs pl-9 pr-4 py-2 bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Upload PDF</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Notebook</span>
          </button>

          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
          </button>

          <button
            onClick={onOpenArchitecture}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors hidden lg:block"
            title="Database Schema & Architecture"
          >
            <Database className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hidden File Input for PDF Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 space-y-10">
        {/* Section 1: Quick Study Command Stats & Jump Back In Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Document Card */}
          {activeDoc && (
            <div className="lg:col-span-2 bg-gradient-to-br from-white to-stone-50 dark:from-stone-900 dark:to-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Currently Active Lecture</span>
                  </span>
                  <span className="text-xs text-stone-400 font-mono">
                    {activeDoc.totalPages} Pages · {activeDoc.fileSize}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl md:text-2xl font-bold font-display text-stone-900 dark:text-stone-100 tracking-tight">
                    {activeDoc.title}
                  </h2>
                  <p className="text-xs text-stone-500 mt-1 font-medium">
                    {activeDoc.courseName}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-stone-600 dark:text-stone-300">
                  <span className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-lg">
                    <FileText className="w-3.5 h-3.5 text-stone-500" />
                    <span>{activeDocAnnotations.strokes?.length || 0} ink marks</span>
                  </span>
                  <span className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{activeDocAnnotations.flashcards?.length || 0} flashcards</span>
                  </span>
                  <span className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-lg">
                    <BookmarkIcon className="w-3.5 h-3.5" />
                    <span>{activeDocAnnotations.bookmarks?.length || 0} bookmarks</span>
                  </span>
                </div>
              </div>

              <div className="pt-6 flex items-center gap-3">
                <button
                  onClick={() => onSelectDocument(activeDoc.id)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-xs font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors shadow-sm cursor-pointer"
                >
                  <span>Resume Annotating</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onExportMarkdown}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Notes</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Study Review Widget */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-amber-500" />
                  <span>Study Center</span>
                </span>
                <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                  SM-2 Active
                </span>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Review cards due today using the spaced repetition algorithm to retain key formulas and terminology.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 text-center">
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl">
                <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                  {totalCards}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Cards</div>
              </div>
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl">
                <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {totalMemos}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Memos</div>
              </div>
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl">
                <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                  {totalBookmarks}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Bookmarks</div>
              </div>
            </div>

            <button
              onClick={onOpenFlashcards}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-stone-950" />
              <span>Launch Flashcards Review</span>
            </button>
          </div>
        </div>

        {/* Section 2: Courses Filter Bar */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100">
                Course Notebooks & Slide Decks
              </h3>
              <p className="text-xs text-stone-500">
                Filter documents by academic term or course topic
              </p>
            </div>

            {/* Course Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {DEFAULT_FOLDERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolder(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedFolder === f.id
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                      : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700/70 border border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {f.id !== 'all' && (
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                  )}
                  <span>{f.course}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Documents Grid with Drag & Drop Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {/* Quick Upload Drop Card */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[220px] ${
                isDragging
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                  : 'border-stone-300 dark:border-stone-800 hover:border-stone-400 hover:bg-stone-100/50 dark:hover:bg-stone-900/40 bg-white/50 dark:bg-stone-900/20'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 mb-3">
                <UploadCloud className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                {isUploading ? 'Parsing & Rendering...' : 'Drop PDF Here'}
              </span>
              <p className="text-[11px] text-stone-400 mt-1 max-w-[160px] leading-relaxed">
                Upload lecture slides, textbooks, or problem sets
              </p>
            </div>

            {/* Document Cards */}
            {filteredDocs.map((doc) => {
              const docAnnos = annotationsMap[doc.id] || { strokes: [], flashcards: [], stickyNotes: [] };
              const isCurrent = doc.id === activeDocId;

              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument(doc.id)}
                  className={`bg-white dark:bg-stone-900 border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
                    isCurrent
                      ? 'ring-2 ring-stone-900 dark:ring-stone-100 border-transparent'
                      : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Tag & Actions */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md truncate max-w-[160px]">
                        {doc.courseName}
                      </span>
                      {!doc.isSample && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this notebook?')) onDeleteDocument(doc.id);
                          }}
                          className="p-1 text-stone-400 hover:text-red-500 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
                        {doc.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-1">
                        <span>{doc.totalPages} Pages</span>
                        <span>·</span>
                        <span>{doc.fileSize}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Annotations summary */}
                  <div className="pt-4 border-t border-stone-100 dark:border-stone-800/80 mt-4 flex items-center justify-between text-[11px] text-stone-500">
                    <div className="flex items-center gap-1.5">
                      <span>{docAnnos.strokes?.length || 0} ink</span>
                      <span>·</span>
                      <span>{docAnnos.flashcards?.length || 0} cards</span>
                    </div>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                      Open →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Notebook Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Create New Study Notebook
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Notebook Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Biology Midterm Prep or Lab Notebook"
                  className="w-full text-xs px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Course or Category
                </label>
                <input
                  type="text"
                  value={newCourse}
                  onChange={(e) => setNewCourse(e.target.value)}
                  placeholder="e.g., NEUR 101 or Personal Study"
                  className="w-full text-xs px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Initial Paper Template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['cornell', 'lined', 'grid', 'blank'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewTemplate(t)}
                      className={`p-2.5 rounded-xl border text-xs capitalize text-left flex items-center justify-between ${
                        newTemplate === t
                          ? 'border-stone-900 dark:border-stone-100 bg-stone-100 dark:bg-stone-800 font-semibold text-stone-900 dark:text-stone-100'
                          : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      <span>{t} paper</span>
                      {newTemplate === t && <CheckCircle2 className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg hover:bg-stone-800"
                >
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
