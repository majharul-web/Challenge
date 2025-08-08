import { useEffect, useMemo, useRef, useState } from "react";

// === Constants ===
const SHAPE_BORDER_RADIUS = 20;
const MIN_DRAW_SIZE = 40;
const MIN_SPLIT_SIZE = 20;

const PILL_COLORS = ["#60a5fa", "#34d399", "#f87171"]; // blue, green, red variants

// === Types ===
type Pill = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
};

type Point = { x: number; y: number };
type DrawState = { sx: number; sy: number; ex: number; ey: number };
type DragState = { id: string; dx: number; dy: number };

// === Utils ===
const generateId = (): string => Math.random().toString(36).slice(2) + Date.now().toString(36);
const getRandomColor = (): string => PILL_COLORS[Math.floor(Math.random() * PILL_COLORS.length)];

export default function PillSplitter() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pills, setPills] = useState<Pill[]>([]);
  const [cursor, setCursor] = useState<Point>({ x: 200, y: 200 });
  const [drawState, setDrawState] = useState<DrawState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const clickRef = useRef({ x: 0, y: 0, time: 0, id: "" });

  // === Get mouse position relative to container ===
  const getRelativePosition = (e: MouseEvent | React.MouseEvent): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      x: ("clientX" in e ? e.clientX : 0) - (rect?.left ?? 0),
      y: ("clientY" in e ? e.clientY : 0) - (rect?.top ?? 0),
    };
  };

  // === Handle mouse down (start drawing or dragging) ===
  const handleMouseDown = (e: React.MouseEvent) => {
    const pillId = (e.target as HTMLElement).dataset.shapeId;
    const { x, y } = getRelativePosition(e);
    clickRef.current = { x, y, time: Date.now(), id: pillId ?? "" };

    if (pillId) {
      const targetPill = pills.find((pill) => pill.id === pillId)!;
      setPills((prev) => [...prev.filter((p) => p.id !== pillId), targetPill]);
      setDragState({ id: pillId, dx: x - targetPill.x, dy: y - targetPill.y });
    } else {
      setDrawState({ sx: x, sy: y, ex: x, ey: y });
    }
  };

  // === Perform pill split ===
  const splitPillsAt = (splitX: number, splitY: number) => {
    setPills((prev) =>
      prev.flatMap((pill) => {
        const withinX = pill.x < splitX && pill.x + pill.w > splitX;
        const withinY = pill.y < splitY && pill.y + pill.h > splitY;
        const leftWidth = splitX - pill.x;
        const rightWidth = pill.x + pill.w - splitX;
        const topHeight = splitY - pill.y;
        const bottomHeight = pill.y + pill.h - splitY;

        if (!withinX && !withinY) return [pill];

        if (withinX && leftWidth >= MIN_SPLIT_SIZE && rightWidth >= MIN_SPLIT_SIZE) {
          if (withinY && topHeight >= MIN_SPLIT_SIZE && bottomHeight >= MIN_SPLIT_SIZE) {
            return [
              { ...pill, id: generateId(), w: leftWidth, h: topHeight },
              { ...pill, id: generateId(), x: splitX, w: rightWidth, h: topHeight },
              { ...pill, id: generateId(), y: splitY, w: leftWidth, h: bottomHeight },
              { ...pill, id: generateId(), x: splitX, y: splitY, w: rightWidth, h: bottomHeight },
            ];
          }
          return [
            { ...pill, id: generateId(), w: leftWidth },
            { ...pill, id: generateId(), x: splitX, w: rightWidth },
          ];
        }

        if (withinY && topHeight >= MIN_SPLIT_SIZE && bottomHeight >= MIN_SPLIT_SIZE) {
          return [
            { ...pill, id: generateId(), h: topHeight },
            { ...pill, id: generateId(), y: splitY, h: bottomHeight },
          ];
        }

        // Move pill aside if not splittable
        const offsetX = withinX ? (pill.x + pill.w / 2 < splitX ? splitX - pill.w - 2 : splitX + 2) : pill.x;
        const offsetY = withinY ? (pill.y + pill.h / 2 < splitY ? splitY - pill.h - 2 : splitY + 2) : pill.y;
        return [{ ...pill, x: offsetX, y: offsetY }];
      })
    );
  };

  // === Handle global mouse move & up ===
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { x, y } = getRelativePosition(e);
      setCursor({ x, y });

      if (drawState) {
        setDrawState((prev) => prev && { ...prev, ex: x, ey: y });
      }

      if (dragState) {
        setPills((prev) =>
          prev.map((pill) =>
            pill.id === dragState.id ? { ...pill, x: x - dragState.dx, y: y - dragState.dy } : pill
          )
        );
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const { x, y } = getRelativePosition(e);
      const dist = Math.hypot(x - clickRef.current.x, y - clickRef.current.y);
      const duration = Date.now() - clickRef.current.time;

      if (drawState) {
        const { sx, sy, ex, ey } = drawState;
        const drawX = Math.min(sx, ex);
        const drawY = Math.min(sy, ey);
        const drawW = Math.abs(ex - sx);
        const drawH = Math.abs(ey - sy);

        if (drawW >= MIN_DRAW_SIZE && drawH >= MIN_DRAW_SIZE) {
          setPills((prev) => [
            ...prev,
            {
              id: generateId(),
              x: drawX,
              y: drawY,
              w: drawW,
              h: drawH,
              color: getRandomColor(),
            },
          ]);
        }

        setDrawState(null);
      }

      if (dragState) {
        setDragState(null);
        if (dist < 4 && duration < 300) splitPillsAt(x, y);
        return;
      }

      if (dist < 4 && duration < 300) splitPillsAt(x, y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drawState, dragState, pills]);

  // === Preview drawing pill ===
  const previewPill = useMemo(() => {
    if (!drawState) return null;
    const x = Math.min(drawState.sx, drawState.ex);
    const y = Math.min(drawState.sy, drawState.ey);
    const w = Math.abs(drawState.ex - drawState.sx);
    const h = Math.abs(drawState.ey - drawState.sy);
    return { x, y, w, h };
  }, [drawState]);

  return (
    <div ref={containerRef} onMouseDown={handleMouseDown} className='relative w-full h-[100dvh] bg-sky-100'>
      {/* Pills */}
      {pills.map((pill, index) => (
        <div
          key={pill.id}
          data-shape-id={pill.id}
          className='absolute border border-gray-600 shadow cursor-move'
          style={{
            left: pill.x,
            top: pill.y,
            width: pill.w,
            height: pill.h,
            background: pill.color,
            borderRadius: SHAPE_BORDER_RADIUS,
            zIndex: 10 + index,
          }}
        />
      ))}

      {/* Drawing preview */}
      {previewPill && (
        <div
          className='absolute border-2 border-rose-500/70 border-dashed bg-rose-400/10 pointer-events-none'
          style={{
            left: previewPill.x,
            top: previewPill.y,
            width: previewPill.w,
            height: previewPill.h,
            borderRadius: SHAPE_BORDER_RADIUS,
            zIndex: 40,
          }}
        />
      )}

      {/* Split lines */}
      <div
        className='absolute top-0 h-full w-[3px] bg-gray-700/80 pointer-events-none'
        style={{ left: cursor.x, transform: "translateX(-1.5px)", zIndex: 50 }}
      />
      <div
        className='absolute left-0 w-full h-[3px] bg-gray-700/80 pointer-events-none'
        style={{ top: cursor.y, transform: "translateY(-1.5px)", zIndex: 50 }}
      />
    </div>
  );
}
