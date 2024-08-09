import os
from aiohttp import web
import aiohttp_cors
from ultralytics import YOLO
import cv2
import numpy as np
import subprocess
from moviepy.editor import ImageSequenceClip
# Initial model load
model_path = 'yolov8n.pt'
model = YOLO(model_path)

async def handle_websocket(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    # VideoWriter için ayarları tanımlayın
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    video_path = 'process/captured_video.mp4'
    out = cv2.VideoWriter(video_path, fourcc, 10.0, (640, 480))  # 640x480 çözünürlük, 10 FPS

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.BINARY:
                # Binary veriyi görüntüye dönüştür
                nparr = np.frombuffer(msg.data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                # Görüntüyü işle
                results = model(img)
                for result in results:
                    for box in result.boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        label = model.names[int(box.cls[0])]
                        conf = box.conf[0]

                        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        cv2.putText(img, f'{label} {conf:.2f}', (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                                    (0, 255, 0), 2)

                # Görüntüyü video dosyasına yaz
                out.write(img)

                # Görüntüyü istemciye gönder
                _, img_encoded = cv2.imencode('.jpg', img)
                await ws.send_bytes(img_encoded.tobytes())

            elif msg.type == web.WSMsgType.ERROR:
                print(f'WebSocket connection closed with exception {ws.exception()}')

    finally:
        out.release()  # VideoWriter'ı serbest bırak
        await ws.close()

        # Video dosyasını MP4 formatına dönüştür
        temp_video_path = 'process/temp_video.mp4'
        output_path = 'process/processed_video.mp4'
        subprocess.run([
            'ffmpeg',
            '-y',
            '-i', video_path,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            output_path
        ])

        # Geçici video dosyasını sil
        os.remove(video_path)

    return web.Response(status=200, text=f'Video processed and saved as {output_path}')

async def handle_http(request):
    data = await request.post()
    file = data['file']
    img = np.frombuffer(file.file.read(), np.uint8)
    img = cv2.imdecode(img, cv2.IMREAD_COLOR)

    # Process the image with YOLOv8
    results = model(img)
    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            label = model.names[int(box.cls[0])]
            conf = box.conf[0]

            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(img, f'{label} {conf:.2f}', (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    # Convert processed image back to binary data
    _, buffer = cv2.imencode('.jpg', img)
    return web.Response(body=buffer.tobytes(), content_type='image/jpeg')

async def handle_http_path(request):
    data = await request.json()
    file_path = data['file_path']
    selected_model = data['model']
    outputName = data['output']

    # Ensure 'process' directory exists
    process_dir = 'process'
    os.makedirs(process_dir, exist_ok=True)

    model = YOLO(os.path.join('models', selected_model))  # Load the selected model

    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        return web.Response(status=404, text='File not found')

    frame_paths = []
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Process the frame with YOLOv8
        results = model(frame)
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                label = model.names[int(box.cls[0])]
                conf = box.conf[0]

                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, f'{label} {conf:.2f}', (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        # Save frame to file
        frame_path = os.path.join(process_dir, f'frame_{len(frame_paths):04d}.jpg')
        cv2.imwrite(frame_path, frame)
        frame_paths.append(frame_path)

    cap.release()

    # Create a video from the frames using MoviePy
    temp_video_path = os.path.join(process_dir, f'temp_video.mp4')
    clip = ImageSequenceClip([cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2RGB) for f in frame_paths], fps=20)
    clip.write_videofile(temp_video_path, codec='libx264')

    # Convert the temporary video to MP4 using FFmpeg
    output_path = os.path.join(process_dir, f'processed_{outputName}.mp4')
    subprocess.run([
        'ffmpeg',
        '-y',
        '-i', temp_video_path,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        output_path
    ])

    # Remove temporary video file and frame images
    os.remove(temp_video_path)
    for frame_path in frame_paths:
        os.remove(frame_path)

    return web.Response(status=200, text=f'Video processed and saved as {output_path}')

async def handle_model_upload(request):
    reader = await request.multipart()
    field = await reader.next()
    filename = field.filename
    if not filename.endswith('.pt'):
        return web.Response(status=400, text="Invalid file type. Please upload a .pt file.")

    save_path = os.path.join('models', filename)
    with open(save_path, 'wb') as f:
        while True:
            chunk = await field.read_chunk()  # 8192 bytes by default.
            if not chunk:
                break
            f.write(chunk)

    return web.Response(status=200, text=f'Model {filename} uploaded successfully.')

async def handle_video_upload(request):
    reader = await request.multipart()
    field = await reader.next()
    filename = field.filename
    if not filename.endswith(('.mp4')):
        return web.Response(status=400, text="Invalid file type. Please upload a .mp4, .mov, or .avi file.")

    save_path = os.path.join('videos', filename)
    os.makedirs(os.path.dirname(save_path), exist_ok=True)  # Ensure the directory exists
    with open(save_path, 'wb') as f:
        while True:
            chunk = await field.read_chunk()  # 8192 bytes by default.
            if not chunk:
                break
            f.write(chunk)

    return web.Response(status=200, text=f'Video {filename} uploaded successfully.')

async def list_models(request):
    models_dir = 'models'
    models = [f for f in os.listdir(models_dir) if f.endswith('.pt')]
    return web.json_response(models)

async def list_videos(request):
    videos_dir = os.path.join(os.path.dirname(__file__), 'process')
    videos = [f for f in os.listdir(videos_dir) if f.endswith('.mp4')]
    video_paths = [f'/process/{video}' for video in videos]
    return web.json_response(video_paths)

async def list_uploaded_videos(request):
    videos_dir = 'videos'
    videos = [f for f in os.listdir(videos_dir) if f.endswith(('.mp4'))]
    return web.json_response(videos)


app = web.Application()
app.router.add_get('/ws', handle_websocket)
app.router.add_post('/upload', handle_http)
app.router.add_post('/upload_path', handle_http_path)
app.router.add_post('/upload_model', handle_model_upload)  # Endpoint for model upload
app.router.add_post('/upload_video', handle_video_upload)  # Endpoint for video upload
app.router.add_get('/models', list_models)  # Endpoint for listing models
app.router.add_static('/process', path=os.path.join(os.path.dirname(__file__), 'process'), name='process')
app.router.add_get('/list_videos', list_videos)
app.router.add_get('/list_uploaded_videos', list_uploaded_videos)

cors = aiohttp_cors.setup(app)
for route in list(app.router.routes()):
    cors.add(route, {
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
            allow_methods=["GET", "POST"]
        )
    })

web.run_app(app, port=5000)