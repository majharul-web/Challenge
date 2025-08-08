import React, { useRef, useState } from "react";

type PillPart = {
  id: string;
  x: number; // relative to container
  y: number;
  width: number;
  height: number;
  color: string;
  borderRadius: {
    topLeft: boolean;
    topRight: boolean;
    bottomLeft: boolean;
    bottomRight: boolean;
  };
  parentId?: string; // original pill id for color consistency
};

const MIN_PILL_SIZE = 40;
const MIN_PART_SIZE = 20;
const BORDER_RADIUS_SIZE = 20;

function randomColor() {
  // pastel random colors
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 80%)`;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function PillSplitter() {
  // State for pills parts (initially empty)
  const [pills, setPills] = useState<PillPart[]>([]);

  // Drawing state
  const drawingRef = useRef<{
    startX: number;
    startY: number;
    drawing: boolean;
  } | null>(null);

  // Ref for container div bounding rect
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Cursor position for split lines
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  // Dragging state
  const dragRef = useRef<{
    pillId: string;
    offsetX: number;
    offsetY: number;
    dragging: boolean;
  } | null>(null);

  // Helpers for border radius inheritance on split
  // Given a pill part and which side is split, return new border radius for resulting parts
  function splitBorderRadius(
    part: PillPart,
    splitLine: "vertical" | "horizontal"
  ): [PillPart["borderRadius"], PillPart["borderRadius"]] {
    // We'll create two border radius objects, one for each part after split
    // The parts retain their original corners on the outer edges
    // Inner edges become square (no radius)
    if (splitLine === "vertical") {
      // vertical split creates left and right parts
      return [
        {
          topLeft: part.borderRadius.topLeft,
          bottomLeft: part.borderRadius.bottomLeft,
          topRight: false,
          bottomRight: false,
        },
        {
          topRight: part.borderRadius.topRight,
          bottomRight: part.borderRadius.bottomRight,
          topLeft: false,
          bottomLeft: false,
        },
      ];
    } else {
      // horizontal split creates top and bottom parts
      return [
        {
          topLeft: part.borderRadius.topLeft,
          topRight: part.borderRadius.topRight,
          bottomLeft: false,
          bottomRight: false,
        },
        {
          bottomLeft: part.borderRadius.bottomLeft,
          bottomRight: part.borderRadius.bottomRight,
          topLeft: false,
          topRight: false,
        },
      ];
    }
  }

  // Handle mouse move for cursor and drawing
  function onMouseMove(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCursor({ x, y });

    if (drawingRef.current?.drawing) {
      // Update the drawing pill preview by setting its width and height dynamically
      const startX = drawingRef.current.startX;
      const startY = drawingRef.current.startY;
      const newWidth = Math.max(Math.abs(x - startX), MIN_PILL_SIZE);
      const newHeight = Math.max(Math.abs(y - startY), MIN_PILL_SIZE);
      const left = Math.min(x, startX);
      const top = Math.min(y, startY);

      // We keep a preview in state for drawing pill parts?
      // Instead of preview state, we'll store drawing pill as a temporary pill with id = 'drawing'

      setPills((prev) => {
        // Remove any existing 'drawing' pill
        const filtered = prev.filter((p) => p.id !== "drawing");
        return [
          ...filtered,
          {
            id: "drawing",
            x: left,
            y: top,
            width: newWidth,
            height: newHeight,
            color: "rgba(0,0,0,0.2)", // translucent for preview
            borderRadius: {
              topLeft: true,
              topRight: true,
              bottomLeft: true,
              bottomRight: true,
            },
          },
        ];
      });
    }

    // Dragging pills
    if (dragRef.current?.dragging) {
      const pillIndex = pills.findIndex((p) => p.id === dragRef.current!.pillId);
      if (pillIndex === -1) return;
      const pill = pills[pillIndex];

      let newX = x - dragRef.current.offsetX;
      let newY = y - dragRef.current.offsetY;

      // Keep inside container bounds (optional)
      const rectWidth = containerRef.current?.clientWidth ?? 1000;
      const rectHeight = containerRef.current?.clientHeight ?? 1000;
      newX = Math.max(0, Math.min(newX, rectWidth - pill.width));
      newY = Math.max(0, Math.min(newY, rectHeight - pill.height));

      const updated = [...pills];
      updated[pillIndex] = { ...pill, x: newX, y: newY };
      setPills(updated);
    }
  }

  // Start drawing new pill
  function onMouseDown(e: React.MouseEvent) {
    // Ignore if clicked on existing pill (prevent drawing over pills)
    if ((e.target as HTMLElement).dataset.pillId) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    drawingRef.current = { startX: x, startY: y, drawing: true };

    // Add a pill with zero size (or min size) to preview
    setPills((prev) => [
      ...prev,
      {
        id: "drawing",
        x,
        y,
        width: MIN_PILL_SIZE,
        height: MIN_PILL_SIZE,
        color: "rgba(0,0,0,0.2)",
        borderRadius: {
          topLeft: true,
          topRight: true,
          bottomLeft: true,
          bottomRight: true,
        },
      },
    ]);
  }

  // Finish drawing new pill
  function onMouseUp() {
    if (!drawingRef.current?.drawing) return;

    // Finalize the pill only if the size >= min size
    const pill = pills.find((p) => p.id === "drawing");
    if (pill) {
      if (pill.width >= MIN_PILL_SIZE && pill.height >= MIN_PILL_SIZE) {
        const newPill: PillPart = {
          ...pill,
          id: generateId(),
          color: randomColor(),
          borderRadius: {
            topLeft: true,
            topRight: true,
            bottomLeft: true,
            bottomRight: true,
          },
        };
        setPills((prev) => [...prev.filter((p) => p.id !== "drawing"), newPill]);
      } else {
        // Too small, just remove drawing pill
        setPills((prev) => prev.filter((p) => p.id !== "drawing"));
      }
    }
    drawingRef.current = null;
  }

  // Single click to split pills parts intersecting split lines
  function onSingleClick() {
    if (drawingRef.current?.drawing) return;
    if (dragRef.current?.dragging) return;
    if (!cursor) return;

    const splitX = cursor.x;
    const splitY = cursor.y;

    const newPills: PillPart[] = [];
    let changed = false;

    for (const pill of pills) {
      if (pill.id === "drawing") {
        newPills.push(pill);
        continue;
      }

      // ✅ FIXED INTERSECTION LOGIC
      const intersectsVertically = pill.x < splitX && pill.x + pill.width > splitX;
      const intersectsHorizontally = pill.y < splitY && pill.y + pill.height > splitY;

      if (intersectsVertically && intersectsHorizontally) {
        const verticalSplits = splitPillPart(pill, "vertical", splitX);
        if (verticalSplits.length === 1) {
          newPills.push(movePartAside(pill, "vertical", splitX));
        } else {
          for (const partV of verticalSplits) {
            const horizontalSplits = splitPillPart(partV, "horizontal", splitY);
            if (horizontalSplits.length === 1) {
              newPills.push(movePartAside(partV, "horizontal", splitY));
            } else {
              newPills.push(...horizontalSplits);
            }
          }
        }
        changed = true;
      } else if (intersectsVertically) {
        const verticalSplits = splitPillPart(pill, "vertical", splitX);
        if (verticalSplits.length === 1) {
          newPills.push(movePartAside(pill, "vertical", splitX));
        } else {
          newPills.push(...verticalSplits);
        }
        changed = true;
      } else if (intersectsHorizontally) {
        const horizontalSplits = splitPillPart(pill, "horizontal", splitY);
        if (horizontalSplits.length === 1) {
          newPills.push(movePartAside(pill, "horizontal", splitY));
        } else {
          newPills.push(...horizontalSplits);
        }
        changed = true;
      } else {
        newPills.push(pill);
      }
    }

    if (changed) {
      setPills(newPills);
    }
  }

  // Split pill part at a vertical or horizontal line
  // Returns array with 1 or 2 parts (if split possible)
  function splitPillPart(part: PillPart, splitLine: "vertical" | "horizontal", splitAt: number): PillPart[] {
    // Determine coordinates relative to pill part:
    // For vertical: splitAt is X coordinate in container space
    // For horizontal: splitAt is Y coordinate in container space
    if (splitLine === "vertical") {
      // Only split if width is >= 2 * MIN_PART_SIZE and splitAt inside part range
      if (
        part.width < 2 * MIN_PART_SIZE ||
        splitAt <= part.x + MIN_PART_SIZE ||
        splitAt >= part.x + part.width - MIN_PART_SIZE
      ) {
        // Can't split, return original part
        return [part];
      }
      const leftWidth = splitAt - part.x;
      const rightWidth = part.width - leftWidth;
      const [leftRadius, rightRadius] = splitBorderRadius(part, "vertical");

      const leftPart: PillPart = {
        ...part,
        id: generateId(),
        width: leftWidth,
        borderRadius: leftRadius,
      };
      const rightPart: PillPart = {
        ...part,
        id: generateId(),
        x: splitAt,
        width: rightWidth,
        borderRadius: rightRadius,
      };
      return [leftPart, rightPart];
    } else {
      // horizontal split
      if (
        part.height < 2 * MIN_PART_SIZE ||
        splitAt <= part.y + MIN_PART_SIZE ||
        splitAt >= part.y + part.height - MIN_PART_SIZE
      ) {
        return [part];
      }
      const topHeight = splitAt - part.y;
      const bottomHeight = part.height - topHeight;
      const [topRadius, bottomRadius] = splitBorderRadius(part, "horizontal");

      const topPart: PillPart = {
        ...part,
        id: generateId(),
        height: topHeight,
        borderRadius: topRadius,
      };
      const bottomPart: PillPart = {
        ...part,
        id: generateId(),
        y: splitAt,
        height: bottomHeight,
        borderRadius: bottomRadius,
      };
      return [topPart, bottomPart];
    }
  }

  // If part cannot be split, move it to left/right or top/bottom of split line by minimum amount
  function movePartAside(part: PillPart, splitLine: "vertical" | "horizontal", splitAt: number): PillPart {
    if (splitLine === "vertical") {
      // Move left if part is on left side, else right
      const center = part.x + part.width / 2;
      if (center < splitAt) {
        // move left side: x stays same or try move left min 1 px but stay in container
        const newX = Math.min(part.x, splitAt - part.width);
        return { ...part, x: Math.max(0, newX) };
      } else {
        // move right side: move to splitAt
        return { ...part, x: Math.min(splitAt, (containerRef.current?.clientWidth ?? 1000) - part.width) };
      }
    } else {
      // horizontal
      const center = part.y + part.height / 2;
      if (center < splitAt) {
        const newY = Math.min(part.y, splitAt - part.height);
        return { ...part, y: Math.max(0, newY) };
      } else {
        return { ...part, y: Math.min(splitAt, (containerRef.current?.clientHeight ?? 1000) - part.height) };
      }
    }
  }

  // Handle drag start
  function onDragStart(e: React.MouseEvent, pillId: string, pillX: number, pillY: number) {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offsetX = e.clientX - rect.left - pillX;
    const offsetY = e.clientY - rect.top - pillY;

    dragRef.current = { pillId, offsetX, offsetY, dragging: true };
  }

  // Handle drag end
  function onDragEnd() {
    dragRef.current = null;
  }

  return (
    <>
      <style>{`
        .pill-part {
          position: absolute;
          border: 3px solid #444;
          box-sizing: border-box;
          cursor: grab;
          user-select: none;
        }
        .pill-part:active {
          cursor: grabbing;
        }
        .split-line {
          position: absolute;
          background: rgba(0,0,0,0.3);
          pointer-events: none;
          z-index: 1000;
        }
      `}</style>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          userSelect: "none",
          background: "#f9f9f9",
          overflow: "hidden",
        }}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onClick={onSingleClick}
      >
        {/* Split lines */}
        {cursor && (
          <>
            {/* Vertical line */}
            <div
              className='split-line'
              style={{
                top: 0,
                left: cursor.x,
                width: 2,
                height: "100%",
              }}
            />
            {/* Horizontal line */}
            <div
              className='split-line'
              style={{
                top: cursor.y,
                left: 0,
                width: "100%",
                height: 2,
              }}
            />
          </>
        )}

        {/* Pills parts */}
        {pills.map((pill) => {
          if (pill.id === "drawing") {
            return (
              <div
                key={pill.id}
                style={{
                  position: "absolute",
                  left: pill.x,
                  top: pill.y,
                  width: pill.width,
                  height: pill.height,
                  borderRadius: BORDER_RADIUS_SIZE,
                  backgroundColor: pill.color,
                  border: "2px dashed #888",
                  pointerEvents: "none",
                }}
              />
            );
          }
          return (
            <div
              key={pill.id}
              data-pill-id={pill.id}
              className='pill-part'
              onMouseDown={(e) => onDragStart(e, pill.id, pill.x, pill.y)}
              onMouseUp={onDragEnd}
              style={{
                left: pill.x,
                top: pill.y,
                width: pill.width,
                height: pill.height,
                backgroundColor: pill.color,
                borderTopLeftRadius: pill.borderRadius.topLeft ? BORDER_RADIUS_SIZE : 0,
                borderTopRightRadius: pill.borderRadius.topRight ? BORDER_RADIUS_SIZE : 0,
                borderBottomLeftRadius: pill.borderRadius.bottomLeft ? BORDER_RADIUS_SIZE : 0,
                borderBottomRightRadius: pill.borderRadius.bottomRight ? BORDER_RADIUS_SIZE : 0,
                zIndex: 10,
              }}
            />
          );
        })}
      </div>
    </>
  );
}
