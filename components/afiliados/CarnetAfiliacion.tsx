"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Download, Printer, X } from "lucide-react";
import { toast } from "@/lib/toast";
import type { Afiliado } from "./esquemas";
import { formatearDpi } from "./contacto";
import {
  etiquetaEdadNacimiento,
  formatearFechaNacimiento,
} from "./fechaNacimiento";

interface Props {
  afiliado: Afiliado | null;
  open: boolean;
  onClose: () => void;
}

const CARNET_WIDTH_MM = 85.6;
const CARNET_HEIGHT_MM = 53.98;
const LOGO_SEDE_URL = "/images/logosede.png";
const LOGO_FALLBACK_URL = "/images/logo.png";

function slugNombreArchivo(nombre: string) {
  return (
    nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "afiliado"
  );
}

function etiquetaGenero(sexo: string | null | undefined): string {
  if (sexo === "M") return "Masculino";
  if (sexo === "F") return "Femenino";
  return sexo || "—";
}

function OndaCarnet({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 856 540"
      preserveAspectRatio="none"
      aria-hidden
    >
      <rect width="856" height="540" fill="#ffffff" />
      <path
        d="M0 455 C160 435 260 480 400 458 C520 440 620 425 856 412 L856 540 L0 540 Z"
        fill="#1d4ed8"
      />
      <path
        d="M0 468 C150 450 250 490 390 472 C520 455 630 442 856 430"
        fill="none"
        stroke="#1e3a8a"
        strokeWidth="3"
        opacity="0.4"
      />
      <path
        d="M0 480 C140 462 240 498 380 484 C520 470 640 458 856 448"
        fill="none"
        stroke="#1e40af"
        strokeWidth="2.5"
        opacity="0.35"
      />
      <path
        d="M0 450 C160 430 260 475 400 453 C520 435 620 420 856 407"
        fill="none"
        stroke="#2563eb"
        strokeWidth="4"
        opacity="0.55"
      />
      <path
        d="M400 458 C520 440 620 425 856 412 L856 540 L480 540 C440 520 410 490 400 458 Z"
        fill="#1e3a8a"
      />
      <path
        d="M460 462 C560 440 680 425 856 418 L856 540 L510 540 C475 515 450 485 460 462 Z"
        fill="#1d4ed8"
        opacity="0.95"
      />
    </svg>
  );
}

export default function CarnetAfiliacion({ afiliado, open, onClose }: Props) {
  const [generando, setGenerando] = useState(false);
  const [logoSrc, setLogoSrc] = useState(LOGO_SEDE_URL);
  const carnetRef = useRef<HTMLDivElement>(null);

  if (!afiliado) return null;

  const nombreCompleto = `${afiliado.nombres} ${afiliado.apellidos}`.trim();
  const palabrasNombre = nombreCompleto.split(/\s+/).filter(Boolean).length;
  const claseNombre =
    palabrasNombre > 4
      ? "text-[11px] md:text-xs"
      : "text-sm md:text-base";
  const dpi = afiliado.dpi || "—";
  const dpiMostrar = dpi === "—" ? "—" : formatearDpi(dpi);
  const padron =
    afiliado.empadronado && afiliado.no_padron
      ? afiliado.no_padron
      : afiliado.no_padron || "—";
  const dpiNorm = dpi.replace(/\D/g, "");
  const padronNorm = padron.replace(/\D/g, "");
  const mismoDpiPadron =
    !!dpiNorm && !!padronNorm && dpiNorm === padronNorm;
  const lugar = afiliado.lugar_nombre || "—";
  const genero = etiquetaGenero(afiliado.sexo);
  const fechaNac = formatearFechaNacimiento(afiliado.nacimiento);
  const edad = etiquetaEdadNacimiento(afiliado.nacimiento);

  const esperarImagenes = async (raiz: HTMLElement) => {
    const imgs = Array.from(raiz.querySelectorAll("img"));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          }),
      ),
    );
  };

    const capturarCarnetPng = async () => {
    const nodo = carnetRef.current;
    if (!nodo) throw new Error("No se encontró el carnet");

    await esperarImagenes(nodo);

    const rect = nodo.getBoundingClientRect();
    const ancho = Math.max(Math.round(rect.width), 320);
    const alto = Math.round(ancho * (CARNET_HEIGHT_MM / CARNET_WIDTH_MM));

    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = [
      "position:fixed",
      "left:-10000px",
      "top:0",
      "z-index:-1",
      "pointer-events:none",
      "background:#ffffff",
    ].join(";");

    const clone = nodo.cloneNode(true) as HTMLElement;
    clone.style.width = `${ancho}px`;
    clone.style.height = `${alto}px`;
    clone.style.maxWidth = "none";
    clone.style.transform = "none";
    clone.style.margin = "0";
    host.appendChild(clone);
    document.body.appendChild(host);

    try {
      await esperarImagenes(clone);
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const { toPng } = await import("html-to-image");
      return await toPng(clone, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        width: ancho,
        height: alto,
        style: {
          width: `${ancho}px`,
          height: `${alto}px`,
          transform: "none",
          margin: "0",
        },
      });
    } finally {
      host.remove();
    }
  };

  const dataUrlABlob = (dataUrl: string) => {
    const [meta, data] = dataUrl.split(",");
    const mime = meta.match(/:(.*?);/)?.[1] || "image/png";
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  const esMovil = () =>
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const esIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const abrirImagenParaGuardar = (url: string, filename: string) => {
    const win = window.open("");
    if (win) {
      win.document.write(
        `<!DOCTYPE html><html><head><title>${filename}</title><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body style="margin:0;background:#0a0a0a;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:100vh;gap:12px;font-family:system-ui,sans-serif"><img src="${url}" alt="Carnet" style="max-width:100%;height:auto;box-shadow:0 8px 32px rgba(0,0,0,.4)"/><p style="color:#fff;font-size:14px;opacity:.85;padding:0 16px;text-align:center">Mantén pulsada la imagen → Guardar en Fotos</p></body></html>`,
      );
      win.document.close();
      toast.info("Mantén pulsada la imagen y elige Guardar");
      return;
    }
    window.location.href = url;
  };

  const descargarImagen = async () => {
    setGenerando(true);
    try {
      const dataUrl = await capturarCarnetPng();
      const filename = `carnet-${slugNombreArchivo(nombreCompleto)}.png`;
      const blob = dataUrlABlob(dataUrl);
      const file = new File([blob], filename, { type: "image/png" });

      if (
        esMovil() &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: "Carnet de Afiliación",
            text: nombreCompleto,
          });
          return;
        } catch (shareErr) {
          const name =
            shareErr && typeof shareErr === "object" && "name" in shareErr
              ? String((shareErr as { name: string }).name)
              : "";
          if (name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);

      if (esIOS()) {
        abrirImagenParaGuardar(url, filename);
        setTimeout(() => URL.revokeObjectURL(url), 120_000);
        return;
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Imagen descargada");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error("Error generando imagen del carnet:", error);
      toast.error("No se pudo generar la imagen. Intenta de nuevo.");
    } finally {
      setGenerando(false);
    }
  };

  const imprimir = async () => {
    setGenerando(true);
    try {
      const dataUrl = await capturarCarnetPng();
      const ventana = window.open("", "_blank", "width=900,height=600");
      if (!ventana) return;

      ventana.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Carnet de Afiliación</title>
  <style>
    @page {
      size: 216mm 330mm;
      margin: 12mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      padding: 12mm;
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
    }
    img.carnet {
      width: ${CARNET_WIDTH_MM}mm;
      height: ${CARNET_HEIGHT_MM}mm;
      display: block;
    }
    @media print {
      body { padding: 0; }
      img.carnet {
        width: ${CARNET_WIDTH_MM}mm !important;
        height: ${CARNET_HEIGHT_MM}mm !important;
      }
    }
  </style>
</head>
<body>
  <img class="carnet" src="${dataUrl}" alt="Carnet de Afiliación" />
  <script>
    const img = document.querySelector('img');
    img.onload = function() { window.focus(); window.print(); };
    if (img.complete) { window.focus(); window.print(); }
  </script>
</body>
</html>`);
      ventana.document.close();
    } catch (error) {
      console.error("Error imprimiendo carnet:", error);
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg overflow-hidden rounded-xl border bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b px-4 py-3 dark:border-neutral-800">
            <h3 className="text-sm font-bold uppercase text-gray-900 dark:text-gray-100">
              Carnet de Afiliación
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex flex-col items-center gap-5 bg-white p-4 md:p-6 dark:bg-neutral-900">
            <div
              ref={carnetRef}
              className="relative w-full max-w-[400px] overflow-hidden rounded-none border-[1.5px] border-[#1d4ed8] bg-white"
              style={{
                aspectRatio: "85.6 / 53.98",
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            >
              <OndaCarnet className="absolute inset-0 h-full w-full" />

              <div className="relative z-10 h-[72%] px-3.5 pt-2">
                <img
                  src={logoSrc}
                  alt="CABAL"
                  crossOrigin="anonymous"
                  className="pointer-events-none absolute right-2 top-1 z-20 h-[5rem] w-auto object-contain drop-shadow-sm md:h-[5.5rem]"
                  draggable={false}
                  onError={() => {
                    if (logoSrc !== LOGO_FALLBACK_URL) {
                      setLogoSrc(LOGO_FALLBACK_URL);
                    }
                  }}
                />

                <p
                  className={`relative z-10 w-full whitespace-nowrap pr-16 font-black uppercase leading-none tracking-tight text-gray-900 md:pr-20 ${claseNombre}`}
                >
                  {nombreCompleto}
                </p>

                <div className="mt-3.5 pr-4">
                  <div
                    className={`border-b border-slate-200 pb-2 ${
                      mismoDpiPadron
                        ? ""
                        : "grid grid-cols-2 gap-x-4"
                    }`}
                  >
                    {mismoDpiPadron ? (
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                          DPI y Padrón
                        </p>
                        <p className="mt-0.5 font-mono text-xs font-bold text-gray-900 md:text-sm">
                          {dpiMostrar}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                            DPI
                          </p>
                          <p className="mt-0.5 font-mono text-xs font-bold text-gray-900 md:text-sm">
                            {dpiMostrar}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                            Padrón
                          </p>
                          <p className="mt-0.5 font-mono text-xs font-bold text-gray-900 md:text-sm">
                            {padron}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-x-3 border-b border-slate-200 py-2">
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                        Género
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-gray-900 md:text-sm">
                        {genero}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                        Nacimiento
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-gray-900 md:text-sm">
                        {fechaNac}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                        Edad
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-gray-900 md:text-sm">
                        {edad}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                      Lugar
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-gray-900 md:text-sm">
                      {lugar}
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-1 right-3 z-20 text-right md:bottom-1.5 md:right-3.5">
                <p className="text-xs font-black uppercase leading-tight tracking-wide text-white md:text-sm">
                  Carnet de
                  <br />
                  Afiliación
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={imprimir}
                disabled={generando}
                className="hidden w-full border-blue-300 text-blue-800 hover:bg-blue-50 sm:inline-flex sm:w-auto"
              >
                <Printer className="mr-2 h-4 w-4" />
                {generando ? "Preparando..." : "Imprimir"}
              </Button>
              <Button
                type="button"
                onClick={descargarImagen}
                disabled={generando}
                className="w-full bg-blue-700 hover:bg-blue-800 sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                {generando ? "Generando..." : "Descargar imagen"}
              </Button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
