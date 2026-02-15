import { useState, useRef, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

class VelocityTracker {
  constructor(windowSize = 5, fps = 30.0) {
    this.windowSize = windowSize;
    this.fps = fps;
    this.frameTime = 1.0 / fps;
    this.positionHistory = { left: [], right: [] };
    this.timeHistory = [];
    this.velocityHistory = { left: [], right: [] };
    this.accelerationHistory = { left: [], right: [] };
  }

  update(leftPos, rightPos, timestamp) {
    const left2d = [leftPos[0], leftPos[1]];
    const right2d = [rightPos[0], rightPos[1]];

    if (this.positionHistory.left.length >= 1) {
      const prevTime = this.timeHistory[this.timeHistory.length - 1];
      let dt = (timestamp - prevTime) / 1000.0;
      if (dt < 0.001) dt = this.frameTime;

      if (dt > 0.001) {
        const prevLeft = this.positionHistory.left[this.positionHistory.left.length - 1];
        const prevRight = this.positionHistory.right[this.positionHistory.right.length - 1];
        const leftVel = [(left2d[0] - prevLeft[0]) / dt, (left2d[1] - prevLeft[1]) / dt];
        const rightVel = [(right2d[0] - prevRight[0]) / dt, (right2d[1] - prevRight[1]) / dt];

        if (this.velocityHistory.left.length >= 1) {
          const prevLV = this.velocityHistory.left[this.velocityHistory.left.length - 1];
          const prevRV = this.velocityHistory.right[this.velocityHistory.right.length - 1];
          const leftAccel = [(leftVel[0] - prevLV[0]) / dt, (leftVel[1] - prevLV[1]) / dt];
          const rightAccel = [(rightVel[0] - prevRV[0]) / dt, (rightVel[1] - prevRV[1]) / dt];
          this._push(this.accelerationHistory.left, leftAccel);
          this._push(this.accelerationHistory.right, rightAccel);
        }

        this._push(this.velocityHistory.left, leftVel);
        this._push(this.velocityHistory.right, rightVel);
      }
    }

    this._push(this.positionHistory.left, left2d);
    this._push(this.positionHistory.right, right2d);
    this._push(this.timeHistory, timestamp);
  }

  _push(arr, val) {
    arr.push(val);
    if (arr.length > this.windowSize) arr.shift();
  }

  _norm(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  }

  getPeakVelocity(hand) {
    const hist = this.velocityHistory[hand];
    if (hist.length < 1) return 0;
    let max = 0;
    for (const v of hist) {
      const s = this._norm(v);
      if (s > max) max = s;
    }
    return max;
  }

  getPeakAcceleration(hand) {
    const hist = this.accelerationHistory[hand];
    if (hist.length < 1) return 0;
    let max = 0;
    for (const a of hist) {
      const s = this._norm(a);
      if (s > max) max = s;
    }
    return max;
  }

  calculatePowerIndex(hand) {
    return this.getPeakVelocity(hand) * this.getPeakAcceleration(hand);
  }
}

function get2dDistance(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function getTorsoHeight(landmarks) {
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const shoulderMidY = (lShoulder.y + rShoulder.y) / 2;
  const lHip = landmarks[23];
  const rHip = landmarks[24];
  const hipMidY = (lHip.y + rHip.y) / 2;
  return Math.abs(hipMidY - shoulderMidY);
}

export default function useMediaPipe() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const landmarkerRef = useRef(null);

  const initLandmarker = async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 2,
    });
    landmarkerRef.current = landmarker;
    return landmarker;
  };

  const analyzeVideo = useCallback(async (videoFile, onProgress, onImpactDetected) => {
    setIsLoading(true);
    setProgress(0);
    setError(null);

    try {
      const landmarker = await initLandmarker();
      if (onProgress) onProgress(5);
      setProgress(5);

      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      const objectUrl = URL.createObjectURL(videoFile);
      video.src = objectUrl;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error('Failed to load video'));
      });

      await new Promise((resolve) => {
        video.oncanplaythrough = resolve;
        video.load();
      });

      const duration = video.duration;
      const videoFps = 30;
      const totalVideoFrames = Math.floor(duration * videoFps);
      const MAX_FRAMES = 300;
      const frameSkip = Math.max(1, Math.ceil(totalVideoFrames / MAX_FRAMES));
      const framesToProcess = Math.min(totalVideoFrames, MAX_FRAMES);

      const canvas = document.createElement('canvas');
      canvas.width = Math.min(640, video.videoWidth);
      canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
      const ctx = canvas.getContext('2d');

      const impacts = [];
      let impactCount = 0;
      const velocityTrackers = { 0: new VelocityTracker(5, videoFps), 1: new VelocityTracker(5, videoFps) };
      const impactThreshold = 0.35;
      const minPunchSpeed = 0.015;

      const processFrame = (frameIndex) => {
        return new Promise((resolve) => {
          const actualFrame = frameIndex * frameSkip;
          const timeInSeconds = actualFrame / videoFps;
          video.currentTime = timeInSeconds;

          video.onseeked = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const timestampMs = Math.round(timeInSeconds * 1000);

            let result;
            try {
              result = landmarker.detectForVideo(canvas, timestampMs);
            } catch {
              resolve(null);
              return;
            }

            let impactData = null;

            if (result.landmarks && result.landmarks.length > 0) {
              for (let fIdx = 0; fIdx < Math.min(result.landmarks.length, 2); fIdx++) {
                const lms = result.landmarks[fIdx];
                const leftWrist = lms[15];
                const rightWrist = lms[16];
                velocityTrackers[fIdx].update(
                  [leftWrist.x, leftWrist.y],
                  [rightWrist.x, rightWrist.y],
                  timestampMs
                );
              }

              if (result.landmarks.length >= 2) {
                for (let fighterIdx = 0; fighterIdx < 2 && !impactData; fighterIdx++) {
                  const opponentIdx = 1 - fighterIdx;
                  const fighterLms = result.landmarks[fighterIdx];
                  const opponentLms = result.landmarks[opponentIdx];

                  let torsoHeight;
                  try {
                    torsoHeight = getTorsoHeight(opponentLms);
                  } catch {
                    continue;
                  }
                  if (torsoHeight < 0.01) continue;

                  const leftWrist = fighterLms[15];
                  const rightWrist = fighterLms[16];
                  const headLandmarks = [0, 7, 8];

                  const leftPeakVel = velocityTrackers[fighterIdx].getPeakVelocity('left');
                  const rightPeakVel = velocityTrackers[fighterIdx].getPeakVelocity('right');

                  for (const headIdx of headLandmarks) {
                    const headLm = opponentLms[headIdx];

                    const leftDist = get2dDistance(leftWrist, headLm) / torsoHeight;
                    if (leftDist < impactThreshold && leftPeakVel > minPunchSpeed) {
                      const motionIntensity = Math.min(1.0, leftPeakVel / 0.15);
                      const leftAccel = velocityTrackers[fighterIdx].getPeakAcceleration('left');
                      const leftPower = velocityTrackers[fighterIdx].calculatePowerIndex('left');
                      impactCount++;
                      const frameImage = canvas.toDataURL('image/jpeg', 0.7);
                      impactData = {
                        id: impactCount,
                        fighter: fighterIdx + 1,
                        hand: 'LEFT',
                        frame: frameIndex,
                        time: timeInSeconds,
                        velocity: leftPeakVel / torsoHeight,
                        acceleration: leftAccel / torsoHeight,
                        motionIntensity,
                        powerIndex: leftPower / (torsoHeight * torsoHeight),
                        frameImage,
                      };
                      break;
                    }

                    const rightDist = get2dDistance(rightWrist, headLm) / torsoHeight;
                    if (rightDist < impactThreshold && rightPeakVel > minPunchSpeed) {
                      const motionIntensity = Math.min(1.0, rightPeakVel / 0.15);
                      const rightAccel = velocityTrackers[fighterIdx].getPeakAcceleration('right');
                      const rightPower = velocityTrackers[fighterIdx].calculatePowerIndex('right');
                      impactCount++;
                      const frameImage = canvas.toDataURL('image/jpeg', 0.7);
                      impactData = {
                        id: impactCount,
                        fighter: fighterIdx + 1,
                        hand: 'RIGHT',
                        frame: frameIndex,
                        time: timeInSeconds,
                        velocity: rightPeakVel / torsoHeight,
                        acceleration: rightAccel / torsoHeight,
                        motionIntensity,
                        powerIndex: rightPower / (torsoHeight * torsoHeight),
                        frameImage,
                      };
                      break;
                    }
                  }
                }
              }
            }

            resolve(impactData);
          };
        });
      };

      for (let i = 0; i < framesToProcess; i++) {
        const impactData = await processFrame(i);
        if (impactData) {
          impacts.push(impactData);
          if (onImpactDetected) onImpactDetected(impactData);
        }

        const pct = Math.round(5 + (i / framesToProcess) * 90);
        setProgress(pct);
        if (onProgress && i % 5 === 0) onProgress(pct);

        await new Promise((r) => setTimeout(r, 0));
      }

      URL.revokeObjectURL(objectUrl);

      setProgress(100);
      if (onProgress) onProgress(100);
      setIsLoading(false);

      return {
        impacts,
        totalFrames: framesToProcess,
        duration,
        fps: videoFps,
      };
    } catch (err) {
      setError(err.message || 'Analysis failed');
      setIsLoading(false);
      throw err;
    }
  }, []);

  return { analyzeVideo, isLoading, progress, error };
}
