from fastapi import FastAPI, WebSocket, UploadFile, File, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import httpx
from PIL import Image
import json
from typing import List
import base64
from io import BytesIO
import os
import requests
from dotenv import load_dotenv
import asyncio

print_ = print
def print(*args, **kwargs):
    print_(*args, **kwargs, flush=True)

load_dotenv()
STABILITY_API_KEY = os.getenv("STABILITY_API_KEY")

Image.MAX_IMAGE_PIXELS = None

# an array of media that gets updated and sent to the client via websockets
app = FastAPI(redirect_slashes=False)
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
users = {}

# update broadcast logic
class Tile:
    def __init__(self, x: int, y: int, id: str = None, image: str = None, video: str = None ):
        self.id = id
        self.x = x
        self.y = y
        self.image = image
        self.video = video
    def to_dict(self):
        tile = {
            "x": self.x,
            "y": self.y,
        }
        if self.video:
            tile["video"] = self.video
        return tile

class Tiles:
    def __init__(self):
        self.tiles = {}
    def add_tile(self, x: int, y: int):
        tile = Tile(x, y)
        self.tiles[f"{x},{y}"] = tile
        print(self.tiles)
    def get_tile(self, x: int, y: int):
        return self.tiles[f"{x},{y}"]
    def add_tile_attribute(self, x: int, y: int, attributeType: str, attribute: str):
        tile = self.get_tile(x, y)
        if tile:
            setattr(tile, attributeType, attribute)
    def get_tile_array(self):
        return [tile.to_dict() for tile in self.tiles.values()]
tiles = Tiles()

def get_image_from_s3():
    S3_IMAGE_URL = os.getenv("S3_IMAGE_URL")
    response = requests.get(S3_IMAGE_URL)
    if response.status_code == 200:
        image_data = response.content
        image_file = BytesIO(image_data)
        return image_file

image_file = get_image_from_s3()
bosch_image_full = Image.open(image_file)
(width, height) = (bosch_image_full.width // 6, bosch_image_full.height // 6)
bosch_image_sm = bosch_image_full.resize((width, height))
buffer = BytesIO()
bosch_image_sm.save(buffer, format="jpeg")
bosch_sm_base64 = base64.b64encode(buffer.getvalue()).decode()

print('got image ==')

@app.websocket("/ws/{id}")
async def websocket_endpoint(websocket: WebSocket, id: str):
    await websocket.accept()
    # send initial data when a client first connects
    canvas_image = {
        "event": "canvas-image",
        "image": f"data:image/jpeg;base64,{bosch_sm_base64}"
    }
    await websocket.send_text(json.dumps(canvas_image))
    tiles_as_array = tiles.get_tile_array()
    print(tiles_as_array)
    existing_tiles = {
        "event": "existing-tiles",
        "tiles": tiles_as_array
    }
    await websocket.send_text(json.dumps(existing_tiles))
    try:
        while True:
            # receive events
            data = await websocket.receive_text()
            jsonData = json.loads(data)
            if 'event' in jsonData:
                if jsonData['event'] == 'create-tile':
                    asyncio.create_task(handle_create_tile(jsonData, websocket, id))
                if jsonData['event'] == 'new-user':
                    asyncio.create_task(handle_new_user_event(jsonData, websocket))
    except WebSocketDisconnect:
        if id in users:
            del users[id]
            # broadcast event to all users
            for key in users:
                disconnectingUserEvent = {
                    "event": f"disconnect-user {id}",
                }
                await users[key].socket.send_text(json.dumps(disconnectingUserEvent))


async def handle_create_tile(jsonData, websocket, id):
    await broadcast_new_tile(jsonData, id)
    await handle_create_video_event(jsonData, websocket, id)

async def broadcast_new_tile(jsonData, client_id):
    print(f"create tile function {jsonData['x']}, {jsonData['y']}")
    # broadcast tile to other users
    create_tile_event = {
        "event": "new-tile",
        "x": jsonData['x'],
        "y": jsonData['y'],
    }
    tiles.add_tile(jsonData['x'], jsonData['y'])
    for key in users:
        if(key != client_id):
            await users[key].socket.send_text(json.dumps(create_tile_event))

async def send_loading_status(jsonData, id, websocket, client_id):
    create_tile_event = {
        "event": "loading-video",
        "x": jsonData['x'],
        "y": jsonData['y'],
        "id": id
    }
    tiles.add_tile_attribute(jsonData['x'], jsonData['y'], "id", id)
    await websocket.send_text(json.dumps(create_tile_event))
    for key in users:
        if(key != client_id):
            await users[key].socket.send_text(json.dumps(create_tile_event))


async def handle_create_video_event(jsonData, websocket, client_id):
    # crop and send new image to ALL users
    scaled_x = jsonData['x'] * 6
    scaled_y = jsonData['y'] * 6
    crop_box = (scaled_x, scaled_y, scaled_x + 768, scaled_y + 768)
    cropped_image = bosch_image_full.crop(crop_box)
    buffer = BytesIO()
    cropped_image.save(buffer, format="jpeg")
    base64_image = base64.b64encode(buffer.getvalue()).decode()
    try:
        id = await get_image_id(f"data:image/jpeg;base64,{base64_image}", websocket)
        print(f"got image id: {id} (jsonData: {jsonData} | client_id: {client_id})")
        await send_loading_status(jsonData, id, websocket, client_id)
    except Exception:
        new_image_event = {
            "event": "failed-to-get-image-id",
            'x': jsonData['x'],
            'y': jsonData['y'],
        }
        await websocket.send_text(json.dumps(new_image_event))
        return
    video = await create_video(id)
    if 'code' in video:
        new_video_event = {
            "event": "failed-video",
            "code": video['code'],
            "name": video['name'],
            "errors": video['errors']
        }
        await websocket.send_text(json.dumps(new_video_event))
        return
    if 'video' in video:
        new_video_event = {
            "event": "new-video",
            'id': id,
            'x': jsonData['x'],
            'y': jsonData['y'],
            'video': video['video']
        }
        tiles.add_tile_attribute(jsonData['x'], jsonData['y'], "video", video['video'])
        await websocket.send_text(json.dumps(new_video_event))
        for key in users:
            if(key != client_id):
                await users[key].socket.send_text(json.dumps(new_video_event))

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
        image_file.name = 'image.jpeg'
        new_image_event = {
            "event": "image decoded",
        }
        await websocket.send_text(json.dumps(new_image_event))
        try:
            print('calling stability api to send image')
            async with httpx.AsyncClient() as client:
                url = "https://api.stability.ai/v2beta/image-to-video"
                headers = {
                    'authorization': f"Bearer {STABILITY_API_KEY}",
                    'accept': 'application/json'
                }
                files = {'image': ('image.png', image_file, 'image/png')}
                response = await client.post(url, files=files, headers=headers, data={"cfg_scale": 1.8})
                print(response)
                if response.status_code == 200:
                    res = response.json()
                    print(f"200 response from stability ai: {res}")
                    id = res['id']
                    return id
                else:
                    print(f"non-200 from stability ai: {response.status_code} {response.text}")
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
    except Exception as e:
        new_image_event = {
            "event": "unable to parse image",
        }
        await websocket.send_text(json.dumps(new_image_event))

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
    url = "https://api.stability.ai/v2beta/image-to-video/result/" + id
    headers = {
        'authorization': f"Bearer {STABILITY_API_KEY}",
        'accept': 'application/json'
    }
    print('calling stability api to get video')
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    data = response.json()
    if 'name' in data:
        print(data['name'])
    if 'errors' in data:
        print("errors", data['errors'])

    if response.status_code == 202:
        try:
            while response.status_code == 202:
                print(f"looping through 202s {id}")
                await asyncio.sleep(10)
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, headers=headers)
        except httpx.TimeoutException:
            print("Timeout occurred while waiting for video generation")
            return {"code": 408, "name": "Timeout", "errors": ["Timeout occurred while waiting for video generation"]}
        except Exception as e:
            print(f"An error occurred: {e}")
            return {"code": 500, "name": "Internal Server Error", "errors": [str(e)]}
        if response.status_code == 200:
            data = response.json()
            return {"video": data['video']}
        else:
            data = response.json()
            return {
                "code": response.status_code,
                "name": data['name'],
                "errors": data['errors']
            }
    elif response.status_code == 200:
        data = response.json()
        return {"video": data['video']}
    else:
        data = response.json()
        return {
                "code": response.status_code,
                "name": data['name'],
                "errors": data['errors']
            }
