import React, { useEffect, useRef, useState } from "react";

type CardItem = {
  id: string;
  height: number;
  color: string;
  text: string;
};

// Generate a random pastel-ish HSL color string
const randomColor = (): string => {
  const h = Math.floor(Math.random() * 360);
  const s = 60 + Math.floor(Math.random() * 20);
  const l = 75;
  return `hsl(${h} ${s}% ${l}%)`;
};

// Create a new card item with unique id, random height and color, and display text
const makeCard = (i: number): CardItem => ({
  id: `card-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
  height: 60 + Math.floor(Math.random() * 140),
  color: randomColor(),
  text: String(i + 1),
});

const ShuffleBoard: React.FC = () => {
  // Two columns of cards, each column is an array of CardItem objects
  const [cols, setCols] = useState<CardItem[][]>([[0, 1, 2, 3].map(makeCard), [4, 5, 6, 7].map(makeCard)]);

  // Track currently dragging card and its info including offset to pointer
  const [dragging, setDragging] = useState<{
    card: CardItem;
    fromCol: number;
    fromIndex: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Current pointer position on screen
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  // Placeholder position (column and index) where dragged card can be dropped
  const [placeholder, setPlaceholder] = useState<{ col: number; index: number } | null>(null);

  // Refs to card elements for DOM measurements during drag
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Refs to column container elements
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Effect to handle global pointermove and pointerup events for dragging logic
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      setPointer({ x: e.clientX, y: e.clientY });
      if (!dragging) return;

      // Update dragging card's position
      setDragging((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));

      // Target column is the opposite of the one where drag started (toggle between 0 and 1)
      const targetCol = 1 - dragging.fromCol;
      const colEl = columnRefs.current[targetCol];
      if (!colEl) return setPlaceholder(null);

      const children = Array.from(colEl.querySelectorAll("[data-card-id]")) as HTMLElement[];
      let found: { col: number; index: number } | null = null;

      // Calculate approximate drop position (placeholder) by comparing pointer.y with gaps between cards
      for (let i = 0; i <= children.length; i++) {
        let gapY: number;
        if (!children.length) {
          // Empty column, place in the middle
          const rc = colEl.getBoundingClientRect();
          gapY = rc.top + rc.height / 2;
        } else if (i === 0) {
          gapY = children[0].getBoundingClientRect().top - 20;
        } else if (i === children.length) {
          const last = children[children.length - 1].getBoundingClientRect();
          gapY = last.bottom + 20;
        } else {
          const a = children[i - 1].getBoundingClientRect();
          const b = children[i].getBoundingClientRect();
          gapY = (a.bottom + b.top) / 2;
        }

        // If pointer is close enough to gap, mark placeholder position
        if (Math.abs(gapY - pointer.y) < 60) {
          found = { col: targetCol, index: i };
          break;
        }
      }
      setPlaceholder(found);
    };

    const onPointerUp = () => {
      if (!dragging) return;
      if (placeholder) {
        // Move the dragged card from original position to the placeholder position
        setCols((prev) => {
          const next = prev.map((arr) => arr.slice());
          next[dragging.fromCol].splice(dragging.fromIndex, 1);
          next[placeholder.col].splice(placeholder.index, 0, dragging.card);
          return next;
        });
      }
      setDragging(null);
      setPlaceholder(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // Cleanup event listeners on unmount or dependency change
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragging, pointer.y, placeholder]);

  // Initialize dragging state when user starts dragging a card
  const startDrag = (e: React.PointerEvent, card: CardItem, fromCol: number, fromIndex: number) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);

    const { clientX, clientY } = e;
    const rect = cardRefs.current[card.id]?.getBoundingClientRect();

    // Calculate pointer offset inside the dragged card for smooth drag positioning
    const offsetX = rect ? clientX - rect.left : 0;
    const offsetY = rect ? clientY - rect.top : 0;

    setDragging({ card, fromCol, fromIndex, x: clientX, y: clientY, offsetX, offsetY });
    setPointer({ x: clientX, y: clientY });
    setPlaceholder(null);
  };

  // Render a single column of cards
  const renderColumn = (colIndex: number) => (
    <div
      ref={(el) => {
        columnRefs.current[colIndex] = el as HTMLDivElement | null;
      }}
      className='w-full max-w-md bg-slate-100 rounded p-4 space-y-3 relative'
    >
      {cols[colIndex].map((c, i) => {
        const isDragging = dragging?.card.id === c.id;
        return (
          <div
            key={c.id}
            data-card-id={c.id}
            ref={(el) => {
              cardRefs.current[c.id] = el;
            }}
            onPointerDown={(e) => startDrag(e, c, colIndex, i)}
            className='rounded-lg shadow-md border select-none flex items-center justify-center font-semibold cursor-grab transition-transform duration-150'
            style={{
              height: c.height,
              background: c.color,
              opacity: isDragging ? 0.9 : 1,
              zIndex: isDragging ? 60 : 10,
            }}
          >
            {c.text}
          </div>
        );
      })}

      {/* Placeholder shows where dragged card will be dropped */}
      {placeholder?.col === colIndex && (
        <div
          className='absolute left-4 right-4 rounded-lg border-4 border-blue-400 bg-blue-100/30 transition-all duration-250 ease-out'
          style={{
            height: dragging?.card.height ?? 80,
            top: (() => {
              const idx = placeholder.index;
              const children = Array.from(
                columnRefs.current[colIndex]?.querySelectorAll("[data-card-id]") || []
              ) as HTMLElement[];
              if (!children.length) return "50%";
              if (idx === 0) return `${Math.max(8, children[0].offsetTop - 24)}px`;
              if (idx >= children.length)
                return `${children.at(-1)!.offsetTop + children.at(-1)!.offsetHeight + 16}px`;
              return `${children[idx - 1].offsetTop + children[idx - 1].offsetHeight + 8}px`;
            })(),
            zIndex: 70,
          }}
        />
      )}
    </div>
  );

  return (
    <div className='min-h-screen flex items-center justify-center p-8 bg-slate-200'>
      <div className='w-full max-w-5xl grid grid-cols-2 gap-8'>
        {renderColumn(0)}
        {renderColumn(1)}
      </div>

      {/* Dark overlay around pointer during drag */}
      {dragging && (
        <div
          className='pointer-events-none fixed inset-0'
          style={{
            zIndex: 50,
            background: `radial-gradient(circle at ${pointer.x}px ${pointer.y}px, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 100px, rgba(0,0,0,0.6) 160px)`,
          }}
        />
      )}

      {/* Dragged card preview follows pointer */}
      {dragging && (
        <div
          className='fixed rounded-lg shadow-2xl pointer-events-none flex items-center justify-center text-lg font-semibold'
          style={{
            left: dragging.x - dragging.offsetX,
            top: dragging.y - dragging.offsetY,
            width: 320,
            height: dragging.card.height,
            background: dragging.card.color,
            opacity: 0.9,
            zIndex: 80,
          }}
        >
          {dragging.card.text}
        </div>
      )}
    </div>
  );
};

export default ShuffleBoard;
