import "server-only";
import HomeContainer from "./components/Home";
import Jamsocket from "@jamsocket/javascript/server";

let STABILITY_API_KEY: string = process.env.STABILITY_API_KEY ?? ''
let S3_IMAGE_URL_SM = process.env.S3_IMAGE_URL_SM ?? ''
if( !STABILITY_API_KEY || !S3_IMAGE_URL_SM ){
  throw new Error("JAMSOCKET environment variable is required");
}
// const jamsocket = Jamsocket.init({
//   account: "ffeliciachang",
//   service: "renaissance-earth",
//   // NOTE: we want to keep the Jamsocket token secret, so we can only do this in a server component
//   // We'll leave this blank for now, since we don't need it when developing with the dev CLI
//   token: process.env.JAMSOCKET ?? '',
// });

const jamsocket = Jamsocket.init({dev: true})

export default async function Page() {
  const spawnResult = await jamsocket.spawn({
    lock: "stability-demo-lock",
    env: {
      STABILITY_API_KEY: STABILITY_API_KEY,
      S3_IMAGE_URL: S3_IMAGE_URL_SM,
    }
  });
  return <HomeContainer spawnResult={spawnResult} />;
}
