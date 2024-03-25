# [renaissance.earth](https://www.renaissance.earth/)



https://github.com/feliciachang/renaissance.earth/assets/34881756/fa70e6c4-281f-4e6f-bb6b-2156f5162f8e



## Motivation

There are many ways to appreciate art. Most digital representations of art are best used for skimming. It's like running in a museum after hours – thrilling but short-lived.

Renaissance.earth is an experiment in close looking on the web, utilizing native interactions (the click) to encourage lingering. If you stay for long enough, you might see the painting come alive.

## On right now
Renaissance.earth is currently featuring the Garden of Earthly Delights by Heironymous Bosch.

## Behind the Scenes

There are a few core technologies that are needed to make this project work. For more details, you can find some [fun slides](https://tome.app/drifting-6af/constraints-creativity-clten4c0808ftoa613mq5c36z) from my [Browsertech](https://browsertech.com/nyc) talk. 

### [Stability AI](https://platform.stability.ai/docs/api-reference#tag/v2alphageneration/paths/~1v2alpha~1generation~1image-to-video/post) Image to Video Model
Image-to-video is available as an API via Stability AI. The API has strict limitations on the acceptable image sizes, which posed a technical challenge: I wanted to crop small characters in Earthly Delights, but the image size requirements (768px x 768px) aren't suitable for that.

To address this, I load up a REALLY large image of Earthly Delights (30,000px x 17,078px) in my session backend. I send a scaled down image to the client, so that I can crop small portions of the image (128px x 128px) and scale it back up to (768px x 768px) before sending the image to Stability AI.

There is latency introduced by loading up such a large image on the session backend, and one of my priorities is to make the app a lot faster!

### [Jamsocket](https://docs.jamsocket.com/) Session Backends & Native WebSockets
renaissance.earth uses session backends to load up a large copy of Earthly Delights and store changes to the canvas interface in the form of Tiles. These changes are triggered by client actions that are sent to the session backend via native WebSockets. Jamsocket session backends are stateful, so I can sync my client and server state by keeping the latest copy of data on my session backend. This is also how the app provides a multiplayer experience.

## Running the Project

1. Clone the project
2. Install libraries on the client
```bash
cd client
npm install
```
3. Initialize a session backend connection with the dev flag in app/page.tsx
(And comment out the production version)
```tsx
// In Production, initialize Jamsocket with your account, service, and API token
// const jamsocket = Jamsocket.init({
//  account: "ffeliciachang",
//  service: "renaissance-earth",
//  token: process.env.JAMSOCKET ?? "",
// });
// In Development, initialize Jamsocket with the dev flag
const jamsocket = Jamsocket.init({dev: true})
```
4. Create an .env.local file in the client's root folder.
- Add your StabilityAI API key
- Add an accessible URL to an image of The Garden of Earthly Delights. I use the original file from [Wikimedia](https://commons.wikimedia.org/wiki/File:The_Garden_of_Earthly_Delights_by_Bosch_High_Resolution.jpg.
5. Run the client
```bash
npm run dev
```
6. Start a [Jamsocket](https://docs.jamsocket.com/) session backend
```bash
cd server
npx jamsocket dev
```

## Contributions
This project is open source and open to contributions! If you encounter any bugs, please make an issue.

### Acknowledgements
Thank you to Taylor Baldwin and Paul Butler for supporting the project, pushing the idea along, and contributing amazing technical input. Thanks also to Sarim Abbas and Thomas Ballinger for many WebSocket conversations.
