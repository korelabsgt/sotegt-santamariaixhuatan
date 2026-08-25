"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X } from "lucide-react";
import { DPI_RATIO, type DpiSide } from "@/lib/dpiLayout";
import DpiLayoutOverlay from "./DpiLayoutOverlay";

interface Props {
  open: boolean;
  lado: DpiSide;
  onCapture: (file: File) => void;
  onClose: () => void;
  onFallback: () => void;
}

function mapCardToVideo(
  video: HTMLVideoElement,
  card: DOMRect,
): { sx: number; sy: number; sw: number; sh: number } | null {
  const videoRect = video.getBoundingClientRect();
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh || videoRect.width < 2 || videoRect.height < 2) return null;

  const scale = Math.max(videoRect.width / vw, videoRect.height / vh);
  const renderedW = vw * scale;
  const renderedH = vh * scale;
  const offsetX = (videoRect.width - renderedW) / 2;
  const offsetY = (videoRect.height - renderedH) / 2;

  const relX = card.left - videoRect.left;
  const relY = card.top - videoRect.top;

  let sx = (relX - offsetX) / scale;
  let sy = (relY - offsetY) / scale;
  let sw = card.width / scale;
  let sh = card.height / scale;

  sx = Math.max(0, Math.min(sx, vw));
  sy = Math.max(0, Math.min(sy, vh));
  sw = Math.max(1, Math.min(sw, vw - sx));
  sh = Math.max(1, Math.min(sh, vh - sy));

  return { sx, sy, sw, sh };
}

export default function DpiCameraCapture({
  open,
  lado,
  onCapture,
  onClose,
  onFallback,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      return;
    }

    let cancelled = false;
    setError(null);

    const start = async () => {
      stopStream();
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("unsupported");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
      } catch {
        if (cancelled) return;
        setError("No se pudo abrir la cámara.");
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, facingMode, stopStream]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleCapture = async () => {
    const video = videoRef.current;
    const cardEl = cardRef.current;
    if (!video || !cardEl || capturing) return;
    setCapturing(true);
    try {
      const mapped = mapCardToVideo(video, cardEl.getBoundingClientRect());
      if (!mapped) throw new Error("Sin recuadro");

      const outW = 1712;
      const outH = Math.round(outW / DPI_RATIO);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(
        video,
        mapped.sx,
        mapped.sy,
        mapped.sw,
        mapped.sh,
        0,
        0,
        outW,
        outH,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("No se pudo capturar."))),
          "image/jpeg",
          0.92,
        );
      });

      const file = new File([blob], `dpi-${lado}-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      stopStream();
      onCapture(file);
    } catch {
      setError("No se pudo capturar. Intenta de nuevo.");
    } finally {
      setCapturing(false);
    }
  };

  if (!open) return null;

  const titulo = lado === "front" ? "Frontal del DPI" : "Reverso del DPI";

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black text-white">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />

      <div className="absolute inset-0 flex flex-col">
        <div className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
          <p className="text-xs font-black uppercase tracking-wide">
            Encuadra el DPI · {titulo}
          </p>
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex flex-1 items-center justify-center px-3">
          <div
            ref={cardRef}
            className="relative z-10 overflow-hidden rounded-[18px]"
            style={{
              width: "min(94vw, calc(58dvh * 1.586))",
              aspectRatio: `${DPI_RATIO}`,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            }}
          >
            <DpiLayoutOverlay lado={lado} />
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          {error ? (
            <p className="text-center text-xs font-bold text-red-300">
              {error}{" "}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  stopStream();
                  onFallback();
                }}
              >
                Usar cámara del sistema
              </button>
            </p>
          ) : (
            <p className="text-center text-[11px] font-semibold text-white/80">
              Encaja el documento en el recuadro. La foto del DPI debe coincidir
              con el recuadro derecho.
            </p>
          )}
          <div className="flex w-full items-center justify-center gap-10">
            <button
              type="button"
              onClick={() =>
                setFacingMode((m) =>
                  m === "environment" ? "user" : "environment",
                )
              }
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/15"
              aria-label="Cambiar cámara"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void handleCapture()}
              disabled={capturing || !!error}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[4px] border-white bg-white/20 disabled:opacity-40"
              aria-label="Capturar"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white">
                <Camera className="h-6 w-6 text-black" />
              </span>
            </button>
            <span className="h-12 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
