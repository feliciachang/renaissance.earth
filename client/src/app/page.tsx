import "server-only";
import HomeContainer from "./components/Home";
import Jamsocket from "@jamsocket/javascript/server";
import { JamsocketInstance } from "@jamsocket/javascript/server";

let STABILITY_API_KEY: string = process.env.STABILITY_API_KEY ?? "";
let S3_IMAGE_URL = process.env.S3_IMAGE_URL_SM ?? "";
if (!STABILITY_API_KEY || !S3_IMAGE_URL) {
  throw new Error(
    "Stability API Key and S3 Image URL must be set as environment variables.",
  );
}

let jamsocket: JamsocketInstance
if(process.env.NODE_ENV === "production") {
  jamsocket = Jamsocket.init({
    account: "ffeliciachang",
    service: "renaissance-earth",
    token: process.env.JAMSOCKET ?? "",
  });
} else {
  jamsocket = Jamsocket.init({dev: true})
}

export default async function Page() {
  // Spawn a Jamsocket session backend
  const spawnResult = await jamsocket.spawn({
    // Clients use a unique lock to access the same session backend.
    // Since we only have one public room, we can use the same lock for all clients.
    lock: "my-lock-123",
    // Pass env vars to the session backend
    env: {
      STABILITY_API_KEY: STABILITY_API_KEY,
      S3_IMAGE_URL: S3_IMAGE_URL,
    },
  });
  return <HomeContainer spawnResult={spawnResult} />;
}
