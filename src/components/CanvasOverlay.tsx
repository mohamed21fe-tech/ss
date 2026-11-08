import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  InkPoint,
  InkStroke,
  PenStyle,
  ShapeAnnotation,
  ShapeType,
  ToolType,
} from '../types';
import {
  renderStrokeToCanvas,
  renderShapeToCanvas,
  isStrokeHitByEraser,
  isShapeHitByEraser,
  isStrokeInLasso,
  snapToCardinalAngles,
} from '../lib/inkEngine';

interface CanvasOverlayProps {
  width: number;
  height: number;
  scale: number;
  pageIndex: number;
  tool: ToolType;
  penStyle: PenStyle;
  color: string;
  strokeWidth: number;
  opacity: number;
  eraserType: 'stroke' | 'pixel';
  eraserRadius: number;
  shapeType: ShapeType;
  palmRejection: boolean;
  strokes: InkStroke[];
  shapes: ShapeAnnotation[];
  onAddStroke: (stroke: InkStroke) => void;
  onRemoveStrokes: (strokeIds: string[]) => void;
  onAddShape: (shape: ShapeAnnotation) => void;
  onRemoveShapes: (shapeIds: string[]) => void;
  onMoveStrokes?: (strokeIds: string[], dx: number, dy: number) => void;
  onSelectLassoStrokes?: (strokeIds: string[], bounds: { minX: number; minY: number; maxX: number; maxY: number }) => void;
  onCanvasClickToAddNote?: (x: number, y: number, tool: 'text' | 'sticky' | 'audio') => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  width,
  height,
  scale,
  pageIndex,
  tool,
  penStyle,
  color,
  strokeWidth,
  opacity,
  eraserType,
  eraserRadius,
  shapeType,
  palmRejection,
  strokes,
  shapes,
  onAddStroke,
  onRemoveStrokes,
  onAddShape,
  onRemoveShapes,
  onMoveStrokes,
  onSelectLassoStrokes,
  onCanvasClickToAddNote,
  onUndo,
}) => {
  // Layer 1: Base canvas for committed strokes
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Layer 2: Transient canvas for active in-progress drawing (rAF driven)
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active stroke / shape / lasso state
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<InkPoint[]>([]);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const selectedLassoIdsRef = useRef<string[]>([]);
  const lassoDragStartRef = useRef<{ x: number; y: number } | null>(null);

  // requestAnimationFrame loop state
  const rafIdRef = useRef<number | null>(null);
  const needsRenderRef = useRef<boolean>(false);

  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [lassoBox, setLassoBox] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

  // Multi-touch tracking for 2-finger tap undo
  const touchPointsCountRef = useRef(0);
  const lastTouchTimeRef = useRef(0);

  // Setup active canvas backing buffer resolution once on width/height/scale change
  useEffect(() => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * scale * dpr;
    canvas.height = height * scale * dpr;
    ctx.scale(dpr, dpr);
  }, [width, height, scale]);

  // Redraw base canvas whenever committed strokes or shapes change
  const redrawBaseCanvas = useCallback(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support high DPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * scale * dpr;
    canvas.height = height * scale * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width * scale, height * scale);

    // 1. Render all committed shapes
    shapes.forEach((shape) => {
      renderShapeToCanvas(ctx, shape, scale);
    });

    // 2. Render all committed ink strokes
    strokes.forEach((stroke) => {
      // If stroke is selected in lasso, render with subtle selection highlight
      const isSelected = selectedStrokeIds.includes(stroke.id);
      if (isSelected) {
        ctx.save();
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 8;
        renderStrokeToCanvas(ctx, stroke, scale);
        ctx.restore();
      } else {
        renderStrokeToCanvas(ctx, stroke, scale);
      }
    });
  }, [width, height, scale, strokes, shapes, selectedStrokeIds]);

  useEffect(() => {
    redrawBaseCanvas();
  }, [redrawBaseCanvas]);

  // Transform client pointer coords to canvas internal coords (unscaled)
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;
    return { x, y };
  };

  // Dedicated requestAnimationFrame render loop for active ink stroke
  const renderActiveFrame = useCallback(() => {
    rafIdRef.current = null;

    if (!needsRenderRef.current) return;
    needsRenderRef.current = false;

    const activeCanvas = activeCanvasRef.current;
    if (!activeCanvas) return;
    const ctx = activeCanvas.getContext('2d');
    if (!ctx) return;

    // Clear previous transient frame without resizing the backing buffer
    ctx.clearRect(0, 0, width * scale, height * scale);

    const pts = currentPointsRef.current;
    const currentLast = lastPointRef.current;

    if ((tool === 'pen' || tool === 'highlighter') && pts.length > 0) {
      const transientStroke: InkStroke = {
        id: 'transient',
        tool,
        style: penStyle,
        color,
        width: strokeWidth,
        opacity: tool === 'highlighter' ? 0.35 : opacity,
        points: pts,
        pageIndex,
        createdAt: Date.now(),
      };
      renderStrokeToCanvas(ctx, transientStroke, scale);
    } else if (tool === 'shape' && startPointRef.current && currentLast) {
      let endX = currentLast.x;
      let endY = currentLast.y;
      // Snapping helper for lines and arrows
      if (shapeType === 'line' || shapeType === 'arrow') {
        const snapped = snapToCardinalAngles(startPointRef.current.x, startPointRef.current.y, endX, endY);
        endX = snapped.endX;
        endY = snapped.endY;
      }
      const transientShape: ShapeAnnotation = {
        id: 'transient-shape',
        shapeType,
        startX: startPointRef.current.x,
        startY: startPointRef.current.y,
        endX,
        endY,
        color,
        width: strokeWidth,
        pageIndex,
        createdAt: Date.now(),
      };
      renderShapeToCanvas(ctx, transientShape, scale);
    } else if (tool === 'lasso' && pts.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x * scale, pts[0].y * scale);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * scale, pts[i].y * scale);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [width, height, scale, tool, penStyle, color, strokeWidth, opacity, shapeType, pageIndex]);

  // Request next animation frame whenever new points arrive
  const scheduleRender = useCallback(() => {
    needsRenderRef.current = true;
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(renderActiveFrame);
    }
  }, [renderActiveFrame]);

  // Cancel any running rAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // Eraser handler
  const handleEraser = (x: number, y: number) => {
    if (eraserType === 'stroke') {
      const hitStrokeIds = strokes
        .filter((s) => isStrokeHitByEraser(s, x, y, eraserRadius))
        .map((s) => s.id);

      const hitShapeIds = shapes
        .filter((sh) => isShapeHitByEraser(sh, x, y, eraserRadius))
        .map((sh) => sh.id);

      if (hitStrokeIds.length > 0) {
        onRemoveStrokes(hitStrokeIds);
      }
      if (hitShapeIds.length > 0) {
        onRemoveShapes(hitShapeIds);
      }
    } else {
      // Pixel eraser
      const canvas = baseCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x * scale, y * scale, eraserRadius * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Palm Rejection Check
    if (palmRejection && e.pointerType === 'touch') {
      touchPointsCountRef.current += 1;
      // 2-finger tap gesture for Undo
      if (touchPointsCountRef.current === 2) {
        if (Date.now() - lastTouchTimeRef.current < 400 && onUndo) {
          onUndo();
        }
        lastTouchTimeRef.current = Date.now();
      }
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;

    // Annotation tools
    if (tool === 'text' || tool === 'sticky' || tool === 'audio') {
      if (onCanvasClickToAddNote) {
        onCanvasClickToAddNote(x, y, tool);
      }
      return;
    }

    if (tool === 'lasso' && selectedStrokeIds.length > 0 && lassoBox) {
      if (x >= lassoBox.minX && x <= lassoBox.maxX && y >= lassoBox.minY && y <= lassoBox.maxY) {
        lassoDragStartRef.current = { x, y };
        isDrawingRef.current = true;
        return;
      } else {
        setSelectedStrokeIds([]);
        setLassoBox(null);
      }
    }

    isDrawingRef.current = true;
    startPointRef.current = { x, y };
    lastPointRef.current = { x, y };
    currentPointsRef.current = [{ x, y, pressure, time: Date.now() }];

    if (tool === 'eraser') {
      handleEraser(x, y);
    } else {
      scheduleRender();
    }
  };

  // Process pointer movement with high-frequency coalesced stylus events
  const processPointerMove = useCallback((e: PointerEvent | React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    if (palmRejection && e.pointerType === 'touch') return;

    // Harvest sub-frame stylus events via getCoalescedEvents for 120Hz/240Hz digitizers
    const coalesced: PointerEvent[] =
      typeof (e as any).getCoalescedEvents === 'function'
        ? (e as any).getCoalescedEvents()
        : [e];

    for (const subEvent of coalesced) {
      const { x, y } = getCanvasCoords(subEvent.clientX, subEvent.clientY);
      const pressure = subEvent.pointerType === 'pen' && subEvent.pressure > 0 ? subEvent.pressure : 0.5;

      if (tool === 'eraser') {
        handleEraser(x, y);
        continue;
      }

      if (tool === 'lasso' && lassoDragStartRef.current && onMoveStrokes && selectedStrokeIds.length > 0) {
        const dx = x - lassoDragStartRef.current.x;
        const dy = y - lassoDragStartRef.current.y;
        lassoDragStartRef.current = { x, y };
        onMoveStrokes(selectedStrokeIds, dx, dy);
        if (lassoBox) {
          setLassoBox({
            minX: lassoBox.minX + dx,
            maxX: lassoBox.maxX + dx,
            minY: lassoBox.minY + dy,
            maxY: lassoBox.maxY + dy,
          });
        }
        continue;
      }

      currentPointsRef.current.push({ x, y, pressure, time: Date.now() });
      lastPointRef.current = { x, y };
    }

    if (tool !== 'eraser') {
      scheduleRender();
    }
  }, [palmRejection, tool, lassoBox, selectedStrokeIds, onMoveStrokes, scheduleRender]);

  // Support pointerrawupdate on the element for ultra-low latency hardware updates
  useEffect(() => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;

    const onPointerRawUpdate = (e: PointerEvent) => {
      if (isDrawingRef.current) {
        processPointerMove(e);
      }
    };

    // Use pointerrawupdate if supported by browser/device
    canvas.addEventListener('pointerrawupdate' as any, onPointerRawUpdate as any);
    return () => {
      canvas.removeEventListener('pointerrawupdate' as any, onPointerRawUpdate as any);
    };
  }, [processPointerMove]);

  // Pointer Up / Cancel
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (palmRejection && e.pointerType === 'touch') {
      touchPointsCountRef.current = Math.max(0, touchPointsCountRef.current - 1);
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    // Cancel pending rAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    needsRenderRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    // Clear active canvas layer
    const activeCanvas = activeCanvasRef.current;
    if (activeCanvas) {
      const ctx = activeCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, width * scale, height * scale);
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    if (lassoDragStartRef.current) {
      lassoDragStartRef.current = null;
      return;
    }

    if (tool === 'pen' || tool === 'highlighter') {
      // Keep single-point taps too, so Arabic dots (nuqat) are never lost
      if (currentPointsRef.current.length >= 1) {
        const newStroke: InkStroke = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          tool,
          style: penStyle,
          color,
          width: strokeWidth,
          opacity: tool === 'highlighter' ? 0.35 : opacity,
          points: [...currentPointsRef.current],
          pageIndex,
          createdAt: Date.now(),
        };
        onAddStroke(newStroke);
      }
    } else if (tool === 'shape' && startPointRef.current) {
      let endX = x;
      let endY = y;
      if (shapeType === 'line' || shapeType === 'arrow') {
        const snapped = snapToCardinalAngles(startPointRef.current.x, startPointRef.current.y, x, y);
        endX = snapped.endX;
        endY = snapped.endY;
      }
      const dist = Math.hypot(endX - startPointRef.current.x, endY - startPointRef.current.y);
      if (dist > 5) {
        const newShape: ShapeAnnotation = {
          id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          shapeType,
          startX: startPointRef.current.x,
          startY: startPointRef.current.y,
          endX,
          endY,
          color,
          width: strokeWidth,
          pageIndex,
          createdAt: Date.now(),
        };
        onAddShape(newShape);
      }
    } else if (tool === 'lasso') {
      const lassoPts = currentPointsRef.current;
      if (lassoPts.length >= 4) {
        const selected = strokes.filter((s) => isStrokeInLasso(s, lassoPts)).map((s) => s.id);
        setSelectedStrokeIds(selected);
        selectedLassoIdsRef.current = selected;

        if (selected.length > 0) {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;

          strokes
            .filter((s) => selected.includes(s.id))
            .forEach((s) => {
              s.points.forEach((p) => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
              });
            });

          const box = {
            minX: Math.max(0, minX - 10),
            minY: Math.max(0, minY - 10),
            maxX: maxX + 10,
            maxY: maxY + 10,
          };
          setLassoBox(box);

          if (onSelectLassoStrokes) {
            onSelectLassoStrokes(selected, box);
          }
        } else {
          setLassoBox(null);
        }
      }
    }

    currentPointsRef.current = [];
    startPointRef.current = null;
    lastPointRef.current = null;
  };

  return (
    <div
      className="absolute inset-0 pointer-events-auto select-none"
      style={{ width: width * scale, height: height * scale }}
    >
      {/* Base Canvas (Committed strokes layer) */}
      <canvas
        ref={baseCanvasRef}
        style={{ width: width * scale, height: height * scale }}
        className="absolute inset-0"
      />

      {/* Transient Active Canvas (Decoupled requestAnimationFrame 60-120fps ink layer) */}
      <canvas
        ref={activeCanvasRef}
        style={{ width: width * scale, height: height * scale }}
        className="absolute inset-0 ink-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={processPointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {/* Lasso Selection Marquee UI Box */}
      {tool === 'lasso' && lassoBox && selectedStrokeIds.length > 0 && (
        <div
          className="absolute border-2 border-dashed border-sky-500 bg-sky-500/10 pointer-events-none rounded cursor-move transition-opacity"
          style={{
            left: lassoBox.minX * scale,
            top: lassoBox.minY * scale,
            width: (lassoBox.maxX - lassoBox.minX) * scale,
            height: (lassoBox.maxY - lassoBox.minY) * scale,
          }}
        >
          <div className="absolute -top-7 left-0 bg-sky-600 text-white text-[11px] font-medium px-2 py-0.5 rounded shadow pointer-events-auto flex items-center gap-1.5 whitespace-nowrap">
            <span>{selectedStrokeIds.length} ink strokes</span>
            <button
              onClick={() => {
                onRemoveStrokes(selectedStrokeIds);
                setSelectedStrokeIds([]);
                setLassoBox(null);
              }}
              className="hover:text-red-200 ml-1 underline cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
