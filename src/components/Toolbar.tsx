import React, { useState, useRef, useEffect } from 'react';
import {
  EraserType,
  PenStyle,
  ShapeType,
  ToolType,
} from '../types';
import {
  Pen,
  Highlighter,
  Eraser,
  Type,
  StickyNote as StickyIcon,
  LassoSelect,
  Shapes,
  Undo2,
  Redo2,
  Hand,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Mic,
  Columns,
  Sparkles,
  ChevronDown,
  GripVertical,
  EyeOff,
  Eye,
  RotateCcw,
} from 'lucide-react';

interface ToolbarProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  penStyle: PenStyle;
  setPenStyle: (style: PenStyle) => void;
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  eraserType: EraserType;
  setEraserType: (type: EraserType) => void;
  shapeType: ShapeType;
  setShapeType: (shape: ShapeType) => void;
  palmRejection: boolean;
  setPalmRejection: (val: boolean) => void;
  scale: number;
  setScale: (scale: number | ((prev: number) => number)) => void;
  splitView: boolean;
  setSplitView: (val: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenFlashcards: () => void;
  onRecordAudioClick: () => void;
}

const PEN_COLORS = [
  '#0f172a', // Charcoal black
  '#1d4ed8', // Royal ink blue
  '#dc2626', // Crimson red
  '#15803d', // Forest emerald
  '#7e22ce', // Purple
  '#ea580c', // Orange
];

const HIGHLIGHTER_COLORS = [
  '#facc15', // Yellow
  '#86efac', // Light green
  '#7dd3fc', // Sky cyan
  '#fca5a5', // Peach/coral
  '#d8b4fe', // Lavender
];

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  penStyle,
  setPenStyle,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  eraserType,
  setEraserType,
  shapeType,
  setShapeType,
  palmRejection,
  setPalmRejection,
  scale,
  setScale,
  splitView,
  setSplitView,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenFlashcards,
  onRecordAudioClick,
}) => {
  const [penDropdownOpen, setPenDropdownOpen] = useState(false);
  const [shapesDropdownOpen, setShapesDropdownOpen] = useState(false);
  const [eraserDropdownOpen, setEraserDropdownOpen] = useState(false);

  // Movable / Draggable Position State
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  // Hide / Show (Minimize) State
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Dragging logic
  const handleDragPointerDown = (e: React.PointerEvent) => {
    // Prevent dragging if clicked inside a button/input
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('select')) {
      return;
    }

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    setIsDragging(true);
    const initialPos = position || {
      x: Math.max(16, (window.innerWidth - 650) / 2),
      y: 16,
    };

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: initialPos.x,
      initY: initialPos.y,
    };

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = moveEv.clientX - dragStartRef.current.startX;
      const dy = moveEv.clientY - dragStartRef.current.startY;

      const newX = Math.min(window.innerWidth - 120, Math.max(10, dragStartRef.current.initX + dx));
      const newY = Math.min(window.innerHeight - 60, Math.max(8, dragStartRef.current.initY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // If user minimized/collapsed the toolbar, render compact floating pill
  if (isCollapsed) {
    return (
      <div
        style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
        className={`fixed z-40 select-none ${!position ? 'top-4 left-1/2 -translate-x-1/2' : ''}`}
      >
        <div
          onPointerDown={handleDragPointerDown}
          className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 shadow-xl rounded-full px-3 py-1.5 flex items-center gap-2 cursor-move hover:shadow-2xl transition-all"
        >
          <div className="text-stone-400 p-0.5" title="Drag to move">
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          <button
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200 cursor-pointer"
            title="Expand Smart Ink Toolbar"
          >
            <div
              className="w-3.5 h-3.5 rounded-full border border-black/20"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize">{tool}</span>
            <span className="text-[10px] text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
              <Eye className="w-3 h-3 text-amber-500" />
              <span>Show Tools</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
      className={`fixed z-40 max-w-[96vw] select-none ${
        !position ? 'top-4 left-1/2 -translate-x-1/2' : ''
      }`}
    >
      <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200/90 dark:border-stone-800 shadow-xl rounded-2xl px-2.5 py-2 flex items-center gap-1 md:gap-1.5 text-stone-700 dark:text-stone-300 transition-all">
        {/* Drag Handle */}
        <div
          onPointerDown={handleDragPointerDown}
          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-grab active:cursor-grabbing rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
          title="Drag to reposition toolbar anywhere"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 pr-1 border-r border-stone-200 dark:border-stone-800">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors cursor-pointer"
            title="Undo (Ctrl+Z or 2-finger tap)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Smart Pen Tool + Style Selector */}
        <div className="relative">
          <button
            onClick={() => {
              if (tool === 'pen') {
                setPenDropdownOpen(!penDropdownOpen);
              } else {
                setTool('pen');
                setPenDropdownOpen(false);
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
              tool === 'pen'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                : 'hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Smart Pen (Pressure Sensitive)"
          >
            <Pen className="w-4 h-4" />
            <span className="capitalize hidden md:inline text-[11px]">{penStyle}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {penDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-2 shadow-xl z-50 w-44 space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-2 py-1">
                Nib Style
              </div>
              {(['fountain', 'ballpoint', 'brush'] as PenStyle[]).map((style) => (
                <button
                  key={style}
                  onClick={() => {
                    setPenStyle(style);
                    setTool('pen');
                    setPenDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize flex items-center justify-between cursor-pointer ${
                    penStyle === style
                      ? 'bg-stone-100 dark:bg-stone-800 font-semibold text-stone-900 dark:text-stone-100'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                  }`}
                >
                  <span>{style} pen</span>
                  <span className="text-[10px] text-stone-400">
                    {style === 'fountain' ? 'Flexible' : style === 'brush' ? 'Dynamic' : 'Precise'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Highlighter Tool */}
        <button
          onClick={() => {
            setTool('highlighter');
            setPenDropdownOpen(false);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
            tool === 'highlighter'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
          title="Highlighter"
        >
          <Highlighter className="w-4 h-4" />
          <span className="hidden md:inline text-[11px]">Highlighter</span>
        </button>

        {/* Eraser Tool + Style Selector */}
        <div className="relative">
          <button
            onClick={() => {
              if (tool === 'eraser') {
                setEraserDropdownOpen(!eraserDropdownOpen);
              } else {
                setTool('eraser');
                setEraserDropdownOpen(false);
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
              tool === 'eraser'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                : 'hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Eraser (Stroke / Pixel)"
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden md:inline capitalize text-[11px]">{eraserType}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {eraserDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-2 shadow-xl z-50 w-36 space-y-1">
              <button
                onClick={() => {
                  setEraserType('stroke');
                  setTool('eraser');
                  setEraserDropdownOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize cursor-pointer ${
                  eraserType === 'stroke' ? 'bg-stone-100 dark:bg-stone-800 font-semibold' : 'hover:bg-stone-50'
                }`}
              >
                Stroke Eraser
              </button>
              <button
                onClick={() => {
                  setEraserType('pixel');
                  setTool('eraser');
                  setEraserDropdownOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize cursor-pointer ${
                  eraserType === 'pixel' ? 'bg-stone-100 dark:bg-stone-800 font-semibold' : 'hover:bg-stone-50'
                }`}
              >
                Pixel Eraser
              </button>
            </div>
          )}
        </div>

        {/* Shapes Tool */}
        <div className="relative">
          <button
            onClick={() => {
              if (tool === 'shape') {
                setShapesDropdownOpen(!shapesDropdownOpen);
              } else {
                setTool('shape');
                setShapesDropdownOpen(false);
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
              tool === 'shape'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                : 'hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Shapes & Snapping Lines"
          >
            <Shapes className="w-4 h-4" />
            <span className="hidden lg:inline capitalize text-[11px]">{shapeType}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {shapesDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-2 shadow-xl z-50 w-36 space-y-1">
              {(['line', 'arrow', 'rectangle', 'circle'] as ShapeType[]).map((sh) => (
                <button
                  key={sh}
                  onClick={() => {
                    setShapeType(sh);
                    setTool('shape');
                    setShapesDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize cursor-pointer ${
                    shapeType === sh ? 'bg-stone-100 dark:bg-stone-800 font-semibold' : 'hover:bg-stone-50'
                  }`}
                >
                  {sh}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lasso Tool */}
        <button
          onClick={() => setTool('lasso')}
          className={`p-1.5 rounded-xl transition-all cursor-pointer ${
            tool === 'lasso'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
          title="Lasso Selection (Select, Move, Delete Ink)"
        >
          <LassoSelect className="w-4 h-4" />
        </button>

        {/* Text Note Tool */}
        <button
          onClick={() => setTool('text')}
          className={`p-1.5 rounded-xl transition-all cursor-pointer ${
            tool === 'text'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
          title="Typed Text Note (Click anywhere on page)"
        >
          <Type className="w-4 h-4" />
        </button>

        {/* Sticky Note Tool */}
        <button
          onClick={() => setTool('sticky')}
          className={`p-1.5 rounded-xl transition-all cursor-pointer ${
            tool === 'sticky'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
          title="Sticky Note (Click on page to place)"
        >
          <StickyIcon className="w-4 h-4" />
        </button>

        {/* Audio Memo Tool */}
        <button
          onClick={onRecordAudioClick}
          className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          title="Record Voice Memo"
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-stone-200 dark:border-stone-800 mx-0.5" />

        {/* Color Palette (Dynamic for Pen vs Highlighter) */}
        <div className="flex items-center gap-1">
          {(tool === 'highlighter' ? HIGHLIGHTER_COLORS : PEN_COLORS).map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-4 h-4 rounded-full border border-black/20 transition-transform cursor-pointer ${
                color === c ? 'scale-125 ring-2 ring-stone-900 dark:ring-stone-100 ring-offset-1' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          {/* Custom color picker */}
          <label className="relative cursor-pointer">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="sr-only"
            />
            <div
              className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-700 bg-gradient-to-tr from-pink-500 via-amber-400 to-sky-400 hover:scale-110 transition-transform"
              title="Custom Color"
            />
          </label>
        </div>

        {/* Stroke Width Slider */}
        <div className="hidden sm:flex items-center gap-1.5 pl-1.5">
          <input
            type="range"
            min={tool === 'highlighter' ? 12 : 1}
            max={tool === 'highlighter' ? 36 : 14}
            step={1}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-14 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-stone-900 dark:accent-stone-100"
            title={`Stroke Width: ${strokeWidth}px`}
          />
          <div
            className="rounded-full bg-stone-800 dark:bg-stone-200 shrink-0"
            style={{
              width: Math.min(14, Math.max(3, strokeWidth)),
              height: Math.min(14, Math.max(3, strokeWidth)),
            }}
          />
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-stone-200 dark:border-stone-800 mx-0.5" />

        {/* Palm Rejection Stylus Mode Toggle */}
        <button
          onClick={() => setPalmRejection(!palmRejection)}
          className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            palmRejection
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500'
          }`}
          title={
            palmRejection
              ? 'Palm Rejection Active: Only Stylus Pen will draw. Touch is ignored.'
              : 'Touch & Pen mode. Click to enable Stylus Palm Rejection.'
          }
        >
          <Hand className="w-3.5 h-3.5" />
          <span className="hidden xl:inline text-[10px]">
            {palmRejection ? 'Palm Rejection' : 'Touch/Pen'}
          </span>
        </button>

        {/* Split View Toggle */}
        <button
          onClick={() => setSplitView(!splitView)}
          className={`p-1.5 rounded-xl transition-all cursor-pointer ${
            splitView
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
          title="Split View (Dual Page Reference Mode)"
        >
          <Columns className="w-4 h-4" />
        </button>

        {/* Flashcards Study Button */}
        <button
          onClick={onOpenFlashcards}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
          title="Study Spaced Repetition Flashcards"
        >
          <Sparkles className="w-3.5 h-3.5 fill-stone-950" />
          <span className="hidden sm:inline text-[11px]">Study</span>
        </button>

        {/* Hide / Minimize Toolbar Button */}
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          title="Hide toolbar (click to minimize)"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
