import {
    GestureRecognizer,
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.js";

const video = document.getElementById('webcam-video');
const overlayCanvas = document.getElementById('overlay-canvas');
const overlayCtx = overlayCanvas.getContext('2d');
const statusDiv = document.getElementById('status');
const capturedSection = document.getElementById('captured-section');
const capturedImage = document.getElementById('captured-image');
const downloadLink = document.getElementById('download-link');

let gestureRecognizer;
let handLandmarker;
let lastVideoTime = -1;
let photoTaken = false;
let isPalmOpen = false;
let palmOpenStartTime = 0;
const captureDelay = 3000; // 3 detik

async function initializeApp() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );

    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"
        },
        runningMode: "VIDEO"
    });

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
        },
        runningMode: "VIDEO"
    });

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            overlayCanvas.width = video.videoWidth;
            overlayCanvas.height = video.videoHeight;
            predictWebcam();
        };
    } catch (err) {
        statusDiv.innerText = "Error: Tidak bisa mengakses kamera. Pastikan Anda memberikan izin.";
        console.error("Error saat mengakses kamera:", err);
    }
}

function predictWebcam() {
    if (photoTaken) return;

    const now = performance.now();
    if (now - lastVideoTime < 1000 / 30) { // Limit to ~30 FPS
        requestAnimationFrame(predictWebcam);
        return;
    }
    lastVideoTime = now;
    
    const gestureResults = gestureRecognizer.recognizeForVideo(video, now);
    const landmarkResults = handLandmarker.detectForVideo(video, now);
    
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    if (landmarkResults.landmarks && landmarkResults.landmarks.length > 0) {
        for (const landmarks of landmarkResults.landmarks) {
            drawConnectors(overlayCtx, landmarks, HAND_CONNECTIONS, { color: '#00ff00', lineWidth: 5 });
            drawLandmarks(overlayCtx, landmarks, { color: '#ff0000', lineWidth: 2 });
        }
    }
    
    let isCurrentGesturePalmOpen = false;
    if (gestureResults.gestures && gestureResults.gestures.length > 0) {
        const topGesture = gestureResults.gestures[0][0].categoryName;
        if (topGesture === "Open_Palm") {
            isCurrentGesturePalmOpen = true;
        }
        statusDiv.innerText = `Gerakan terdeteksi: ${topGesture}`;
    } else {
        statusDiv.innerText = "Tidak ada gestur terdeteksi.";
    }

    if (isCurrentGesturePalmOpen) {
        if (!isPalmOpen) {
            isPalmOpen = true;
            palmOpenStartTime = Date.now();
        }
        const timeLeft = Math.max(0, captureDelay - (Date.now() - palmOpenStartTime));
        const secondsLeft = Math.ceil(timeLeft / 1000);
        statusDiv.innerHTML = `Gerakan terdeteksi: **Open Palm**<br>Mengambil foto dalam ${secondsLeft}...`;
        
        if (timeLeft <= 0) {
            takePhoto();
            return;
        }
    } else {
        isPalmOpen = false;
        statusDiv.innerText = "Gerakan tangan 'Open Palm' untuk mengambil foto.";
    }
    
    requestAnimationFrame(predictWebcam);
}

function takePhoto() {
    photoTaken = true;
    statusDiv.innerText = "Foto diambil!";
    
    const photoCanvas = document.createElement('canvas');
    photoCanvas.width = video.videoWidth;
    photoCanvas.height = video.videoHeight;
    photoCanvas.getContext('2d').drawImage(video, 0, 0, photoCanvas.width, photoCanvas.height);
    
    const imageDataURL = photoCanvas.toDataURL('image/png');
    
    capturedImage.src = imageDataURL;
    capturedSection.style.display = 'flex';
    
    downloadLink.href = imageDataURL;
    
    document.getElementById('camera-view').style.display = 'none';
    statusDiv.style.display = 'none';
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

initializeApp();
