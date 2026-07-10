import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Upload } from 'lucide-react';
import { Button } from '../Button';

// Live selfie / liveness capture. Uses the front camera via getUserMedia, grabs
// a frame to a canvas, and hands back a JPEG Blob. The frame lives only in
// memory and is streamed to the provider; it is never uploaded to our storage.
// Falls back to a file input when the camera is unavailable or denied.
export function LivenessCapture({
  blob,
  onBlob,
}: {
  blob: Blob | null;
  onBlob: (b: Blob | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!blob) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }

  // Always release the camera when the component goes away.
  useEffect(() => () => stop(), []);

  async function start() {
    setDenied(false);
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      setDenied(true);
    } finally {
      setStarting(false);
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 480;
    const h = video.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (b) => {
        if (b) {
          onBlob(b);
          stop();
        }
      },
      'image/jpeg',
      0.85,
    );
  }

  // Captured — show the frozen selfie with a retake control.
  if (blob) {
    return (
      <div className="rounded-control border border-hairline bg-paper p-3">
        <div className="flex items-center gap-3">
          {preview && (
            <img src={preview} alt="" aria-hidden className="h-16 w-16 rounded-control object-cover" />
          )}
          <p className="flex-1 text-[13px] font-medium text-accent-deep">Selfie captured</p>
          <button
            type="button"
            onClick={() => onBlob(null)}
            aria-label="Retake selfie"
            className="grid h-8 w-8 place-items-center rounded-control text-slate hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <RefreshCw size={16} aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  // Camera denied / unavailable — fall back to a selfie file upload.
  if (denied) {
    return (
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-control border border-dashed border-hairline-strong bg-mist p-6 text-center transition hover:border-accent">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-tint text-accent">
          <Upload size={20} aria-hidden />
        </span>
        <span className="text-[14px] font-medium text-ink">Add a selfie</span>
        <span className="text-[12px] text-fog">Camera unavailable. Upload a photo of your face.</span>
        <input
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onBlob(f);
          }}
        />
      </label>
    );
  }

  // Live view / start.
  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-control bg-carbon">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {!active && (
          <div className="absolute inset-0 grid place-items-center bg-carbon/85 text-panel-muted">
            <div className="text-center">
              <Camera size={28} className="mx-auto text-signal" aria-hidden />
              <p className="mt-2 text-[13px]">Center your face in the frame</p>
            </div>
          </div>
        )}
      </div>
      {active ? (
        <Button className="w-full" onClick={capture}>
          <Camera size={18} aria-hidden /> Capture selfie
        </Button>
      ) : (
        <Button className="w-full" disabled={starting} onClick={start}>
          {starting ? 'Starting camera' : 'Start camera'}
        </Button>
      )}
    </div>
  );
}
