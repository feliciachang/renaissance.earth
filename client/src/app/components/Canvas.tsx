import { useRef, useEffect, useState } from "react";
import Cursor from "./Cursor";
import type { Tile, Position } from "../utils/types";

interface CanvasComponentProps {
  createTile: (position: Position) => void;
  tiles: Tile[];
  canvasImage: string;
}

export default function CanvasComponent(props: CanvasComponentProps) {
  const { createTile, tiles, canvasImage } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cursorPosition, setCursorPosition] = useState<Position>({
    x: 0,
    y: 0,
  });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setCursorPosition({
        x: event.clientX,
        y: event.clientY,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    if (!canvasImage) return;
    // Load the image
    const image = new Image();
    image.src = canvasImage;
    image.onload = () => {
      // Draw the image on the canvas
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      setImageLoaded(true);
    };
  }, [canvasImage]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    console.log("before checking image loaded", tiles);
    if (!imageLoaded) return;
    console.log("image loaded", tiles);

    tiles.forEach((tile) => {
      // BUG: pas tiles without videos will still be redrawn
      if (!tile.video) {
        if (tile.id || tile.id === null || tile.loadingSquare) return;
        console.log("New Tile from Client", tile);
        context.fillStyle = "rgba(255, 255, 255, 0.2)";
        context.fillRect(tile.x + 1, tile.y + 1, 127, 127);
        context.strokeStyle = "white";
        context.strokeRect(tile.x + 1, tile.y + 1, 126, 126);
        tile.loadingSquare = true;
      }
    });
  }, [imageLoaded, tiles]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    if (!imageLoaded) return;

    let isCancelled = false
    let loopId = Math.random() * 1000 | 0
    const renderFrame = () => {
      console.log('rendering frame', loopId)
      for (const tile of tiles) {
        if (tile.videoElement) context.drawImage(tile.videoElement, tile.x, tile.y, 128, 128);
      }
      if (!isCancelled) requestAnimationFrame(renderFrame);
    };
    renderFrame();

    // Function to handle canvas click events
    const handleCanvasClick = (event: MouseEvent) => {
      // Calculate the cursor's position relative to the canvas
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // console.log(`Cursor Position - X: ${x}, Y: ${y}`);
      createTile({ x, y });
    };

    // Add click event listener to the canvas
    canvas.addEventListener("click", handleCanvasClick);

    // Clean up
    return () => {
      canvas.removeEventListener("click", handleCanvasClick);
      isCancelled = true
    };
  }, [createTile, imageLoaded, tiles]);

  return (
    <div className="overflow-auto no-scrollbar">
      <canvas
        onMouseEnter={() => setIsActive(true)} onMouseLeave={() => setIsActive(false)}
        className="cursor-crosshair"
        ref={canvasRef}
        width={5000}
        height={2846}
      />
      {isActive && <Cursor position={cursorPosition}/>}
    </div>
  );
}
