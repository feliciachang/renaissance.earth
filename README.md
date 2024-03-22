# [renaissance.earth](https://www.renaissance.earth/)



## Motivation

There are many ways to appreciate art. Most digital representations of art are best used for skimming. It's like running in a museum after hours – thrilling but short-lived.

Renaissance.earth is an experiment in close looking on the web, utilizing native interactions on the web (the click) to encourage lingering. If you stay for long enough, you might encounter a surprise.

## On right now
Renaissance.earth is currently featuring the Garden of Earthly Delights by Heironymous Bosch.

## Behind the Scenes

There are a few core technologies that are needed to make this magic work.

### [Stability AI](https://platform.stability.ai/docs/api-reference#tag/v2alphageneration/paths/~1v2alpha~1generation~1image-to-video/post) Image to Video Model
Image-to-video is available as an API via Stability AI. But the API has strict limitations on the acceptable image sizes. This posed an interesting technical challenge: I wanted to crop specific characters in Earthly Delights, but the acceptable image sizes were all too large for cropping small images.

To decrease client latency, I load up a REALLY large image of Earthly Delights (30,000px x 17,078px) in my session backend. I send a scaled down image to the client, so that I can crop small portions of the image (128px x 128px) and scale it back up to (768px x 768px) before sending the image to Stability AI.

There is still latency introduced by loading up such a large image on the session backend, and there is exciting work to be done with figuring out how to make that faster.

### [Jamsocket](https://docs.jamsocket.com/) Session Backends & Native WebSockets
renaissance.earth uses session backends to load up a 1.4 GB image of Earthly Delights, and stores changes to the canvas interface in the form of Tiles. These changes are triggered by client actions that are sent to the session backend via native WebSockets. Jamsocket session backends are stateful, so I can sync my client and server state by keeping the latest copy of data on my session backend. This is also how the app provides a multiplayer experience.

This was the first project where I built with native WebSockets. I found the setup for native WebSockets to be surprisingly simple. The challenge with native WebSockets is less around functionality and more about the design of the WebSocket logic.

## Running the Project

1. Clone the project
2. Run the client
```bash
cd client
npm install
npm run dev
```
3. Start a [Jamsocket](https://docs.jamsocket.com/) session backend
```bash
cd server
npx jamsocket dev
```

## Acknowledgements
Thank you to Taylor Baldwin and Paul Butler for supporting the project, pushing the idea along, and contributing amazing technical input. Thanks also to Sarim Abbas and Thomas Ballinger for many WebSocket conversations along the way.
