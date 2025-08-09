import React, { useEffect, useRef, useState } from "react";

// Types
type CardItem = {
  id: string;
  height: number;
  color: string;
  text: string;
};

// Generate random pastel color
const randomColor = (): string => {
  const h = Math.floor(Math.random() * 360);
  const s = 60 + Math.floor(Math.random() * 20);
  const l = 75;
  return `hsl(${h} ${s}% ${l}%)`;
};

// Create a new card
const makeCard = (i: number): CardItem => ({
  id: `card-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
  height: 60 + Math.floor(Math.random() * 140),
  color: randomColor(),
  text: String(i + 1),
});

const ShuffleBoard: React.FC = () => {
  const [cols, setCols] = useState<CardItem[][]>([[0, 1, 2, 3].map(makeCard), [4, 5, 6, 7].map(makeCard)]);

  const [dragging, setDragging] = useState<{
    card: CardItem;
    fromCol: number;
    fromIndex: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [placeholder, setPlaceholder] = useState<{ col: number; index: number } | null>(null);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Handle global pointermove and pointerup
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      setPointer({ x: e.clientX, y: e.clientY });
      if (!dragging) return;

      setDragging((d) => d && { ...d, x: e.clientX, y: e.clientY });

      const targetCol = 1 - dragging.fromCol;
      const colEl = columnRefs.current[targetCol];
      if (!colEl) return setPlaceholder(null);

      const children = Array.from(colEl.querySelectorAll("[data-card-id]")) as HTMLElement[];
      let found: { col: number; index: number } | null = null;

      for (let i = 0; i <= children.length; i++) {
        let gapY: number;
        if (!children.length) {
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
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragging, pointer.y, placeholder]);

  // Start drag
  const startDrag = (e: React.PointerEvent, card: CardItem, fromCol: number, fromIndex: number) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const { clientX, clientY } = e;
    const rect = cardRefs.current[card.id]?.getBoundingClientRect();
    const offsetX = rect ? clientX - rect.left : 0;
    const offsetY = rect ? clientY - rect.top : 0;

    setDragging({
      card,
      fromCol,
      fromIndex,
      x: clientX,
      y: clientY,
      offsetX,
      offsetY,
    });
    setPointer({ x: clientX, y: clientY });
    setPlaceholder(null);
  };

  // Render each column
  const renderColumn = (colIndex: number) => {
    const cards = [...cols[colIndex]];

    if (placeholder?.col === colIndex && dragging) {
      cards.splice(placeholder.index, 0, {
        id: "placeholder",
        height: dragging.card.height,
        color: "transparent",
        text: "",
      });
    }

    return (
      <div
        ref={(el) => {
          columnRefs.current[colIndex] = el;
        }}
        className='w-full max-w-md bg-slate-100 rounded p-4 space-y-3 relative'
      >
        {cards.map((card, index) => {
          const isDraggingCard = dragging?.card.id === card.id;
          const isPlaceholder = card.id === "placeholder";

          return (
            <div
              key={card.id + index}
              data-card-id={!isPlaceholder ? card.id : undefined}
              ref={(el) => {
                if (!isPlaceholder) cardRefs.current[card.id] = el;
              }}
              onPointerDown={
                !isPlaceholder
                  ? (e) =>
                      startDrag(
                        e,
                        card,
                        colIndex,
                        cols[colIndex].findIndex((c) => c.id === card.id)
                      )
                  : undefined
              }
              className={`rounded-lg shadow-md border select-none flex items-center justify-center font-semibold transition-all delay-300 duration-300 ease-in-out ${
                isPlaceholder ? "" : "cursor-grab"
              }`}
              style={{
                height: card.height,
                background: isPlaceholder ? "#000" : card.color,
                opacity: isDraggingCard ? 0.9 : 1,
                zIndex: isDraggingCard ? 60 : 10,
              }}
            >
              {!isPlaceholder && card.text}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className='min-h-screen flex items-center justify-center p-8 bg-slate-200'>
      <div className='w-full max-w-5xl grid grid-cols-2 gap-8'>
        {renderColumn(0)}
        {renderColumn(1)}
      </div>

      {/* Spotlight darkness effect */}
      {dragging && (
        <div
          className='pointer-events-none fixed inset-0'
          style={{
            zIndex: 50,
            background: `radial-gradient(circle at ${pointer.x}px ${pointer.y}px, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 100px, rgba(0,0,0,0.6) 160px)`,
          }}
        />
      )}

      {/* Drag preview following the pointer */}
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
