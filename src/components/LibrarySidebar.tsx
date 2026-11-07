import React, { useState, useRef } from 'react';
import { DocumentItem, FolderItem } from '../types';
import {
  BookOpen,
  Folder,
  UploadCloud,
  Search,
  Plus,
  Tag,
  Clock,
  FileText,
  ChevronRight,
  FolderPlus,
  Trash2,
  Database,
  ExternalLink,
} from 'lucide-react';
import { loadAndRenderPdf } from '../lib/pdfRenderer';

interface LibrarySidebarProps {
  documents: DocumentItem[];
  activeDocId: string;
  onSelectDoc: (docId: string) => void;
  onUploadPdf: (newDoc: DocumentItem, renderedPages: any[]) => void;
  onDeleteDoc: (docId: string) => void;
  onOpenArchitecture: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_FOLDERS: FolderItem[] = [
  { id: 'folder-neuro', name: 'NEUR 101: Cellular Neuroscience', course: 'Neuroscience', term: 'Fall 2026', color: '#0284c7' },
  { id: 'folder-chem', name: 'CHEM 220: Organic Chemistry II', course: 'Chemistry', term: 'Fall 2026', color: '#16a34a' },
  { id: 'folder-math', name: 'MATH 213: Multivariable Calculus', course: 'Mathematics', term: 'Fall 2026', color: '#9333ea' },
];

export const LibrarySidebar: React.FC<LibrarySidebarProps> = ({
  documents,
  activeDocId,
  onSelectDoc,
  onUploadPdf,
  onDeleteDoc,
  onOpenArchitecture,
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF document.');
      return;
    }

    try {
      setIsUploading(true);
      const buffer = await file.arrayBuffer();
      // Render pages using PDF.js
      const renderedPages = await loadAndRenderPdf(buffer, 30, 1.4);

      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        title: file.name,
        courseName: selectedFolder ? DEFAULT_FOLDERS.find((f) => f.id === selectedFolder)?.name || 'General' : 'Uploaded Lectures',
        folderId: selectedFolder || 'folder-neuro',
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

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFolder = !selectedFolder || doc.folderId === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center font-bold font-display text-base shadow">
            S
          </div>
          <div>
            <h1 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Scriptor Library
            </h1>
            <p className="text-[11px] text-stone-500">Smart Pen PDF Platform</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          ✕
        </button>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="p-4 border-b border-stone-100 dark:border-stone-800">
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
          className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-all ${
            isDragging
              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
              : 'border-stone-300 dark:border-stone-700 hover:border-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/40'
          }`}
        >
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
          <UploadCloud className="w-6 h-6 mx-auto mb-1 text-stone-400" />
          <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
            {isUploading ? 'Parsing & Rendering PDF...' : 'Upload PDF Notes'}
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Drag & drop or click to browse
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents or tags..."
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:border-stone-400"
          />
        </div>
      </div>

      {/* Courses / Folders Filter */}
      <div className="px-4 py-2 border-b border-stone-100 dark:border-stone-800">
        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center justify-between">
          <span>Courses</span>
          {selectedFolder && (
            <button
              onClick={() => setSelectedFolder(null)}
              className="text-[10px] font-medium text-stone-500 hover:text-stone-800 cursor-pointer"
            >
              Show All
            </button>
          )}
        </div>
        <div className="space-y-1">
          {DEFAULT_FOLDERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFolder(selectedFolder === f.id ? null : f.id)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                selectedFolder === f.id
                  ? 'bg-stone-100 dark:bg-stone-800 font-semibold text-stone-900 dark:text-stone-100'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/40'
              }`}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
              <span className="truncate flex-1">{f.course}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1 mb-1">
          Notebooks & Lecture Slides ({filteredDocs.length})
        </div>

        {filteredDocs.map((doc) => {
          const isActive = doc.id === activeDocId;
          return (
            <div
              key={doc.id}
              onClick={() => {
                onSelectDoc(doc.id);
                onClose();
              }}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                isActive
                  ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 shadow-sm'
                  : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 hover:border-stone-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-600' : 'text-stone-400'}`} />
                  <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 line-clamp-1">
                    {doc.title}
                  </div>
                </div>

                {!doc.isSample && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this notebook?')) onDeleteDoc(doc.id);
                    }}
                    className="p-1 text-stone-400 hover:text-red-500 rounded"
                    title="Delete Notebook"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-[11px] text-stone-500 mt-1 line-clamp-1">
                {doc.courseName}
              </div>

              <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-2">
                <span>{doc.totalPages} pages</span>
                <span>·</span>
                <span>{doc.fileSize}</span>
                {doc.isSample && (
                  <>
                    <span>·</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Preloaded</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: Architecture & SQL Blueprint Button */}
      <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/30">
        <button
          onClick={onOpenArchitecture}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer shadow-sm"
        >
          <Database className="w-3.5 h-3.5" />
          <span>SQL Schema & Architecture</span>
        </button>
      </div>
    </div>
  );
};
