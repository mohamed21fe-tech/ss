export type ToolType = 
  | 'pen' 
  | 'highlighter' 
  | 'eraser' 
  | 'shape' 
  | 'text' 
  | 'sticky' 
  | 'audio'
  | 'lasso' 
  | 'pan';

export type PenStyle = 'ballpoint' | 'fountain' | 'brush';

export type EraserType = 'stroke' | 'pixel';

export type ShapeType = 'line' | 'arrow' | 'rectangle' | 'circle';

export interface InkPoint {
  x: number;
  y: number;
  pressure: number; // 0.0 to 1.0 (defaults to 0.5 for non-stylus)
  time?: number;
}

export interface InkStroke {
  id: string;
  tool: 'pen' | 'highlighter';
  style: PenStyle;
  color: string;
  width: number;
  opacity: number;
  points: InkPoint[];
  pathData?: string; // Cached SVG path string
  pageIndex: number;
  createdAt: number;
}

export interface ShapeAnnotation {
  id: string;
  shapeType: ShapeType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  width: number;
  fillColor?: string;
  pageIndex: number;
  createdAt: number;
}

export interface TextNote {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  content: string;
  fontSize: number;
  color: string;
  isBold?: boolean;
  isItalic?: boolean;
  width?: number;
}

export interface StickyNote {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
  isCollapsed?: boolean;
}

export interface AudioNote {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  title: string;
  durationSeconds: number;
  audioBlobUrl?: string; // Object URL or Base64 data URL
  createdAt: number;
}

export interface Bookmark {
  id: string;
  pageIndex: number;
  title: string;
  color?: string;
  createdAt: number;
}

export interface Flashcard {
  id: string;
  pageIndex: number;
  question: string;
  answer: string;
  tags?: string[];
  easeFactor: number; // SRS Leitner ease factor (starts at 2.5)
  intervalDays: number;
  repetitions: number;
  dueDate: number; // timestamp
  sourceAnnotationId?: string;
}

export type PageTemplate = 'pdf' | 'blank' | 'lined' | 'grid' | 'cornell';

export interface DocumentPage {
  id: string;
  pageNumber: number;
  template: PageTemplate;
  title?: string;
  aspectRatio: number; // height / width, e.g. 1.414 for A4, 1.294 for Letter
  pdfPageNumber?: number; // mapped back to original PDF
  bgDataUrl?: string; // rendered PDF background
}

export interface DocumentItem {
  id: string;
  title: string;
  folderId: string;
  courseName: string;
  totalPages: number;
  fileSize: string;
  pdfData?: string | ArrayBuffer; // base64 or buffer if uploaded
  isSample?: boolean;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface FolderItem {
  id: string;
  name: string;
  course: string;
  term?: string;
  color: string;
}

export interface DocumentAnnotations {
  strokes: InkStroke[];
  shapes: ShapeAnnotation[];
  textNotes: TextNote[];
  stickyNotes: StickyNote[];
  audioNotes: AudioNote[];
  bookmarks: Bookmark[];
  flashcards: Flashcard[];
}
