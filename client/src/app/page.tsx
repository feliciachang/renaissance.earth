import "server-only";
import HomeContainer from "./components/Home";
import { init } from "@jamsocket/javascript/server";

const spawnBackend = init({
  account: "felicia",
  service: "stability-demo",
  // NOTE: we want to keep the Jamsocket token secret, so we can only do this in a server component
  // We'll leave this blank for now, since we don't need it when developing with the dev CLI
  token: "",
  apiUrl: "http://localhost:8080",
});

export default async function Page() {
  const spawnResult = await spawnBackend({
    lock: "stability-demo-lock",
  });
  return <HomeContainer spawnResult={spawnResult} />;
}
