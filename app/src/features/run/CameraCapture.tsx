"use client";
import { Camera, CameraOff, ImageUp, RotateCcw, SwitchCamera } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cameraPrecheck, cameraProblem, cameraProblemText, grabFrame, thumbFromFile, type CameraProblem } from "@/lib/camera";
import { Button, Halftone, Select, Spinner } from "@/ui/atoms";

type State =
  | { kind: "starting" }
  | { kind: "live"; cameras: MediaDeviceInfo[]; deviceId: string | null }
  | { kind: "shot"; thumb: string }
  | { kind: "problem"; problem: CameraProblem };

/**
 * The webcam or the terminal's USB camera via getUserMedia: live preview, one frame, retake or use it.
 * It asks only when the sheet opens on this tab, stops the camera as soon as it closes, and when the camera
 * cannot open (insecure page, permission blocked, no camera, in use) it says why and offers a photo file.
 */
export function CameraCapture({ busy, onUse, onSimulate }: { busy: boolean; onUse: (thumb: string) => void; onSimulate: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<State>({ kind: "starting" });
  const [attempt, setAttempt] = useState(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pre = cameraPrecheck({ secure: window.isSecureContext, hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia });
    const open = pre
      ? Promise.reject(Object.assign(new Error(pre), { name: pre }))
      : navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
      });
    open.then(async (s) => {
      if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
      stream.current = s;
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
      const cameras = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
      if (!cancelled) setState({ kind: "live", cameras, deviceId: s.getVideoTracks()[0]?.getSettings().deviceId ?? null });
    }).catch((e: unknown) => {
      if (cancelled) return;
      const name = (e as { name?: string }).name;
      setState({ kind: "problem", problem: name === "insecure" || name === "unsupported" ? name : cameraProblem(e) });
    });
    return () => { cancelled = true; stop(); };
  }, [attempt, deviceId, stop]);

  const retry = () => { setState({ kind: "starting" }); setAttempt((n) => n + 1); };
  const shoot = () => {
    if (!video.current) return;
    const { thumb } = grabFrame(video.current);
    stop();
    setState({ kind: "shot", thumb });
  };
  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    try { setState({ kind: "shot", thumb: await thumbFromFile(f) }); } catch { setState({ kind: "problem", problem: "failed" }); }
  };

  const fileInput = (
    <label className="inline-flex cursor-pointer items-center gap-2 text-small underline">
      <ImageUp className="size-4" aria-hidden />Attach a photo file
      <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void pickFile(e.target.files?.[0])} />
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-card bg-raised">
        {state.kind === "shot" ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local data URL, not a remote image
          <img src={state.thumb} alt="The photo you took" className="size-full object-cover" />
        ) : (
          <video ref={video} muted playsInline aria-label="Camera preview" className={state.kind === "live" ? "size-full object-cover" : "hidden"} />
        )}
        {state.kind === "starting" && <span className="flex items-center gap-2 text-small text-muted"><Spinner />Opening the camera…</span>}
        {state.kind === "problem" && (
          <>
            <Halftone className="absolute inset-0 opacity-30" />
            <div role="alert" className="relative flex max-w-[34ch] flex-col items-center gap-2 px-4 text-center">
              <CameraOff className="size-6 text-muted" aria-hidden />
              <p className="text-body font-medium">{cameraProblemText[state.problem].title}</p>
              <p className="text-small text-muted">{cameraProblemText[state.problem].help}</p>
            </div>
          </>
        )}
      </div>
      {state.kind === "live" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="lg" data-main-action onClick={shoot}><Camera />Take photo</Button>
          {state.cameras.length > 1 && (
            <label className="ml-auto flex items-center gap-2 text-small text-muted"><SwitchCamera className="size-4" aria-hidden />
              <Select aria-label="Camera" value={state.deviceId ?? ""} onChange={(e) => { setState({ kind: "starting" }); setDeviceId(e.target.value); }} className="w-48">
                {state.cameras.map((c, i) => <option key={c.deviceId || i} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>)}
              </Select>
            </label>
          )}
        </div>
      )}
      {state.kind === "shot" && (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="lg" data-main-action disabled={busy} onClick={() => onUse(state.thumb)}>Use photo</Button>
          <Button variant="ghost" size="lg" onClick={retry}><RotateCcw />Retake</Button>
        </div>
      )}
      {state.kind === "problem" && (
        <div className="flex flex-wrap items-center gap-3">
          {state.problem !== "insecure" && state.problem !== "unsupported" && <Button variant="outline" onClick={retry}><RotateCcw />Try again</Button>}
          {fileInput}
          <Button variant="ghost" size="sm" className="ml-auto" disabled={busy} onClick={onSimulate}>Use a simulated photo (demo)</Button>
        </div>
      )}
      {state.kind === "live" && fileInput}
    </div>
  );
}
