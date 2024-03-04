# renaissance.earth

Close looking on the web.

add video

## Motivation

Digital representations of physical art are typically meant for archival or search purposes. These representations are best used for skimming or referencing physical art pieces. It's like running in a museum after hours – thrilling but short-lived.

Spaces for close looking or lingering, both on the web and in physical spaces is becoming more and more limited. Our patience is notably shorter. Our capacity to be immersed or surprised is smaller. This only makes such building spaces all the more exciting.

renaissance.earth is the latest in a [small personal lineage](https://readalibi.org/invitation) of experiments around this question: what can the web offer when it comes to bringing the artifacts of our physical lives to the virtual realm.

In this experience, renaissance.earth focuses on bringing to life (literally) the provacative yet intriguing characters that shape the Garden of Earthly Delights by Heironymous Bosch.

## Behind the Scenes

What made renaissance.earth exciting for me was the they remind me of Harry Potter's moving portraits, as if bringing to life something that was not made to animate. I think makes image-to-video feel like peeking behind a magic curtain, even if the quality is as yet, nascent.

There are a few core technologies that are needed to make this magic work.

### Stability AI Image to Video Model
Image-to-video is available as an API via Stability AI. But the API has strict limitations on the acceptable image sizes. This posed an interesting technical challenge: I wanted to crop specific characters in Earthly Delights, but the acceptable image sizes were all too large for cropping small images.

To decrease client latency, I load up a REALLY large image of Earthly Delights (30,000px x 17,078px) in my session backend. I send a scaled down image to the client, so that I can crop small portions of the image (128px x 128px) and scale it back up to (768px x 768px) before sending the image to Stability AI.

There is still latency introduced by loading up such a large image on the session backend, and there is exciting work to be done with figuring out how to make that faster.

### Jamsocket Session Backends & Native WebSockets
renaissance.earth uses session backends to load up a 1.4 GB image of Earthly Delights, and stores changes to the canvas interface in the form of Tiles. These changes are triggered by client actions that are sent to the session backend via native WebSockets. Jamsocket session backends are stateful, so

renaissance.earth also uses Jamsocket session backends and native WebSockets to send realtime updates across connected clients.



renaissance.earth is an example of realtime image to video generation

renaissance.earth uses three main technologies to build user-enacted image to video generation
renaissance.earth treats a painting as a canvas for user interactions. This can be really intensive for servers and clients that have to render large image files on the fly.

The biggest challenge to renaissance.earth is the way it uses a painting as a canvas for user interactions.

The web is such an interactive and accessible medium,
The web as a malleable and interactive medium offers so much potential. This project is an attempt to explore that potential with technology that are quickly establishing new standards for web-based experiences: image and video AI generation, new web protocols like WebSockets, and stateful and shared backends.


 image to video AI generation, realtime interactivity via WebSockets, multiplayer and statefulness on the server via session backends.

At the same time, the web as an interactive medium

In a past experiment called Read Alibi, I

Viewing physical art on the web has always been a challenge. Nothing can compare to seeing a piece in real life, where you can take in the painting from different perspectives and modes of viewing. The web is often just a portal to search and discover. It is not always conducive to lingering.

Renaissance.earth attempts to bring a special element to painting, make you more aware of space cause its blown up.

python3 -m venv venv
cd server
npx jamsocket dev

npm install
npm run dev

1. write the class for users
2. write readme


TODO:
// move canvas image send out of the loop
// you don't even need any of the python setup locally - > all you need is what's dockerized
-- adding a new library to a python project -> writing it in the requirements.txt file instead of pip install pip freeze etc


technical bugs
- if video is already made, send those videos to users
