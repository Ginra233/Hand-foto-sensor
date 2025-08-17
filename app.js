import { GestureRecognizer, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.js";

const video = document.getElementById('webcam-video');
const overlayCanvas = document.getElementById('overlay-canvas');
const overlayCtx = overlayCanvas.getContext('2d');
const statusDiv = document.getElementById('status');
const photoCanvas = document.getElementById('photo-canvas');
const capturedImage = document.getElementById('captured-image');
const downloadLink = document.getElementById('download-link');

let gestureRecognizer;
let runningMode = "VIDEO";
let lastVideoTime = -1;
let photoTaken = false;

async function createGestureRecognizer() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"
        },
        runningMode: runningMode
    });
}

createGestureRecognizer();

navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
        video.addEventListener('loadeddata', () => {
            overlayCanvas.width = video.videoWidth;
            overlayCanvas.height = video.videoHeight;
            predictWebcam();
        });
    })
    .catch(err => {
        console.error("Error saat mengakses kamera: ", err);
        statusDiv.innerText = "Error: Tidak bisa mengakses kamera.";
    });

async function predictWebcam() {
    if (photoTaken) return;

    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const results = gestureRecognizer.recognizeForVideo(video, performance.now());

        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        
        if (results.landmarks && results.landmarks.length > 0) {
            for (const landmarks of results.landmarks) {
                // Menggambar garis konektor antar landmark
                drawConnectors(overlayCtx, landmarks, HAND_CONNECTIONS, { color: 'rgb(0,255,0)', lineWidth: 5 });
                
                // Menggambar titik-titik landmark
                drawLandmarks(overlayCtx, landmarks, { color: 'rgb(255,0,0)', lineWidth: 2 });
            }
        }

        if (results.gestures && results.gestures.length > 0) {
            const topGesture = results.gestures[0][0].categoryName;
            statusDiv.innerText = `Gerakan terdeteksi: ${topGesture}`;

            if (topGesture === "Open_Palm") {
                takePhoto();
            }
        } else {
            statusDiv.innerText = "Tidak ada gestur terdeteksi.";
        }
    }

    requestAnimationFrame(predictWebcam);
}

function takePhoto() {
    photoTaken = true;
    statusDiv.innerText = "Foto diambil!";

    photoCanvas.width = video.videoWidth;
    photoCanvas.height = video.videoHeight;
    
    photoCanvas.getContext('2d').drawImage(video, 0, 0, photoCanvas.width, photoCanvas.height);

    const imageDataURL = photoCanvas.toDataURL('image/png');

    capturedImage.src = imageDataURL;
    capturedImage.style.display = 'block';
    
    downloadLink.href = imageDataURL;
    downloadLink.style.display = 'block';

    video.style.display = 'none';
    overlayCanvas.style.display = 'none';
}

const HAND_CONNECTIONS = [
    { start: 0, end: 1 }, { start: 1, end: 2 }, { start: 2, end: 3 }, { start: 3, end: 4 },
    { start: 0, end: 5 }, { start: 5, end: 6 }, { start: 6, end: 7 }, { start: 7, end: 8 },
    { start: 5, end: 9 }, { start: 9, end: 10 }, { start: 10, end: 11 }, { start: 11, end: 12 },
    { start: 9, end: 13 }, { start: 13, end: 14 }, { start: 14, end: 15 }, { start: 15, end: 16 },
    { start: 13, end: 17 }, { start: 17, end: 18 }, { start: 18, end: 19 }, { start: 19, end: 20 },
    { start: 0, end: 17 }
];

function drawConnectors(ctx, keypoints, connections, style) {
    const { color = 'white', lineWidth = 1 } = style;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    for (const connection of connections) {
        const from = keypoints[connection.start];
        const to = keypoints[connection.end];
        if (from && to) {
            ctx.beginPath();
            ctx.moveTo(from.x * ctx.canvas.width, from.y * ctx.canvas.height);
            ctx.lineTo(to.x * ctx.canvas.width, to.y * ctx.canvas.height);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawLandmarks(ctx, keypoints, style) {
    const { color = 'blue', lineWidth = 1 } = style;
    ctx.save();
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    for (const keypoint of keypoints) {
        const circle = new Path2D();
        circle.arc(keypoint.x * ctx.canvas.width,
                   keypoint.y * ctx.canvas.height, 5, 0, 2 * Math.PI);
        ctx.fill(circle);
        ctx.stroke();
    }
    ctx.restore();
}
