import React, { useState, useRef } from 'react';
import { AudioNote, Bookmark, StickyNote, TextNote } from '../types';
import {
  Volume2,
  Trash2,
  Minimize2,
  Maximize2,
  Play,
  Pause,
  Bold,
  Italic,
  Bookmark as BookmarkIcon,
  Mic,
  Square,
} from 'lucide-react';

interface TextNoteItemProps {
  note: TextNote;
  scale: number;
  onUpdate: (updated: TextNote) => void;
  onDelete: (id: string) => void;
}

export const TextNoteItem: React.FC<TextNoteItemProps> = ({ note, scale, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: note.x,
      initY: note.y,
    };
    const onPointerMove = (moveEv: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = (moveEv.clientX - dragRef.current.startX) / scale;
      const dy = (moveEv.clientY - dragRef.current.startY) / scale;
      onUpdate({
        ...note,
        x: Math.max(0, dragRef.current.initX + dx),
        y: Math.max(0, dragRef.current.initY + dy),
      });
    };
    const onPointerUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className="absolute cursor-move select-none group"
      style={{
        left: note.x * scale,
        top: note.y * scale,
        maxWidth: (note.width || 260) * scale,
      }}
    >
      <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm border border-stone-300 dark:border-stone-700 rounded-md p-2 shadow-md hover:shadow-lg transition-all">
        {/* Note Action Bar */}
        <div className="flex items-center justify-between pb-1 mb-1 border-b border-stone-200 dark:border-stone-800 text-stone-500 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onUpdate({ ...note, isBold: !note.isBold })}
              className={`p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 ${note.isBold ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 font-bold' : ''}`}
              title="Toggle Bold"
            >
              <Bold className="w-3 h-3" />
            </button>
            <button
              onClick={() => onUpdate({ ...note, isItalic: !note.isItalic })}
              className={`p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 ${note.isItalic ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 italic' : ''}`}
              title="Toggle Italic"
            >
              <Italic className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1 text-stone-400 hover:text-red-500 rounded transition-colors"
            title="Delete Note"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {isEditing ? (
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => {
              setIsEditing(false);
              onUpdate({ ...note, content });
            }}
            className="w-full bg-transparent resize-none outline-none text-stone-900 dark:text-stone-100 leading-snug"
            style={{
              fontSize: `${note.fontSize * scale}px`,
              fontWeight: note.isBold ? 700 : 400,
              fontStyle: note.isItalic ? 'italic' : 'normal',
            }}
            rows={3}
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="cursor-text text-stone-800 dark:text-stone-200 leading-snug whitespace-pre-wrap min-h-[1.5em]"
            style={{
              fontSize: `${note.fontSize * scale}px`,
              fontWeight: note.isBold ? 700 : 400,
              fontStyle: note.isItalic ? 'italic' : 'normal',
              color: note.color,
            }}
          >
            {note.content || 'Click to write note...'}
          </div>
        )}
      </div>
    </div>
  );
};

interface StickyNoteItemProps {
  note: StickyNote;
  scale: number;
  onUpdate: (updated: StickyNote) => void;
  onDelete: (id: string) => void;
}

const STICKY_COLORS = {
  yellow: 'bg-amber-100 border-amber-300 text-amber-950 shadow-amber-200/50',
  green: 'bg-emerald-100 border-emerald-300 text-emerald-950 shadow-emerald-200/50',
  blue: 'bg-sky-100 border-sky-300 text-sky-950 shadow-sky-200/50',
  pink: 'bg-rose-100 border-rose-300 text-rose-950 shadow-rose-200/50',
  purple: 'bg-purple-100 border-purple-300 text-purple-950 shadow-purple-200/50',
};

export const StickyNoteItem: React.FC<StickyNoteItemProps> = ({ note, scale, onUpdate, onDelete }) => {
  const [content, setContent] = useState(note.content);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: note.x,
      initY: note.y,
    };
    const onPointerMove = (moveEv: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = (moveEv.clientX - dragRef.current.startX) / scale;
      const dy = (moveEv.clientY - dragRef.current.startY) / scale;
      onUpdate({
        ...note,
        x: Math.max(0, dragRef.current.initX + dx),
        y: Math.max(0, dragRef.current.initY + dy),
      });
    };
    const onPointerUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const colorClass = STICKY_COLORS[note.color] || STICKY_COLORS.yellow;

  return (
    <div
      onPointerDown={handlePointerDown}
      className={`absolute cursor-move border rounded-md shadow-lg transition-transform ${colorClass}`}
      style={{
        left: note.x * scale,
        top: note.y * scale,
        width: (note.isCollapsed ? 140 : note.width) * scale,
        minHeight: (note.isCollapsed ? 36 : note.height) * scale,
      }}
    >
      {/* Top Header of Sticky */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-black/10 select-none">
        <div className="flex items-center gap-1">
          {(['yellow', 'green', 'blue', 'pink', 'purple'] as const).map((c) => (
            <button
              key={c}
              onClick={() => onUpdate({ ...note, color: c })}
              className={`w-2.5 h-2.5 rounded-full border border-black/20 ${c === 'yellow' ? 'bg-amber-300' : c === 'green' ? 'bg-emerald-300' : c === 'blue' ? 'bg-sky-300' : c === 'pink' ? 'bg-rose-300' : 'bg-purple-300'} ${note.color === c ? 'ring-1 ring-black' : ''}`}
              title={c}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ ...note, isCollapsed: !note.isCollapsed })}
            className="p-0.5 rounded hover:bg-black/10 text-stone-700"
            title={note.isCollapsed ? 'Expand' : 'Collapse'}
          >
            {note.isCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-0.5 rounded hover:bg-red-500/20 text-stone-700 hover:text-red-700"
            title="Delete Sticky Note"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {!note.isCollapsed && (
        <div className="p-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => onUpdate({ ...note, content })}
            placeholder="Write sticky note..."
            className="w-full bg-transparent resize-none outline-none leading-relaxed text-xs placeholder:text-stone-500/60 font-medium"
            rows={4}
          />
        </div>
      )}
    </div>
  );
};

interface AudioNoteItemProps {
  note: AudioNote;
  scale: number;
  onUpdate: (updated: AudioNote) => void;
  onDelete: (id: string) => void;
}

export const AudioNoteItem: React.FC<AudioNoteItemProps> = ({ note, scale, onUpdate, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: note.x,
      initY: note.y,
    };
    const onPointerMove = (moveEv: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = (moveEv.clientX - dragRef.current.startX) / scale;
      const dy = (moveEv.clientY - dragRef.current.startY) / scale;
      onUpdate({
        ...note,
        x: Math.max(0, dragRef.current.initX + dx),
        y: Math.max(0, dragRef.current.initY + dy),
      });
    };
    const onPointerUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const togglePlay = () => {
    if (note.audioBlobUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(note.audioBlobUrl);
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setProgress(0);
        };
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current && audioRef.current.duration) {
            setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
          }
        };
      }
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      // Simulate playback progress for sample voice notes
      setIsPlaying(!isPlaying);
      if (!isPlaying) {
        let p = 0;
        const interval = setInterval(() => {
          p += 5;
          setProgress(p);
          if (p >= 100) {
            clearInterval(interval);
            setIsPlaying(false);
            setProgress(0);
          }
        }, (note.durationSeconds * 1000) / 20);
      }
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className="absolute cursor-move select-none"
      style={{
        left: note.x * scale,
        top: note.y * scale,
      }}
    >
      <div className="flex items-center gap-2 bg-stone-900/90 text-white rounded-full px-3 py-1.5 shadow-lg border border-stone-700 backdrop-blur-sm">
        <button
          onClick={togglePlay}
          className="w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center transition-colors shrink-0"
        >
          {isPlaying ? <Pause className="w-3 h-3 fill-stone-950" /> : <Play className="w-3 h-3 fill-stone-950 ml-0.5" />}
        </button>

        <div className="flex flex-col min-w-[120px]">
          <span className="text-xs font-medium truncate max-w-[140px]">{note.title}</span>
          <div className="flex items-center gap-2 text-[10px] text-stone-400">
            <span>{note.durationSeconds}s</span>
            <div className="w-16 h-1 bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 transition-all duration-150" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <button
          onClick={() => onDelete(note.id)}
          className="p-1 text-stone-400 hover:text-red-400 rounded transition-colors"
          title="Delete Voice Memo"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export const BookmarkBadge: React.FC<{ bookmark: Bookmark; onClick: () => void }> = ({ bookmark, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="absolute top-0 right-8 z-10 flex items-center gap-1 bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded-b-md shadow-md text-xs font-semibold tracking-wide transition-all"
    >
      <BookmarkIcon className="w-3.5 h-3.5 fill-white" />
      <span>{bookmark.title}</span>
    </button>
  );
};
