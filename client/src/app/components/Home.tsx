"use client";
import { SessionBackendProvider, useReady } from "@jamsocket/javascript/react";
import type { SpawnResult } from "@jamsocket/javascript/types";
import { useState, useEffect, useRef } from "react";
import { generateRandomString } from "../utils";
import CanvasComponent from "./Canvas";
import type { Position } from "./Canvas";
import Footer from "./Footer";

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

export type User = {
  id: string;
  color: string;
};
export type Tile = {
  id?: string;
  x: number;
  y: number;
  base64Image?: string;
  video?: string;
};
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
        websocket.send(userEvent);
      };

      websocket.onmessage = (event) => {
        const jsonData = JSON.parse(event.data);
        console.log("event", jsonData.event);
        console.log("data", jsonData);
        if (jsonData.event === "canvas-image") {
          setCanvasImage(jsonData.image);
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
        if (jsonData.event === "new-image") {
          setTiles((prevTiles) => {
            const newTiles = prevTiles.map((t) => {
              if (t.x === jsonData.x && t.y === jsonData.y) {
                return { ...t, base64Image: jsonData.image };
              }
              console.log(t);
              return t;
            });
            return newTiles;
          });
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
          console.log(jsonData);
          setTiles((prevTiles) => {
            const newTiles = prevTiles.map((t) => {
              if (t.id === jsonData.id) {
                return { ...t, video: jsonData.video };
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
      <Footer loading={canvasImage.length === 0} currUser={currUser} users={users}/>
    </div>
  );
}
