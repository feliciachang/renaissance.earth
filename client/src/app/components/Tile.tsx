import type { Tile } from "./Home";
import { useState } from "react";
import { base64ToBlob } from "../utils";
import Image from "next/image";

interface TileProps {
  tile: Tile;
  updateTile: (tile: Tile, base64Image: string) => void;
}

export default function Tile(props: TileProps) {
  const { tile, updateTile } = props;
  const { base64Image, video } = tile;
  const [imagePreview, setImagePreview] = useState<string>("");

  const processFiles = (files: FileList) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;
    let file = fileList[0];

    const reader = new FileReader();
    reader.onload = function (e) {
      if (e.target === null || e.target.result === null) return;
      let base64 = e.target.result;
      if (typeof base64 !== "string") {
        console.error("Expected a string, but received a different type");
        return;
      }
      setImagePreview(base64);
      updateTile(tile, base64);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files) {
      processFiles(event.dataTransfer.files);
    }
  };
  let tileSpace = <p>Drag and drop images here, or click to select images</p>;
  if (video && video.length > 0) {
    const videoBlob = base64ToBlob(video, "video/mp4");
    const videoObjectUrl = URL.createObjectURL(videoBlob);
    tileSpace = (
      <video width="320" height="320" autoPlay loop controls>
        <source src={videoObjectUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    );
  } else if (base64Image && base64Image.length > 0) {
    tileSpace = (
      <Image alt={"something"} src={base64Image} width={320} height={320} />
    );
  } else if (imagePreview && imagePreview.length > 0) {
    tileSpace = (
      <Image alt={"something"} src={imagePreview} width={320} height={320} />
    );
  }
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="rounded-lg border border-neutral-800"
      style={{ width: 320, height: 320 }}
    >
      {tileSpace}
    </div>
  );
}
