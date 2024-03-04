from fastapi import FastAPI, WebSocket, UploadFile, File, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import httpx
import mimetypes
from PIL import Image
import json
from typing import List
import base64
from io import BytesIO
import os
from dotenv import load_dotenv

load_dotenv()
STABILITY_API_KEY = os.getenv("STABILITY_API_KEY")
print(STABILITY_API_KEY)

Image.MAX_IMAGE_PIXELS = None

# an array of media that gets updated and sent to the client via websockets
app = FastAPI(redirect_slashes=False)
print('test')
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows access from the React app origin
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class User:
    def __init__(self, id: str, color: str, socket: WebSocket):
        self.id = id
        self.color = color
        self.socket = socket
    def __str__(self):
        return f"User(id={self.user_id}, color={self.color}, socket={self.socket})"
users = {}

# todo update preview for tiles and update tiles
# update broadcast logic
class Tile:
    def __init__(self, stabilityId: str, x: int, y: int, image: str, socket: WebSocket, video: str, ):
        self.stabilityId = stabilityId
        self.x = x,
        self.y = y
        self.image = image
        self.socket = socket
        self.video = video
    def __str__(self):
        return f"Image(id={self.stabilityId}, image={self.image}, socket={self.socket})"

tiles = {}

bosch_image_full = Image.open('./bosch.png')
(width, height) = (bosch_image_full.width // 6, bosch_image_full.height // 6)
bosch_image_sm = bosch_image_full.resize((width, height))
buffer = BytesIO()
bosch_image_sm.save(buffer, format="PNG")
bosch_sm_base64 = base64.b64encode(buffer.getvalue()).decode()

@app.websocket("/ws/{id}")
async def websocket_endpoint(websocket: WebSocket, id: str):
    await websocket.accept()
    try:
        while True:
            # send initial
            try:
                canvas_image = {
                    "event": "canvas-image",
                    "image": f"data:image/png;base64,{bosch_sm_base64}"
                }
                await websocket.send_text(json.dumps(canvas_image))
            except:
                create_error_event = {
                    "event": "unable to resize bosch",
                }
                await websocket.send_text(json.dumps(create_error_event))
            print('connected')
            # receive events
            data = await websocket.receive_text()
            try:
                jsonData = json.loads(data)
                if 'event' in jsonData:
                    if jsonData['event'] == 'create-tile':
                        await handle_create_tile_event(jsonData, websocket, id)
                    # if jsonData['event'] == 'new-image':
                    #     await handle_new_image_event(jsonData, websocket, id)
                    if jsonData['event'] == 'new-user':
                        await handle_new_user_event(jsonData, websocket)
            except:
                print('unable to parse JSON')
    except WebSocketDisconnect:
        del users[id]
        # broadcast event to all users
        for key in users:
            disconnectingUserEvent = {
                "event": f"disconnect-user {id}",
            }
            await users[key].socket.send_text(json.dumps(disconnectingUserEvent))

# new-image - returns cropped image
# loading-video - returns video id
# new-video - returns video

async def handle_create_tile_event(jsonData, websocket, client_id):
    # broadcast tile to other users
    create_tile_event = {
        "event": "new-tile",
        "x": jsonData['x'],
        "y": jsonData['y'],
    }
    for key in users:
        if(key != client_id):
            await users[key].socket.send_text(json.dumps(create_tile_event))

    # crop and send new image to all users
    scaled_x = jsonData['x'] * 6
    scaled_y = jsonData['y'] * 6
    crop_box = (scaled_x, scaled_y, scaled_x + 768, scaled_y + 768)
    cropped_image = bosch_image_full.crop(crop_box)
    buffer = BytesIO()
    cropped_image.save(buffer, format="PNG")
    base64_image = base64.b64encode(buffer.getvalue()).decode()
    tile_image_event = {
        "event": "new-image",
        "x": jsonData['x'],
        "y": jsonData['y'],
        "image": f"data:image/png;base64,{base64_image}"
    }
    for key in users:
        await users[key].socket.send_text(json.dumps(tile_image_event))
    try:
        id = await get_image_id(f"data:image/png;base64,{base64_image}", websocket)
        create_tile_event = {
            "event": "loading-video",
            "x": jsonData['x'],
            "y": jsonData['y'],
            "id": id
        }
        await websocket.send_text(json.dumps(create_tile_event))
        for key in users:
            if(key != client_id):
                await users[key].socket.send_text(json.dumps(create_tile_event))
    except Exception as e:
        print(e)
        new_image_event = {
            "event": "failed-image",
            'id': id,
            'x': jsonData['x'],
            'y': jsonData['y'],
        }
        await websocket.send_text(json.dumps(new_image_event))
    try:
        video = await create_video(id)
        if 'video' in video:
            new_video_event = {
                "event": "new-video",
                'id': id,
                'x': jsonData['x'],
                'y': jsonData['y'],
                'video': video['video']
            }
            await websocket.send_text(json.dumps(new_video_event))
            for key in users:
                if(key != client_id):
                    await users[key].socket.send_text(json.dumps(new_video_event))
    except Exception as e:
        print(e)
        new_image_event = {
            "event": "failed-video",
            'id': id,
            'x': jsonData['x'],
            'y': jsonData['y'],
        }
        await websocket.send_text(json.dumps(new_image_event))

def extract_base64_data(data_url: str) -> str:
    if ',' in data_url:
        base64_data = data_url.split(',')[1]
        return base64_data
    else:
        raise ValueError("Invalid Data URL format")

async def get_image_id(image_as_base64, websocket):
    try:
        image_as_base64 = extract_base64_data(image_as_base64)
    except:
        new_image_event = {
            "event": "unable to remove base64 data url prefix",
        }
        await websocket.send_text(json.dumps(new_image_event))
    try:
        image_data = base64.b64decode(image_as_base64)
        image_file = BytesIO(image_data)
        image_file.name = 'image.png'  # It's often a good idea to provide a filename
        new_image_event = {
            "event": "image decoded",
        }
        await websocket.send_text(json.dumps(new_image_event))
        try:
            async with httpx.AsyncClient() as client:
                url = "https://api.stability.ai/v2alpha/generation/image-to-video"
                headers = {
                    'authorization': f"Bearer {STABILITY_API_KEY}",  # Replace 'your-api-key' with your actual API key.
                    'accept': 'application/json'
                }
                files = {'image': ('image.png', image_file, 'image/png')}
                response = await client.post(url, files=files, headers=headers)
                print(response)
                if response.status_code == 200:
                    res = response.json()
                    id = res['id']
                    return id
                else:
                    new_image_event = {
                        "event": "not 200",
                    }
                    await websocket.send_text(json.dumps(new_image_event))
        except Exception as e:
            print(e)
            new_image_event = {
                "event": "could not send image to stability ai",
            }
            await websocket.send_text(json.dumps(new_image_event))
    except:
        print('unable to parse image')
        new_image_event = {
                "event": "unable to parse image",
        }
        await websocket.send_text(json.dumps(new_image_event))

# new-image - returns cropped image
# loading-video - returns video id
# new-video - returns video
# async def handle_new_image_event(jsonData, websocket, client_id):
#     # broadcast uploaded image to other users
#     new_image_event = {
#         "event": "new-image",
#         'image': jsonData['image'],
#         'x': jsonData['x'],
#         'y': jsonData['y'],
#     }
#     for key in users:
#         if(key != client_id):
#             await users[key].socket.send_text(json.dumps(new_image_event))
#     # get image id, send that image id back to the user
#     # then broadcast the image id to other users
#     try:
#         id = await get_image_id(jsonData['image'], websocket)
#         new_loading_video_event = {
#             "event": "loading-video",
#             'id': id,
#             'x': jsonData['x'],
#             'y': jsonData['y'],
#         }
#         await websocket.send_text(json.dumps(new_loading_video_event))
#         for key in users:
#             if(key != client_id):
#                 await users[key].socket.send_text(json.dumps(new_loading_video_event))
#     except Exception as e:
#         print(e)
#         new_image_event = {
#             "event": "failed-image",
#             'id': id,
#             'x': jsonData['x'],
#             'y': jsonData['y'],
#         }
#         await websocket.send_text(json.dumps(new_image_event))
#     # get video, send that video id back to the user
#     # then broadcast the video id to other users
#     try:
#         video = await create_video(id)
#         if 'video' in video:
#             new_video_event = {
#                 "event": "new-video",
#                 'id': id,
#                 'x': jsonData['x'],
#                 'y': jsonData['y'],
#                 'video': video['video']
#             }
#             await websocket.send_text(json.dumps(new_video_event))
#             for key in users:
#                 if(key != client_id):
#                     await users[key].socket.send_text(json.dumps(new_video_event))
#     except Exception as e:
#         print(e)
#         new_image_event = {
#             "event": "failed-video",
#             'id': id,
#             'x': jsonData['x'],
#             'y': jsonData['y'],
#         }
#         await websocket.send_text(json.dumps(new_image_event))

async def handle_new_user_event(jsonData, websocket):
    user = User(jsonData['id'], jsonData['color'], websocket)
    users[jsonData['id']] = user
    await handle_broadcast(jsonData['id'], websocket)
    await handle_emit(jsonData)

# send existing users to new user
async def handle_broadcast(id, websocket):
    # send existing users to new user
    for key in users:
        if(key != id):
            existingUserEvent = {
                "event": "new-user",
                "id": key,
                "color": users[key].color
            }
            await websocket.send_text(json.dumps(existingUserEvent))

# send new user to existing users
async def handle_emit(jsonData):
    for key in users:
        if(key != jsonData['id']):
            newUserEvent = {
                "event": "new-user",
                "id": jsonData['id'],
                "color": jsonData['color']
            }
            await users[key].socket.send_text(json.dumps(newUserEvent))

async def create_video(id):
    url = "https://api.stability.ai/v2alpha/generation/image-to-video/result/" + id
    headers = {
        'authorization': f"Bearer {STABILITY_API_KEY}",  # Replace 'your-api-key' with your actual API key.
        'accept': 'application/json'
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    data = response.json()
    if 'name' in data:
        print(data['name'])
    if 'errors' in data:
        print("errors", data['errors'])

    if response.status_code == 202:
        while response.status_code == 202:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=3)
        if response.status_code == 200:
            data = response.json()
            return {"video": data['video']}
        else:
            return {"failed": "failed"}
    elif response.status_code == 200:
        data = response.json()
        return {"video": data['video']}
    else:
        return {"failed": "failed"}
