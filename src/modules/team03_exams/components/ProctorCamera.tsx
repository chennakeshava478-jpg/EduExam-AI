import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';
import { ProctoringAnomalyType } from '../types/exams.types';

// Real in-browser AI proctoring: webcam face detection (MediaPipe BlazeFace) + microphone speech detection.
// Nothing is uploaded — video and audio are analysed locally and only anomaly events are reported.

export type ProctorAnomaly = Exclude<ProctoringAnomalyType, 'TAB_SWITCH'>;

interface ProctorCameraProps {
  onEvent: (type: ProctorAnomaly, confidence: number, snapshot?: string) => void;
}

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

const TICK_MS = 700;
const MISSING_TICKS = 5;   // ~3.5 s without a face
const MULTI_TICKS = 3;     // ~2 s with more than one face
const GAZE_TICKS = 6;      // ~4 s looking away
const SPEECH_TICKS = 4;    // ~2.8 s of sustained sound
const YAW_LIMIT = 0.55;    // nose offset / eye distance
const COOLDOWN_MS = 15000;

type Status = 'starting' | 'active' | 'no-model' | 'denied';

export const ProctorCamera: React.FC<ProctorCameraProps> = ({ onEvent }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const [status, setStatus] = useState<Status>('starting');
  const [hasMic, setHasMic] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let detector: FaceDetector | null = null;
    let timer: number | undefined;

    const lastEmit: Partial<Record<ProctorAnomaly, number>> = {};
    // Small evidence frame (kept on this device only).
    const snapshot = (): string | undefined => {
      try {
        const v = videoRef.current;
        if (!v || v.readyState < 2 || !v.videoWidth) return undefined;
        const c = document.createElement('canvas');
        c.width = 240;
        c.height = Math.round((240 * v.videoHeight) / v.videoWidth);
        c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.55);
      } catch { return undefined; }
    };

    const emit = (type: ProctorAnomaly, confidence: number) => {
      const now = Date.now();
      if (now - (lastEmit[type] || 0) < COOLDOWN_MS) return;
      lastEmit[type] = now;
      onEventRef.current(type, Math.round(Math.min(0.99, Math.max(0.5, confidence)) * 100) / 100, snapshot());
    };

    const start = async () => {
      // 1. Camera (+ microphone if allowed)
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: true });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } });
          if (!cancelled) setHasMic(false);
        } catch {
          if (!cancelled) setStatus('denied');
          return;
        }
      }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play().catch(() => undefined);
      }

      // 2. Microphone level analyser
      let analyser: AnalyserNode | null = null;
      const buf = new Uint8Array(512);
      if (stream.getAudioTracks().length) {
        try {
          audioCtx = new AudioContext();
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          audioCtx.createMediaStreamSource(stream).connect(analyser);
        } catch { analyser = null; }
      } else if (!cancelled) {
        setHasMic(false);
      }

      // 3. Face detector (needs internet once to fetch the model)
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        try {
          detector = await FaceDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' }, runningMode: 'VIDEO', minDetectionConfidence: 0.5
          });
        } catch {
          detector = await FaceDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' }, runningMode: 'VIDEO', minDetectionConfidence: 0.5
          });
        }
      } catch {
        detector = null;
      }
      if (cancelled) { detector?.close(); return; }
      setStatus(detector ? 'active' : 'no-model');

      // 4. Monitoring loop
      let missing = 0, multi = 0, gaze = 0, speech = 0;
      let baseline = 0, baselineSamples = 0;

      timer = window.setInterval(() => {
        const v = videoRef.current;

        if (detector && v && v.readyState >= 2) {
          try {
            const { detections } = detector.detectForVideo(v, performance.now());
            const n = detections.length;

            missing = n === 0 ? missing + 1 : 0;
            multi = n > 1 ? multi + 1 : 0;

            let yawBad = false;
            let yaw = 0;
            if (n === 1) {
              const k = detections[0].keypoints;
              if (k && k.length >= 3) {
                const eyeDist = Math.abs(k[0].x - k[1].x);
                if (eyeDist > 0.02) {
                  yaw = (k[2].x - (k[0].x + k[1].x) / 2) / eyeDist;
                  yawBad = Math.abs(yaw) > YAW_LIMIT;
                }
              }
            }
            gaze = yawBad ? gaze + 1 : 0;

            if (missing >= MISSING_TICKS) { emit('MISSING_FACE', 0.9); missing = 0; }
            if (multi >= MULTI_TICKS) { emit('MULTIPLE_FACES', detections[1]?.categories?.[0]?.score ?? 0.9); multi = 0; }
            if (gaze >= GAZE_TICKS) { emit('GAZE_DEVIATION', 0.6 + Math.min(0.35, Math.abs(yaw) / 3)); gaze = 0; }
          } catch { /* a dropped frame is not an anomaly */ }
        }

        if (analyser) {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x; }
          const rms = Math.sqrt(sum / buf.length);
          if (baselineSamples < 5) { baseline = (baseline * baselineSamples + rms) / (baselineSamples + 1); baselineSamples++; }
          else {
            const limit = Math.max(0.08, baseline * 3);
            speech = rms > limit ? speech + 1 : Math.max(0, speech - 1);
            if (speech >= SPEECH_TICKS) { emit('BACKGROUND_SPEECH', 0.6 + Math.min(0.35, rms)); speech = 0; }
          }
        }
      }, TICK_MS);
    };

    start();

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      stream?.getTracks().forEach(t => t.stop());
      audioCtx?.close().catch(() => undefined);
      detector?.close();
    };
  }, []);

  const label =
    status === 'active' ? 'AI proctoring active' :
    status === 'starting' ? 'Starting camera…' :
    status === 'no-model' ? 'Camera on · face AI unavailable' :
    'Camera blocked — allow access';
  const dot = status === 'active' ? 'bg-emerald-400' : status === 'denied' ? 'bg-red-500' : 'bg-amber-400';

  return (
    <div className="fixed bottom-4 right-4 z-50 w-40 rounded-lg overflow-hidden border border-gray-300 shadow-lg bg-black">
      <video ref={videoRef} muted playsInline className="w-full h-28 object-cover scale-x-[-1] bg-black" />
      <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 text-[10px] text-white">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="truncate">{label}{!hasMic && status !== 'denied' ? ' · no mic' : ''}</span>
      </div>
    </div>
  );
};
