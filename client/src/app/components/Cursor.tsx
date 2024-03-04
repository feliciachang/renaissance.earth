import Image from "next/image";
import CropTarget from "../../../public/crop-target.png";
import type { Position } from "./Canvas";

export default function Cursor({ position }: { position: Position }) {
  return (
    <Image
      className="fixed pointer-events-none"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      alt="square"
      src={CropTarget}
    />
  );
}
