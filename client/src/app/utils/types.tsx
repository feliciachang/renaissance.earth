export type User = {
  id: string;
  color: string;
};

export type Tile = {
  id?: string;
  x: number;
  y: number;
  loadingSquare?: boolean;
  video?: string;
  videoElement?: HTMLVideoElement;
};

export type Position = {
  x: number;
  y: number;
};
