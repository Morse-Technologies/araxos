/** What can stop the camera, in the words the person needs. Kept pure so it is unit-tested. */
export type CameraProblem = "insecure" | "unsupported" | "denied" | "no_camera" | "busy" | "failed";

export const cameraProblemText: Record<CameraProblem, { title: string; help: string }> = {
  insecure: { title: "The camera needs a secure connection", help: "Browsers only open the camera over HTTPS or on localhost. Ask IT to serve Araxos over HTTPS, or attach a photo file." },
  unsupported: { title: "This browser cannot open a camera", help: "Attach a photo file instead, or use a current Edge, Chrome or Firefox." },
  denied: { title: "Camera access is blocked", help: "Allow the camera for this site from the icon in the address bar (or the kiosk policy), then try again." },
  no_camera: { title: "No camera found", help: "Plug in a camera and try again, or attach a photo file." },
  busy: { title: "The camera is in use", help: "Another app or tab is using it. Close it and try again." },
  failed: { title: "The camera did not start", help: "Try again, or attach a photo file." },
};

/** Checks that fail before asking for permission. */
export function cameraPrecheck(env: { secure: boolean; hasGetUserMedia: boolean }): CameraProblem | null {
  if (!env.secure) return "insecure";
  if (!env.hasGetUserMedia) return "unsupported";
  return null;
}

/** Maps a getUserMedia rejection (a DOMException name) to a problem. */
export function cameraProblem(e: unknown): CameraProblem {
  const name = e instanceof Error || (typeof e === "object" && e && "name" in e) ? String((e as { name: unknown }).name) : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") return "no_camera";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "busy";
  return "failed";
}

export const THUMB_WIDTH = 320;
export const THUMB_QUALITY = 0.72;

/** A small JPEG of the frame for the evidence list and the verifier; the full frame stays a Blob for upload. */
export function grabFrame(video: HTMLVideoElement): { thumb: string; full: Promise<Blob | null> } {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  const full = document.createElement("canvas");
  full.width = w; full.height = h;
  full.getContext("2d")!.drawImage(video, 0, 0, w, h);
  const small = document.createElement("canvas");
  small.width = THUMB_WIDTH; small.height = Math.round((THUMB_WIDTH * h) / w);
  small.getContext("2d")!.drawImage(full, 0, 0, small.width, small.height);
  return { thumb: small.toDataURL("image/jpeg", THUMB_QUALITY), full: new Promise((r) => full.toBlob(r, "image/jpeg", 0.9)) };
}

/** A small JPEG of a picked image file, for the same thumbnail. */
export function thumbFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = THUMB_WIDTH; c.height = Math.round((THUMB_WIDTH * img.naturalHeight) / (img.naturalWidth || 1));
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", THUMB_QUALITY));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("not an image")); };
    img.src = url;
  });
}
