"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, IdCard, Image, Loader2, X } from "lucide-react";
import { toast } from "@/lib/toast";

import ImageUploader from "@/components/imgs/ImageUploader";
import { createClient } from "@/utils/supabase/client";

import { actualizarCampoDpiAction, type CampoDpi } from "./actions/dpi";
import type { Afiliado } from "./esquemas";
import { generarDpiImg, generarDpiPdf } from "./utils/generarDpiPdf";

const BUCKET = "dpis";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  afiliado: Afiliado | null;
  onSaved?: () => void;
}

interface MutacionPayload {
  campo: CampoDpi;
  path: string | null;
}

export default function GestionDpiModal({
  isOpen,
  onClose,
  afiliado,
  onSaved,
}: Props) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const [frontalPath, setFrontalPath] = useState<string | null>(
    afiliado?.dpi_frontal_url ?? null,
  );
  const [reversoPath, setReversoPath] = useState<string | null>(
    afiliado?.dpi_reverso_url ?? null,
  );

  useEffect(() => {
    setFrontalPath(afiliado?.dpi_frontal_url ?? null);
    setReversoPath(afiliado?.dpi_reverso_url ?? null);
  }, [afiliado?.id, afiliado?.dpi_frontal_url, afiliado?.dpi_reverso_url]);

  const mutation = useMutation({
    mutationFn: async ({ campo, path }: MutacionPayload) => {
      if (!afiliado) throw new Error("Afiliado no definido.");
      const result = await actualizarCampoDpiAction(afiliado.id, campo, path);
      if (result.error) throw new Error(result.error);
      return { campo, path };
    },
    onSuccess: ({ campo, path }) => {
      if (campo === "dpi_frontal_url") setFrontalPath(path);
      else setReversoPath(path);

      queryClient.invalidateQueries({ queryKey: ["afiliados-lider"] });
      queryClient.invalidateQueries({ queryKey: ["afiliados-gl"] });
      onSaved?.();
      const lado = campo === "dpi_frontal_url" ? "frontal" : "reverso";
      toast.success(
        path
          ? `DPI ${lado} actualizado correctamente.`
          : `DPI ${lado} eliminado.`,
      );
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "No se pudo actualizar el DPI.");
    },
  });

  const buildSignedUrl = async (path: string | null | undefined) => {
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10);
    if (error) {
      console.warn("No se pudo crear signed URL:", error.message);
      return null;
    }
    return data.signedUrl;
  };

  const handleDownloadPdf = async () => {
    if (!afiliado) return;
    try {
      const [frontal, reverso] = await Promise.all([
        buildSignedUrl(frontalPath),
        buildSignedUrl(reversoPath),
      ]);
      await generarDpiPdf(afiliado, { frontal, reverso });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No se pudo generar el PDF.";
      toast.error(message);
    }
  };

  const handleDownloadImg = async () => {
    if (!afiliado) return;
    try {
      const [frontal, reverso] = await Promise.all([
        buildSignedUrl(frontalPath),
        buildSignedUrl(reversoPath),
      ]);
      await generarDpiImg(afiliado, { frontal, reverso });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No se pudo generar la imagen.";
      toast.error(message);
    }
  };

  const isMutating = mutation.isPending;
  const tieneAlgunDpi = !!frontalPath || !!reversoPath;

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[60]"
        onClose={() => !isMutating && onClose()}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-0 sm:p-6">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full h-full sm:h-fit sm:max-w-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 sm:rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[90vh] border-0 sm:border border-gray-200 dark:border-neutral-800">
              <div className="sticky top-0 z-20 shrink-0 flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between px-3 md:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:py-4 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
                <div className="order-2 sm:order-1 w-full sm:w-auto min-w-0 text-center sm:text-left">
                  {afiliado && (
                    <div className="flex flex-col">
                      <h2 className="text-sm md:text-base font-black text-gray-900 dark:text-gray-100 uppercase break-words sm:truncate">
                        {afiliado.nombres} {afiliado.apellidos}
                      </h2>
                      <p className="text-[11px] md:text-xs text-gray-500 dark:text-neutral-400 font-mono font-bold tracking-wider mt-0.5">
                        DPI: {afiliado.dpi}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => !isMutating && onClose()}
                  disabled={isMutating}
                  className="order-1 sm:order-2 shrink-0 bg-transparent border-0 p-0 cursor-pointer text-sm font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline underline-offset-2 decoration-red-600/90 hover:decoration-red-700 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cerrar
                </button>
              </div>

              <div className="relative flex-1 min-h-0 p-4 md:p-5 overflow-y-auto bg-white dark:bg-neutral-900">
                {afiliado && (
                  <div className="grid grid-cols-1 gap-6 max-w-xl mx-auto w-full">
                    <section className="flex flex-col gap-2">
                      <ImageUploader
                        label="Frontal"
                        bucketName={BUCKET}
                        currentImagePath={frontalPath}
                        enableImageLoupe
                        captureOverlay="front"
                        onUploadSuccess={async (newPath) => {
                          await mutation.mutateAsync({
                            campo: "dpi_frontal_url",
                            path: newPath,
                          });
                        }}
                        onDeleteSuccess={async () => {
                          await mutation.mutateAsync({
                            campo: "dpi_frontal_url",
                            path: null,
                          });
                        }}
                        disabled={isMutating}
                      />
                    </section>

                    <section className="flex flex-col gap-2">
                      <ImageUploader
                        label="Reverso"
                        bucketName={BUCKET}
                        currentImagePath={reversoPath}
                        enableImageLoupe
                        captureOverlay="back"
                        onUploadSuccess={async (newPath) => {
                          await mutation.mutateAsync({
                            campo: "dpi_reverso_url",
                            path: newPath,
                          });
                        }}
                        onDeleteSuccess={async () => {
                          await mutation.mutateAsync({
                            campo: "dpi_reverso_url",
                            path: null,
                          });
                        }}
                        disabled={isMutating}
                      />
                    </section>
                  </div>
                )}

                {isMutating && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-neutral-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 z-10">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400" />
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">
                      Guardando...
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-row items-center gap-2 px-3 md:px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={!tieneAlgunDpi || isMutating}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-lg bg-transparent hover:bg-red-100 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 text-xs sm:text-sm font-black uppercase transition-colors disabled:opacity-40 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent disabled:cursor-not-allowed"
                  title={!tieneAlgunDpi ? "Sube al menos una imagen del DPI" : "Descargar PDF"}
                >
                  <Download className="w-5 h-5" />
                  Descargar PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownloadImg}
                  disabled={!tieneAlgunDpi || isMutating}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-lg bg-transparent hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-black uppercase transition-colors disabled:opacity-40 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent disabled:cursor-not-allowed"
                  title={!tieneAlgunDpi ? "Sube al menos una imagen del DPI" : "Descargar Imagen"}
                >
                  <Download className="w-5 h-5" />
                  Descargar Imagen
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
