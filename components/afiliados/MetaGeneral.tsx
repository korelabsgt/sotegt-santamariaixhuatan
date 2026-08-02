"use client";

import { Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { PiBriefcaseDuotone, PiMedalDuotone } from "react-icons/pi";

interface Props {
  totalSede: number;
  totalLideres: number;
  totalTrabajadores: number;
  objetivoTotal?: number;
}

export default function MetaGeneral({
  totalSede,
  totalLideres,
  totalTrabajadores,
  objetivoTotal = 0,
}: Props) {
  const total = totalSede + totalLideres + totalTrabajadores;
  const objetivo = objetivoTotal > 0 ? objetivoTotal : 0;
  const pct = (n: number) =>
    objetivo > 0 ? Math.min((n / objetivo) * 100, 100) : 0;
  const progreso =
    objetivo > 0 ? Math.min((total / objetivo) * 100, 100) : 0;

  return (
    <div className="mb-6 w-full space-y-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-white dark:bg-neutral-900/60 px-4 py-4 md:px-6 md:py-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-end">
        <span className="text-sm md:text-xl font-bold uppercase text-gray-700 dark:text-gray-300 font-sans tracking-tight">
          Meta General de Afiliación
        </span>
        <span className="text-base md:text-2xl font-black text-blue-700 dark:text-blue-400">
          {total.toLocaleString()} / {objetivo.toLocaleString()}{" "}
          <span className="text-sm md:text-lg text-gray-500 dark:text-gray-400 font-bold">
            ({progreso.toFixed(1)}%)
          </span>
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-5 md:h-7 border-2 border-white dark:border-neutral-900 shadow-inner overflow-hidden flex items-center relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct(totalSede)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="bg-blue-600 h-full shrink-0"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct(totalLideres)}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
          className="bg-orange-500 h-full shrink-0"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct(totalTrabajadores)}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.15 }}
          className="bg-violet-500 h-full shrink-0"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs md:text-sm font-bold uppercase">
        <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
          <Building2 className="h-4 w-4 shrink-0" />
          Sede: {totalSede.toLocaleString()}
        </span>
        <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
          <PiMedalDuotone className="h-4 w-4 shrink-0" />
          Líderes: {totalLideres.toLocaleString()}
        </span>
        <span className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
          <PiBriefcaseDuotone className="h-4 w-4 shrink-0" />
          Empleados: {totalTrabajadores.toLocaleString()}
        </span>
        <span className="font-black text-gray-900 dark:text-gray-100 normal-case md:ml-auto">
          Total: {total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
