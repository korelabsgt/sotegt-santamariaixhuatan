"use client";

import { MessageCircle, Phone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function limpiarTelefono(telefono: string) {
  return telefono.replace(/\D/g, "");
}

export function linkWhatsapp(telefono: string) {
  if (!telefono) return "#";
  const limpio = limpiarTelefono(telefono);
  const final = limpio.length === 8 ? `502${limpio}` : limpio;
  return `https://wa.me/${final}`;
}

export function linkLlamada(telefono: string) {
  if (!telefono) return "#";
  const limpio = limpiarTelefono(telefono);
  const final = limpio.length === 8 ? `+502${limpio}` : limpio;
  return `tel:${final}`;
}

export function formatearTelefono(telefono: string) {
  const limpio = limpiarTelefono(telefono);
  if (!limpio) return "—";
  return limpio.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatearDpi(dpi: string) {
  const limpio = dpi.replace(/\D/g, "");
  if (!limpio) return dpi || "—";
  if (limpio.length <= 8) {
    return limpio.replace(/^(\d{4})(\d+)$/, "$1 $2");
  }
  const inicio = limpio.slice(0, 4);
  const fin = limpio.slice(-4);
  const medio = limpio.slice(4, -4);
  return `${inicio} ${medio} ${fin}`;
}

export function TelefonoInline({ telefono }: { telefono: string }) {
  if (!telefono) {
    return <span className="text-[11px] text-gray-400">—</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-mono text-xs font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
        >
          <Phone className="h-3.5 w-3.5 shrink-0" />
          {formatearTelefono(telefono)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="min-w-[11rem]">
        <DropdownMenuItem asChild>
          <a href={linkLlamada(telefono)} className="cursor-pointer gap-2">
            <Phone className="h-4 w-4 text-blue-600" />
            Llamar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={linkWhatsapp(telefono)}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer gap-2"
          >
            <MessageCircle className="h-4 w-4 text-green-600" />
            WhatsApp
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
