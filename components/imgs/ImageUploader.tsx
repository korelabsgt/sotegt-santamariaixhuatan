"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { Loader2, Upload, RefreshCw, Trash2, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/lib/toast";

import { createClient } from "@/utils/supabase/client";

import ImageEditorModal from "./ImageEditorModal";
import DpiCameraCapture from "./DpiCameraCapture";
import type { DpiSide } from "@/lib/dpiLayout";

const IMAGE_LOUPE_SCALE = 2.65;
const IMAGE_LOUPE_LEN = 168;

interface ImageLoupeProps {
  src: string;
  alt: string;
  className: string;
  inactive: boolean;
}

function mapClientToNatural(
  e: Pick<React.MouseEvent, "clientX" | "clientY">,
  imgEl: HTMLImageElement,
): { nx: number; ny: number; nw: number; nh: number; drawW: number; drawH: number } | null {
  const nw = imgEl.naturalWidth;
  const nh = imgEl.naturalHeight;
  if (!nw || !nh) return null;
  const ir = imgEl.getBoundingClientRect();
  const lw = ir.width;
  const lh = ir.height;
  if (lw < 2 || lh < 2) return null;
  const rScale = Math.min(lw / nw, lh / nh);
  const drawW = nw * rScale;
  const drawH = nh * rScale;
  const insetX = (lw - drawW) / 2;
  const insetY = (lh - drawH) / 2;
  const px = e.clientX - ir.left - insetX;
  const py = e.clientY - ir.top - insetY;
  if (px < 0 || py < 0 || px > drawW || py > drawH) return null;
  const nx = (px / drawW) * nw;
  const ny = (py / drawH) * nh;
  return { nx, ny, nw, nh, drawW, drawH };
}

function paintLoupeCanvas(
  canvas: HTMLCanvasElement,
  imgEl: HTMLImageElement,
  nx: number,
  ny: number,
  nw: number,
  nh: number,
  drawW: number,
  drawH: number,
): boolean {
  const L = IMAGE_LOUPE_LEN;
  const Z = IMAGE_LOUPE_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const srcWNat = (L / Z) * (nw / drawW);
  const srcHNat = (L / Z) * (nh / drawH);
  let sx = nx - srcWNat / 2;
  let sy = ny - srcHNat / 2;
  sx = Math.max(0, Math.min(sx, nw - srcWNat));
  sy = Math.max(0, Math.min(sy, nh - srcHNat));
  const dprRaw = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  const dpr = Math.min(Math.max(dprRaw, 1), 2.75);
  canvas.width = Math.round(L * dpr);
  canvas.height = Math.round(L * dpr);
  canvas.style.width = `${L}px`;
  canvas.style.height = `${L}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  ctx.beginPath();
  ctx.arc(L / 2, L / 2, L / 2, 0, Math.PI * 2);
  ctx.clip();
  try {
    ctx.drawImage(imgEl, sx, sy, srcWNat, srcHNat, 0, 0, L, L);
  } catch {
    ctx.restore();
    return false;
  }
  ctx.restore();
  return true;
}

function ImageLoupePreview({
  src,
  alt,
  className,
  inactive,
}: ImageLoupeProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ mx: 0, my: 0 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (inactive) {
      setActive(false);
      return;
    }
    const imgEl = imgRef.current;
    const wrapEl = wrapRef.current;
    const cav = canvasRef.current;
    if (!imgEl || !wrapEl || !cav) return;
    const mapped = mapClientToNatural(e, imgEl);
    if (!mapped) {
      setActive(false);
      return;
    }
    const wr = wrapEl.getBoundingClientRect();
    setPos({ mx: e.clientX - wr.left, my: e.clientY - wr.top });
    const ok = paintLoupeCanvas(
      cav,
      imgEl,
      mapped.nx,
      mapped.ny,
      mapped.nw,
      mapped.nh,
      mapped.drawW,
      mapped.drawH,
    );
    setActive(ok);
  };

  const onLeave = () => setActive(false);

  return (
    <div
      ref={wrapRef}
      role="presentation"
      className="relative mx-auto flex w-full min-h-[160px] max-h-[260px] items-center justify-center"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        cursor: inactive ? undefined : active ? "none" : "zoom-in",
      }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        className={`${className} pointer-events-none max-h-[260px] select-none`}
      />
      {!inactive && (
        <div
          className={`pointer-events-none absolute z-20 rounded-full border-[3px] border-white shadow-[0_12px_32px_rgba(0,0,0,0.35)] ring-1 ring-black/20 transition-opacity duration-150 ${
            active ? "opacity-100" : "opacity-0"
          }`}
          style={{
            width: IMAGE_LOUPE_LEN,
            height: IMAGE_LOUPE_LEN,
            left: Math.round(pos.mx - IMAGE_LOUPE_LEN / 2),
            top: Math.round(pos.my - IMAGE_LOUPE_LEN / 2),
            overflow: "hidden",
          }}
        >
          <canvas ref={canvasRef} className="block size-full" aria-hidden />
        </div>
      )}
    </div>
  );
}

interface Props {
  bucketName: string;
  currentImagePath: string | null;
  onUploadSuccess: (newPath: string) => void | Promise<void>;
  onDeleteSuccess: () => void | Promise<void>;
  disabled?: boolean;
  signedUrlExpiresIn?: number;
  enableImageLoupe?: boolean;
  label?: string;
  captureOverlay?: DpiSide;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const COMPRESSION_OPTS = {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
} as const;

export default function ImageUploader({
  bucketName,
  currentImagePath,
  onUploadSuccess,
  onDeleteSuccess,
  disabled = false,
  signedUrlExpiresIn = 60 * 60,
  enableImageLoupe = false,
  label,
  captureOverlay,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchSignedUrl = async () => {
      if (!currentImagePath) {
        setPreviewUrl(null);
        return;
      }
      setPreviewLoading(true);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(currentImagePath, signedUrlExpiresIn);
      if (cancelled) return;
      if (error) {
        console.warn("No se pudo crear signed URL:", error.message);
        setPreviewUrl(null);
      } else {
        setPreviewUrl(data.signedUrl);
      }
      setPreviewLoading(false);
    };
    fetchSignedUrl();
    return () => {
      cancelled = true;
    };
  }, [currentImagePath, bucketName, supabase, signedUrlExpiresIn]);

  const isLocked = disabled || isProcessing;

  const buildUniqueName = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const rand = Math.random().toString(36).slice(2, 10);
    return `${Date.now()}-${rand}.${ext}`;
  };

  const removeFromStorage = async (path: string) => {
    const { error } = await supabase.storage.from(bucketName).remove([path]);
    if (error) {
      console.warn("No se pudo eliminar el archivo previo:", error.message);
    }
  };

  const triggerSelect = () => {
    if (isLocked) return;
    inputRef.current?.click();
  };

  const triggerCamera = () => {
    if (isLocked) return;
    if (captureOverlay) {
      setCameraOpen(true);
      return;
    }
    cameraRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      toast.error("Formato no permitido. Use JPG, PNG o WEBP.");
      return;
    }

    setEditingFile(file);
  };

  const uploadEditedFile = async (edited: File) => {
    setIsProcessing(true);
    let uploadedPath: string | null = null;

    try {
      const compressed = await imageCompression(edited, {
        ...COMPRESSION_OPTS,
        fileType: edited.type,
      });

      const newPath = buildUniqueName(
        compressed instanceof File ? compressed : edited,
      );

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(newPath, compressed, {
          cacheControl: "3600",
          upsert: false,
          contentType: edited.type,
        });

      if (uploadError) throw uploadError;
      uploadedPath = newPath;

      if (currentImagePath) await removeFromStorage(currentImagePath);

      await onUploadSuccess(newPath);
      setEditingFile(null);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Error al subir la imagen.";
      console.error(e);
      toast.error(message);
      if (uploadedPath) await removeFromStorage(uploadedPath);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!currentImagePath || isLocked) return;
    setIsProcessing(true);
    try {
      await removeFromStorage(currentImagePath);
      await onDeleteSuccess();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Error al eliminar la imagen.";
      console.error(e);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <header className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black uppercase text-gray-700 dark:text-neutral-300">
            {label}
          </h3>
          {currentImagePath ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              disabled={isLocked}
              className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 gap-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 hover:text-red-900 dark:hover:text-red-300 text-xs font-black uppercase transition-colors disabled:opacity-40"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Eliminar
            </button>
          ) : (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400">
              Pendiente
            </span>
          )}
        </header>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      {currentImagePath ? (
        <div className="flex flex-col">
          <div className="group relative flex min-h-[160px] max-h-[260px] w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-700 bg-white">
            {previewLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            ) : previewUrl ? (
              enableImageLoupe ? (
                <ImageLoupePreview
                  src={previewUrl}
                  alt="Imagen subida"
                  className="max-h-[260px] w-auto object-contain transition-transform duration-700"
                  inactive={isLocked || previewLoading}
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Imagen subida"
                  className="max-h-[260px] w-auto object-contain transition-transform duration-700"
                />
              )
            ) : (
              <p className="text-xs text-gray-400 dark:text-neutral-500 font-bold uppercase px-4 text-center">
                No se pudo cargar la vista previa.
              </p>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="w-full border-2 border-dashed border-gray-300 dark:border-neutral-600 rounded-lg py-8 px-4 flex flex-col items-center justify-center gap-4 bg-transparent dark:bg-neutral-900/40">
          {isProcessing ? (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-bold uppercase text-gray-500 dark:text-neutral-400">Procesando...</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase text-gray-400 dark:text-neutral-500">Selecciona una opción</p>
              <div className="flex gap-4 w-full">
                <button
                  type="button"
                  onClick={triggerSelect}
                  disabled={isLocked}
                  className="flex-1 inline-flex flex-col items-center justify-center gap-3 py-6 rounded-lg border-2 border-blue-500 dark:border-blue-600 bg-blue-50/90 dark:bg-blue-950/45 text-blue-700 dark:text-blue-400 text-xs font-black uppercase hover:bg-blue-100 dark:hover:bg-blue-950/65 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-none"
                >
                  <Upload className="w-8 h-8" />
                  Galería
                </button>
                <button
                  type="button"
                  onClick={triggerCamera}
                  disabled={isLocked}
                  className="flex-1 inline-flex flex-col items-center justify-center gap-3 py-6 rounded-lg border-2 border-green-500 dark:border-green-600 bg-green-50/90 dark:bg-green-950/45 text-green-700 dark:text-green-400 text-xs font-black uppercase hover:bg-green-100 dark:hover:bg-green-950/65 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-none"
                >
                  <Camera className="w-8 h-8" />
                  Cámara
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <ImageEditorModal
        file={editingFile}
        onConfirm={uploadEditedFile}
        onCancel={() => setEditingFile(null)}
        dpiOverlay={captureOverlay ?? null}
      />
      {captureOverlay && (
        <DpiCameraCapture
          open={cameraOpen}
          lado={captureOverlay}
          onCapture={(file) => {
            setCameraOpen(false);
            setEditingFile(file);
          }}
          onClose={() => setCameraOpen(false)}
          onFallback={() => {
            setCameraOpen(false);
            cameraRef.current?.click();
          }}
        />
      )}
    </div>
  );
}
