import { getStroke } from 'perfect-freehand';
import { InkPoint, InkStroke, PenStyle, ShapeAnnotation, ShapeType } from '../types';

export interface StrokeOptions {
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  start: {
    taper: number;
    easing: (t: number) => number;
    cap: boolean;
  };
  end: {
    taper: number;
    easing: (t: number) => number;
    cap: boolean;
  };
}

// Configures pen style settings for perfect-freehand
export function getPenStyleOptions(style: PenStyle, baseWidth: number): StrokeOptions {
  switch (style) {
    case 'fountain':
      return {
        size: baseWidth,
        thinning: 0.7,
        smoothing: 0.6,
        streamline: 0.55,
        start: {
          taper: 4,
          easing: (t: number) => t * t,
          cap: true,
        },
        end: {
          taper: 6,
          easing: (t: number) => t * (2 - t),
          cap: true,
        },
      };
    case 'brush':
      return {
        size: baseWidth * 1.3,
        thinning: 0.85,
        smoothing: 0.8,
        streamline: 0.65,
        start: {
          taper: 12,
          easing: (t: number) => t,
          cap: true,
        },
        end: {
          taper: 18,
          easing: (t: number) => t * t,
          cap: true,
        },
      };
    case 'ballpoint':
    default:
      return {
        size: baseWidth,
        thinning: 0.25,
        smoothing: 0.5,
        streamline: 0.5,
        start: {
          taper: 0,
          easing: (t: number) => t,
          cap: true,
        },
        end: {
          taper: 0,
          easing: (t: number) => t,
          cap: true,
        },
      };
  }
}

// Generates an SVG path string from an array of outline points
export function getSvgPathFromStroke(strokePoints: number[][]): string {
  if (!strokePoints.length) return '';

  const d = strokePoints.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...strokePoints[0], 'Q']
  );

  d.push('Z');
  return d.join(' ');
}

// Renders an ink stroke onto an HTML5 Canvas 2D context
export function renderStrokeToCanvas(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  scale: number = 1
) {
  if (stroke.points.length === 0) return;

  // Tiny strokes (a tap or a very short flick, e.g. Arabic dots) render as a solid dot
  let pathLength = 0;
  for (let i = 1; i < stroke.points.length; i++) {
    pathLength += Math.hypot(
      stroke.points[i].x - stroke.points[i - 1].x,
      stroke.points[i].y - stroke.points[i - 1].y
    );
  }
  if (pathLength < 3) {
    const cx = stroke.points.reduce((a, p) => a + p.x, 0) / stroke.points.length;
    const cy = stroke.points.reduce((a, p) => a + p.y, 0) / stroke.points.length;
    const radius = Math.max(1.2, (stroke.width * (stroke.tool === 'pen' ? 0.6 : 0.5)) / 2 + pathLength / 2);
    ctx.save();
    ctx.globalAlpha = stroke.opacity || (stroke.tool === 'highlighter' ? 0.35 : 1);
    ctx.globalCompositeOperation = stroke.tool === 'highlighter' ? 'multiply' : 'source-over';
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(cx * scale, cy * scale, radius * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.save();

  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = stroke.opacity || 0.35;
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const first = stroke.points[0];
    ctx.moveTo(first.x * scale, first.y * scale);
    for (let i = 1; i < stroke.points.length; i++) {
      const pt = stroke.points[i];
      ctx.lineTo(pt.x * scale, pt.y * scale);
    }
    ctx.stroke();
  } else {
    // Pen stroke with pressure dynamics
    ctx.globalAlpha = stroke.opacity || 1.0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = stroke.color;

    const options = getPenStyleOptions(stroke.style, stroke.width * scale);
    // Convert points to [x, y, pressure]
    const rawPoints = stroke.points.map((p) => [
      p.x * scale,
      p.y * scale,
      p.pressure !== undefined ? p.pressure : 0.5,
    ]);

    const outline = getStroke(rawPoints, options);
    if (outline.length > 0) {
      const pathData = getSvgPathFromStroke(outline);
      const path = new Path2D(pathData);
      ctx.fill(path);
    }
  }

  ctx.restore();
}

// Renders geometric shapes onto canvas
export function renderShapeToCanvas(
  ctx: CanvasRenderingContext2D,
  shape: ShapeAnnotation,
  scale: number = 1
) {
  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.width * scale;
  ctx.fillStyle = shape.fillColor || 'transparent';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const x1 = shape.startX * scale;
  const y1 = shape.startY * scale;
  const x2 = shape.endX * scale;
  const y2 = shape.endY * scale;

  ctx.beginPath();

  switch (shape.shapeType) {
    case 'line':
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      break;

    case 'arrow': {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = Math.max(14 * scale, shape.width * 3 * scale);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
      break;
    }

    case 'rectangle': {
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);
      if (shape.fillColor && shape.fillColor !== 'transparent') {
        ctx.fillRect(minX, minY, w, h);
      }
      ctx.strokeRect(minX, minY, w, h);
      break;
    }

    case 'circle': {
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      const cx = Math.min(x1, x2) + rx;
      const cy = Math.min(y1, y2) + ry;
      ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
      if (shape.fillColor && shape.fillColor !== 'transparent') {
        ctx.fill();
      }
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

// Distance from point to line segment
function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Stroke eraser hit detection: checks if eraser position (x, y) intersects an ink stroke
export function isStrokeHitByEraser(
  stroke: InkStroke,
  eraserX: number,
  eraserY: number,
  eraserRadius: number
): boolean {
  const threshold = Math.max(eraserRadius, (stroke.width / 2) + 6);
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const p1 = stroke.points[i];
    const p2 = stroke.points[i + 1];
    const dist = distToSegment(eraserX, eraserY, p1.x, p1.y, p2.x, p2.y);
    if (dist <= threshold) {
      return true;
    }
  }
  return false;
}

// Shape hit detection
export function isShapeHitByEraser(
  shape: ShapeAnnotation,
  eraserX: number,
  eraserY: number,
  eraserRadius: number
): boolean {
  const threshold = eraserRadius + (shape.width / 2) + 6;
  switch (shape.shapeType) {
    case 'line':
    case 'arrow':
      return distToSegment(eraserX, eraserY, shape.startX, shape.startY, shape.endX, shape.endY) <= threshold;
    case 'rectangle': {
      const minX = Math.min(shape.startX, shape.endX);
      const maxX = Math.max(shape.startX, shape.endX);
      const minY = Math.min(shape.startY, shape.endY);
      const maxY = Math.max(shape.startY, shape.endY);
      // Check borders
      return (
        distToSegment(eraserX, eraserY, minX, minY, maxX, minY) <= threshold ||
        distToSegment(eraserX, eraserY, maxX, minY, maxX, maxY) <= threshold ||
        distToSegment(eraserX, eraserY, maxX, maxY, minX, maxY) <= threshold ||
        distToSegment(eraserX, eraserY, minX, maxY, minX, minY) <= threshold
      );
    }
    case 'circle': {
      const rx = Math.abs(shape.endX - shape.startX) / 2;
      const ry = Math.abs(shape.endY - shape.startY) / 2;
      const cx = Math.min(shape.startX, shape.endX) + rx;
      const cy = Math.min(shape.startY, shape.endY) + ry;
      const d = Math.hypot((eraserX - cx) / (rx || 1), (eraserY - cy) / (ry || 1));
      return Math.abs(d - 1) * Math.min(rx, ry) <= threshold;
    }
  }
}

// Point in polygon test for Lasso selection
export function isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.00000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Checks if stroke is contained or touches lasso polygon
export function isStrokeInLasso(stroke: InkStroke, lassoPoints: { x: number; y: number }[]): boolean {
  if (stroke.points.length === 0 || lassoPoints.length < 3) return false;
  // If at least 40% of stroke points or both endpoints are inside lasso
  let insideCount = 0;
  for (const pt of stroke.points) {
    if (isPointInPolygon(pt, lassoPoints)) {
      insideCount++;
    }
  }
  return insideCount >= Math.max(1, Math.floor(stroke.points.length * 0.4));
}

// Auto-straighten helper for straight line snap (e.g. holding stylus still or snapping)
export function snapToCardinalAngles(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  snapThresholdDegrees: number = 10
): { endX: number; endY: number } {
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.hypot(dx, dy);
  if (distance < 5) return { endX, endY };

  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle < 0) angle += 360;

  // Snappable angles: 0, 45, 90, 135, 180, 225, 270, 315, 360
  const targets = [0, 45, 90, 135, 180, 225, 270, 315, 360];
  for (const target of targets) {
    if (Math.abs(angle - target) <= snapThresholdDegrees) {
      const rad = (target * Math.PI) / 180;
      return {
        endX: startX + distance * Math.cos(rad),
        endY: startY + distance * Math.sin(rad),
      };
    }
  }

  return { endX, endY };
}
