import { useRef, useState } from "react";

type Position = { x: number; y: number };
type Size = { width: number; height: number };

interface WindowData {
  id: string;
  color: string;
  position: Position;
  size: Size;
  snapped: null;
}

// Generate a simple unique ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

const generateRandomColor = (): string => {
  const colors = ["#FF6B6B", "#6BCB77", "#4D96FF", "#FFD93D", "#FF6F91", "#6A4C93"];
  return colors[Math.floor(Math.random() * colors.length)];
};

const generateRandomPosition = (): Position => {
  const x = Math.floor(Math.random() * (window.innerWidth - 300));
  const y = Math.floor(Math.random() * (window.innerHeight - 200));
  return { x, y };
};

const Window = ({
  id,
  color,
  position,
  size,
  onClose,
}: {
  id: string;
  color: string;
  position: Position;
  size: Size;
  onClose: () => void;
}) => {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState(position);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;

    setIsDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = pos.x;
    const initY = pos.y;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - size.width, initX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - size.height, initY + dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      ref={windowRef}
      className='absolute rounded shadow-lg overflow-hidden'
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        backgroundColor: color,
        zIndex: isDragging ? 50 : 10,
      }}
    >
      <div
        className='w-full h-8 bg-black/80 text-white px-2 flex justify-between items-center cursor-move'
        onMouseDown={handleMouseDown}
      >
        <span className='text-sm'>Window {id.slice(0, 4)}</span>
        <button
          onClick={onClose}
          className='hover:bg-white/20 rounded-full w-5 h-5 flex items-center justify-center'
          aria-label='Close window'
        >
          ×
        </button>
      </div>
      <div className='p-2 text-white'>Window Content</div>
    </div>
  );
};

const WindowManager = () => {
  const [windows, setWindows] = useState<WindowData[]>([]);

  const handleAddWindow = () => {
    const newWindow: WindowData = {
      id: generateId(),
      color: generateRandomColor(),
      position: generateRandomPosition(),
      size: { width: 300, height: 200 },
      snapped: null,
    };
    setWindows((prev) => [...prev, newWindow]);
  };

  const handleRemoveWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <div className='relative w-full h-screen bg-gray-100'>
      {windows.map((win) => (
        <Window
          key={win.id}
          id={win.id}
          color={win.color}
          position={win.position}
          size={win.size}
          onClose={() => handleRemoveWindow(win.id)}
        />
      ))}

      <button
        onClick={handleAddWindow}
        className='fixed bottom-4 right-4 w-12 h-12 rounded-full bg-blue-600 text-white text-2xl shadow-lg hover:bg-blue-700 transition-colors'
        aria-label='Add new window'
      >
        +
      </button>
    </div>
  );
};

export default WindowManager;
