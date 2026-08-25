"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area } from "react-easy-crop";
import {
  Check,
  Loader2,
  RotateCcw,
  RotateCw,
  Square,
  ZoomIn,
} from "lucide-react";
import { toast } from "@/lib/toast";

import { getCroppedFile } from "./cropImage";
import DpiPhotoGuide from "./DpiPhotoGuide";
import {
  DPI_MRZ_GUIDE,
  DPI_PHOTO_GUIDE,
  DPI_RATIO,
  type DpiSide,
} from "@/lib/dpiLayout";

type AspectKey = "free" | "1:1" | "4:3" | "16:9" | "85:54";

interface AspectOption {
  key: AspectKey;
  label: string;
  value: number | undefined;
}

const ASPECT_OPTIONS: AspectOption[] = [
  { key: "free", label: "Libre", value: undefined },
  { key: "85:54", label: "DPI 85x54", value: DPI_RATIO },
  { key: "4:3", label: "4:3", value: 4 / 3 },
  { key: "16:9", label: "16:9", value: 16 / 9 },
  { key: "1:1", label: "1:1", value: 1 },
];

interface Props {
  file: File | null;
  onConfirm: (file: File) => void | Promise<void>;
  onCancel: () => void;
  defaultAspect?: AspectKey;
  dpiOverlay?: DpiSide | null;
}

export default function ImageEditorModal({
  file,
  onConfirm,
  onCancel,
  defaultAspect = "85:54",
  dpiOverlay = null,
}: Props) {
  const isOpen = !!file;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const objectUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
    [objectUrl],
  );

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectKey, setAspectKey] = useState<AspectKey>(defaultAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cropWrapRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const aspectInicial = dpiOverlay ? "85:54" : defaultAspect;

  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setAspectKey(aspectInicial);
      setCroppedAreaPixels(null);
    }
  }, [isOpen, aspectInicial]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const syncPhotoGuide = useCallback(() => {
    const wrap = cropWrapRef.current;
    const guide = overlayRef.current;
    if (!wrap || !guide || !dpiOverlay) return;

    const cropArea = wrap.querySelector(
      ".reactEasyCrop_CropArea",
    ) as HTMLElement | null;
    if (!cropArea) {
      guide.style.opacity = "0";
      return;
    }

    const wrapRect = wrap.getBoundingClientRect();
    const cropRect = cropArea.getBoundingClientRect();
    const cropLeft = cropRect.left - wrapRect.left;
    const cropTop = cropRect.top - wrapRect.top;
    const cropW = cropRect.width;
    const cropH = cropRect.height;
    if (cropW < 8 || cropH < 8) {
      guide.style.opacity = "0";
      return;
    }

    const region = dpiOverlay === "front" ? DPI_PHOTO_GUIDE : DPI_MRZ_GUIDE;
    guide.style.left = `${cropLeft + cropW * region.x}px`;
    guide.style.top = `${cropTop + cropH * region.y}px`;
    guide.style.width = `${cropW * region.w}px`;
    guide.style.height = `${cropH * region.h}px`;
    guide.style.opacity = "1";
  }, [dpiOverlay]);

  useLayoutEffect(() => {
    if (!isOpen || !dpiOverlay) return;
    const wrap = cropWrapRef.current;
    if (!wrap) return;

    syncPhotoGuide();
    const ro = new ResizeObserver(syncPhotoGuide);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [isOpen, dpiOverlay, objectUrl, syncPhotoGuide]);

  const aspect = dpiOverlay
    ? DPI_RATIO
    : ASPECT_OPTIONS.find((o) => o.key === aspectKey)?.value;

  const handleCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels((prev) => {
      if (
        prev &&
        prev.x === areaPixels.x &&
        prev.y === areaPixels.y &&
        prev.width === areaPixels.width &&
        prev.height === areaPixels.height
      ) {
        return prev;
      }
      return areaPixels;
    });
  }, []);

  const handleCropCompleteWithGuide = useCallback(
    (_: Area, areaPixels: Area) => {
      handleCropComplete(_, areaPixels);
      syncPhotoGuide();
    },
    [handleCropComplete, syncPhotoGuide],
  );

  const rotate = (delta: number) =>
    setRotation((r) => {
      const next = (r + delta) % 360;
      return next < 0 ? next + 360 : next;
    });

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const handleConfirm = async () => {
    if (!file || !croppedAreaPixels) {
      toast.error("Selecciona el área a recortar.");
      return;
    }
    setIsProcessing(true);
    try {
      const cropped = await getCroppedFile(file, croppedAreaPixels, rotation);
      await onConfirm(cropped);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No se pudo recortar la imagen.";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (isProcessing) return;
    onCancel();
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={handleCancel}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95dvh] border border-gray-200 dark:border-neutral-800">
        <div className="sticky top-0 z-20 shrink-0 flex items-center justify-between px-4 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:py-3 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
          <h3 className="text-sm font-black uppercase text-gray-800 dark:text-gray-100">
            {dpiOverlay
              ? dpiOverlay === "front"
                ? "Alinea el frontal del DPI"
                : "Alinea el reverso del DPI"
              : "Editar imagen"}
          </h3>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isProcessing}
            className="shrink-0 bg-transparent border-0 p-0 cursor-pointer text-sm font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline underline-offset-2 decoration-red-600/90 hover:decoration-red-700 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cerrar
          </button>
        </div>

        <div className="relative isolate overflow-hidden bg-black h-[50vh] sm:h-[55vh] min-h-[280px] sm:min-h-[320px]">
          <div ref={cropWrapRef} className="absolute inset-0 z-0 overflow-hidden">
            {objectUrl && (
              <Cropper
                image={objectUrl}
                crop={crop}
                zoom={zoom}
                minZoom={0.1}
                maxZoom={10}
                rotation={rotation}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={handleCropCompleteWithGuide}
                onMediaLoaded={syncPhotoGuide}
                restrictPosition={false}
                showGrid={!dpiOverlay}
                style={
                  dpiOverlay
                    ? {
                        cropAreaStyle: {
                          border: "2px solid #38bdf8",
                          color: "rgba(0,0,0,0.45)",
                        },
                      }
                    : undefined
                }
              />
            )}
          </div>
          {dpiOverlay && (
            <DpiPhotoGuide
              ref={overlayRef}
              className={`pointer-events-none absolute z-30 opacity-0 ${
                dpiOverlay === "back"
                  ? "rounded-md border-[3px] border-yellow-400 bg-black/20"
                  : ""
              }`}
            />
          )}
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 flex flex-col gap-3 shrink-0">
          {dpiOverlay && (
            <p className="text-[11px] font-semibold text-gray-600 dark:text-neutral-300">
              Mueve y recorta hasta que el DPI coincida con el recuadro azul.
              {dpiOverlay === "front"
                ? " El retrato debe quedar en el marco amarillo."
                : " La zona MRZ debe quedar abajo."}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase text-gray-500 dark:text-neutral-400">
              Aspecto
            </span>
            {(dpiOverlay
              ? ASPECT_OPTIONS.filter((o) => o.key === "85:54")
              : ASPECT_OPTIONS
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setAspectKey(opt.key)}
                disabled={isProcessing}
                className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border transition shadow-none ${
                  aspectKey === opt.key
                    ? "border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/45"
                    : "border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-neutral-400 bg-white/70 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-neutral-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <ZoomIn className="w-4 h-4 text-gray-500 dark:text-neutral-400 shrink-0" />
              <input
                type="range"
                min={0.1}
                max={10}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                disabled={isProcessing}
                className="w-full accent-blue-600 dark:accent-blue-500"
              />
              <span className="text-[10px] font-bold w-10 text-right text-gray-600 dark:text-neutral-300">
                {zoom.toFixed(2)}x
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => rotate(-90)}
                disabled={isProcessing}
                title="Rotar -90°"
                className="p-2 rounded-md border border-gray-300 dark:border-neutral-600 bg-white/70 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => rotate(90)}
                disabled={isProcessing}
                title="Rotar +90°"
                className="p-2 rounded-md border border-gray-300 dark:border-neutral-600 bg-white/70 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-bold w-10 text-center text-gray-600 dark:text-neutral-300">
                {rotation.toFixed(1)}°
              </span>
              <button
                type="button"
                onClick={reset}
                disabled={isProcessing}
                title="Restablecer"
                className="p-2 rounded-md border border-gray-300 dark:border-neutral-600 bg-white/70 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
              >
                <Square className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-stretch gap-2 px-4 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 rounded-md border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 text-xs font-bold uppercase bg-white/70 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-neutral-800 transition disabled:opacity-50 shadow-none"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing || !croppedAreaPixels}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/45 text-xs font-bold uppercase hover:bg-blue-100 dark:hover:bg-blue-950/65 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-none"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isProcessing ? "Procesando..." : "Aplicar y subir"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
