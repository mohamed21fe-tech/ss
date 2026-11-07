import React, { useState } from 'react';
import { Database, Server, Cpu, Check, Copy, X, Terminal, Shield, FileText } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'sql' | 'env' | 'latency' | 'large_pdf'>('sql');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sqlSchema = `-- ====================================================================
-- Scriptor Smart Pen PDF Platform: Supabase / PostgreSQL Database Schema
-- Production Multi-Tenant Schema with Row Level Security (RLS) & Indexes
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  preferred_theme TEXT DEFAULT 'paper',
  palm_rejection_default BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COURSES & FOLDERS (Course > Week > Lecture)
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  course_code TEXT,
  term TEXT,
  color TEXT DEFAULT '#0284c7',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. NOTEBOOKS / DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  storage_path TEXT, -- Path in Supabase storage 'pdf-documents' bucket
  file_size_bytes BIGINT DEFAULT 0,
  total_pages INT NOT NULL DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DOCUMENT PAGES (supports PDF pages + inserted Cornell/Lined/Grid pages)
CREATE TABLE IF NOT EXISTS public.document_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'pdf', -- 'pdf', 'blank', 'lined', 'grid', 'cornell'
  aspect_ratio NUMERIC NOT NULL DEFAULT 1.333,
  bg_storage_path TEXT,
  thumbnail_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, page_number)
);

-- 6. INK STROKES (Pressure-sensitive stylus vectors)
CREATE TABLE IF NOT EXISTS public.annotations_ink_strokes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_index INT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  tool TEXT NOT NULL DEFAULT 'pen', -- 'pen', 'highlighter'
  style TEXT NOT NULL DEFAULT 'fountain', -- 'ballpoint', 'fountain', 'brush'
  color TEXT NOT NULL,
  width NUMERIC NOT NULL,
  opacity NUMERIC NOT NULL DEFAULT 1.0,
  -- Array of points: [{x, y, pressure, time}]
  points JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SHAPES (snapped lines, rectangles, arrows, ellipses)
CREATE TABLE IF NOT EXISTS public.annotations_shapes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_index INT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  shape_type TEXT NOT NULL, -- 'line', 'arrow', 'rectangle', 'circle'
  start_x NUMERIC NOT NULL,
  start_y NUMERIC NOT NULL,
  end_x NUMERIC NOT NULL,
  end_y NUMERIC NOT NULL,
  color TEXT NOT NULL,
  width NUMERIC NOT NULL,
  fill_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TEXT NOTES & STICKY NOTES
CREATE TABLE IF NOT EXISTS public.annotations_text_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_index INT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  width NUMERIC DEFAULT 240,
  content TEXT NOT NULL,
  font_size NUMERIC DEFAULT 14,
  color TEXT DEFAULT '#0f172a',
  is_bold BOOLEAN DEFAULT FALSE,
  is_italic BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.annotations_sticky_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_index INT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  width NUMERIC DEFAULT 200,
  height NUMERIC DEFAULT 160,
  content TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT 'yellow',
  is_collapsed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIO VOICE MEMOS
CREATE TABLE IF NOT EXISTS public.annotations_audio_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_index INT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  title TEXT NOT NULL,
  duration_seconds INT NOT NULL,
  storage_path TEXT, -- Supabase audio bucket
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BOOKMARKS
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_index INT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  color TEXT DEFAULT '#0284c7',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. FLASHCARDS & SPACED REPETITION (SM-2)
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_index INT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  ease_factor NUMERIC NOT NULL DEFAULT 2.5,
  interval_days INT NOT NULL DEFAULT 1,
  repetitions INT NOT NULL DEFAULT 0,
  due_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations_ink_strokes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations_shapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations_text_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations_sticky_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations_audio_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own profile"
  ON public.user_profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access their own documents"
  ON public.documents FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage ink strokes in their documents"
  ON public.annotations_ink_strokes FOR ALL USING (auth.uid() = user_id);

-- 13. PERFORMANCE INDEXES
CREATE INDEX idx_strokes_doc_page ON public.annotations_ink_strokes(document_id, page_index);
CREATE INDEX idx_flashcards_due ON public.flashcards(user_id, due_date);
CREATE INDEX idx_pages_doc_num ON public.document_pages(document_id, page_number);`;

  const envGuide = `# ====================================================================
# Scriptor Setup & Deployment Guide
# Supabase + Vercel / Netlify Configuration
# ====================================================================

# 1. ENVIRONMENT VARIABLES (.env.local)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
VITE_STORAGE_BUCKET_DOCS=pdf-documents
VITE_STORAGE_BUCKET_AUDIO=audio-memos

# Optional AI Features (for OCR and Auto-Flashcard generation)
GEMINI_API_KEY=your-gemini-key

# --------------------------------------------------------------------
# 2. SUPABASE STORAGE BUCKETS SETUP
# In Supabase Dashboard > Storage > Create 2 Buckets:
#
# Bucket A: "pdf-documents" (Private)
#   - Max upload file size: 50MB
#   - Allowed MIME types: application/pdf
#   - Policy: "Authenticated users can upload and read their own files"
#
# Bucket B: "audio-memos" (Private)
#   - Max upload file size: 10MB
#   - Allowed MIME types: audio/webm, audio/mp4, audio/ogg, audio/wav
#   - Policy: "Authenticated users can upload and stream audio"

# --------------------------------------------------------------------
# 3. DEPLOYMENT TO VERCEL
# Step 1: Push repository to GitHub
# Step 2: Import into Vercel (Framework Preset: Vite)
# Step 3: Add Environment Variables in Project Settings
# Step 4: Build command: npm run build
# Step 5: Output directory: dist`;

  const latencyGuide = `DIGITAL INK LATENCY OPTIMIZATION RECOMMENDATIONS:

1. Double-Buffered Canvas Layering:
   - Layer 1 (Committed Base Canvas): Renders once when a stroke completes or when zooming/scrolling.
   - Layer 2 (Active Transient Canvas): Renders ONLY the active in-flight stroke at 60-120fps.
   - Why: Never re-render thousands of existing points on every mouse/pen move.

2. Pointer Events & Coalesced Events:
   - Use 'pointerrawupdate' where supported (Chromium / Surface / ChromeOS) instead of waiting for standard VSync frame throttles.
   - Access 'e.getCoalescedEvents()' on pointermove to retrieve micro-samples captured by 240Hz/120Hz digitizers (Apple Pencil & Wacom) between screen frames.

3. Spline Generation via 'perfect-freehand':
   - Thinning & Streamline: Use streamline (0.4 - 0.6) for natural stabilization without lag.
   - SVG vs Path2D: Avoid DOM SVG node insertion for active drawing; render directly to 2D Canvas via new Path2D(svgPath).

4. Hardware-Accelerated CSS:
   - Apply 'touch-action: none' on canvas to block default browser pan/zoom gestures during pen contact.
   - Keep canvas element inside a transform: translateZ(0) GPU compositing layer.

5. Palm Rejection Heuristics:
   - Stylus-Only Mode: When pointerType === 'pen', reject any pointerType === 'touch' within 100ms.
   - Contact Area (e.width / e.height): Palm contact areas are typically > 25px radius; stylus nibs are < 5px.`;

  const largePdfGuide = `HANDLING LARGE MULTI-PAGE PDFS (> 50-200 PAGES):

1. Virtualized / Lazy Page Viewport:
   - Only mount and render the 3 pages in view: (Current - 1, Current, Current + 1).
   - Unmount off-screen canvas contexts to free GPU texture memory (PDF pages at 2x scale take ~12MB VRAM each).

2. Tiled / Multi-Resolution Canvas:
   - For high zoom levels (200% - 400%), render viewport tiles on demand rather than allocating a 4000x6000px canvas.

3. Decoupled Annotation Vector Serialization:
   - Store annotations as lightweight JSON vector coordinate arrays (not bitmap images).
   - A 50-stroke page is only ~8KB of JSONB, enabling instantaneous cloud syncing and infinite zoom.

4. Web Worker Thread Offloading:
   - PDF.js uses a dedicated Web Worker ('pdf.worker.min.mjs') so document decompression, JBIG2 decoding, and font parsing never block the 60fps main UI thread.

5. Export Flattening:
   - When exporting to PDF, combine the base page PDF stream with vector annotations using pdf-lib or an offscreen canvas export worker.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-200 dark:bg-stone-700 rounded-lg text-stone-800 dark:text-stone-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Architecture, SQL Schema & Deployment
              </h2>
              <p className="text-xs text-stone-500">
                Production database blueprints, environment variables, and low-latency digital ink specs
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center px-6 pt-3 border-b border-stone-200 dark:border-stone-800 gap-1 bg-stone-50/50 dark:bg-stone-800/30 text-xs">
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sql'
                ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            PostgreSQL Schema (Supabase)
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'env'
                ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            Environment & Deployment
          </button>
          <button
            onClick={() => setActiveTab('latency')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'latency'
                ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            Ink Latency Engineering
          </button>
          <button
            onClick={() => setActiveTab('large_pdf')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'large_pdf'
                ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            Large PDF Optimization
          </button>
        </div>

        {/* Content Box */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-stone-800 dark:text-stone-200 relative">
          <div className="absolute top-8 right-8 z-10">
            <button
              onClick={() => {
                const text =
                  activeTab === 'sql'
                    ? sqlSchema
                    : activeTab === 'env'
                    ? envGuide
                    : activeTab === 'latency'
                    ? latencyGuide
                    : largePdfGuide;
                copyToClipboard(text, activeTab);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-sans transition-colors cursor-pointer shadow"
            >
              {copied === activeTab ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied === activeTab ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 bg-stone-100 dark:bg-stone-950 rounded-xl overflow-x-auto whitespace-pre leading-relaxed border border-stone-200 dark:border-stone-800">
            {activeTab === 'sql' && sqlSchema}
            {activeTab === 'env' && envGuide}
            {activeTab === 'latency' && latencyGuide}
            {activeTab === 'large_pdf' && largePdfGuide}
          </pre>
        </div>
      </div>
    </div>
  );
};
