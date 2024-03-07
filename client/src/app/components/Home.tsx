"use client";
import { SessionBackendProvider, useReady } from "@jamsocket/javascript/react";
import type { SpawnResult } from "@jamsocket/javascript/types";
import { useState, useEffect, useRef } from "react";
import { generateRandomString } from "../utils";
import CanvasComponent from "./Canvas";
import Footer from "./Footer";
import { User, Tile, Position } from "../utils/types";
import { base64ToBlob } from "../utils";

export default function HomeContainer({
  spawnResult,
}: {
  spawnResult: SpawnResult;
}) {
  return (
    <SessionBackendProvider spawnResult={spawnResult}>
      <Home url={spawnResult.url} />
    </SessionBackendProvider>
  );
}

interface HomeProps {
  url: string;
}

function createVideoElement(video: string): HTMLVideoElement {
  const videoBlob = base64ToBlob(video, "video/mp4");
  const videoObjectUrl = URL.createObjectURL(videoBlob);
  const videoElement = document.createElement("video");
  videoElement.src = videoObjectUrl;
  videoElement.muted = true;
  videoElement.loop = true;
  videoElement.play();
  return videoElement
}

function Home(props: HomeProps) {
  const { url } = props;
  const ready = useReady();
  const [users, setUsers] = useState<User[]>([]);
  const [currUser, setCurrUser] = useState<User>({
    id: "",
    color: "",
  });
  const [canvasImage, setCanvasImage] = useState<string>("");

  const [tiles, setTiles] = useState<Tile[]>([]);
  const websocketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!currUser.id) {
      setCurrUser({
        id: generateRandomString(10),
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      });
    }

    if (ready && currUser.id) {
      const websocket = new WebSocket(
        url.replace("http", "ws") + "ws/" + currUser.id,
      );
      websocketRef.current = websocket;
      // TODO: update tiles if there are tiles to update
      websocket.onopen = () => {
        const userEvent: string = JSON.stringify({
          event: "new-user",
          id: currUser.id,
          color: currUser.color,
        });
        console.log("sending new user event", userEvent);
        websocket.send(userEvent);
      };

      websocket.onmessage = (event) => {
        const jsonData = JSON.parse(event.data);
        console.log("event", jsonData);
        if (jsonData.event === "canvas-image") {
          setCanvasImage(jsonData.image);
        }
        if (jsonData.event === "existing-tiles") {
          console.log("existing tiles event ", jsonData.tiles);
          setTiles(jsonData.tiles.map((t: Tile) => {
            if (!t.video) return t;
            const videoElement = createVideoElement(t.video);
            return {...t, videoElement }
          }));
        }
        if (jsonData.event === "new-user") {
          if (jsonData?.id && jsonData?.color) {
            let newUser: User = {
              id: jsonData.id,
              color: jsonData.color,
            };
            newUser.id = jsonData.id;
            newUser.color = jsonData.color;
            setUsers((prevUsers) => [...prevUsers, newUser]);
          }
        }
        if (jsonData.event === "loading-video") {
          setTiles((prevTiles) => {
            const newTiles = prevTiles.map((t) => {
              if (t.x === jsonData.x && t.y === jsonData.y) {
                return { ...t, id: jsonData.id };
              }
              return t;
            });
            return newTiles;
          });
        }
        if (jsonData.event === "new-video") {
          setTiles((prevTiles) => {
            const newTiles = prevTiles.map((t) => {
              if (t.id === jsonData.id) {
                const videoElement = createVideoElement(jsonData.video);
                return { ...t, video: jsonData.video, videoElement };
              }
              return t;
            });
            return newTiles;
          });
        }
        if (jsonData.event === "disconnect-user") {
          setUsers((prevUsers) =>
            prevUsers.filter((user) => user.id !== jsonData.id),
          );
        }
        if (jsonData.event === "new-tile") {
          setTiles((prevTiles) => {
            const newTile = {
              x: jsonData.x,
              y: jsonData.y,
            };
            return [...prevTiles, newTile];
          });
        }
      };
    }
  }, [url, ready, websocketRef, currUser.id, currUser.color]);

  function createTile(position: Position) {
    let newTile = {
      x: position.x,
      y: position.y,
    };
    setTiles((prevTiles) => [...prevTiles, newTile]);
    if (websocketRef.current) {
      const message = JSON.stringify({
        event: "create-tile",
        x: position.x,
        y: position.y,
      });
      console.log("sending create tile message", message);
      websocketRef.current.send(message);
    }
  }
  return (
    <div className="flex flex-col h-screen">
      {canvasImage.length > 0 ? (
        <CanvasComponent
          createTile={createTile}
          tiles={tiles}
          canvasImage={canvasImage}
        />
      ) : (
        <div
          style={{ height: "2846px" }}
          className="relative flex justify-center items-center"
        >
          <div className="absolute">renaissance.earth</div>
          <div className="absolute w-96 h-96 border border-white/30 rounded-full"></div>
          <div className="absolute z-10 w-96 h-96 border-2 border-white/50 rounded-full spin-x-animation"></div>
        </div>
      )}
      <Footer
        loading={canvasImage.length === 0}
        currUser={currUser}
        users={users}
      />
    </div>
  );
}
