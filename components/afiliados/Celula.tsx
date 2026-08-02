"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Afiliado, Lider } from "./esquemas";
import { esRolEmpleado, esUsuarioSede } from "./esquemas";
import Tabla from "./Tabla";
import EstadisticasTabs from "./estadisticas/EstadisticasTabs";
import TextoAnimado from "@/components/ui/Typeanimation";
import Image from "next/image";
import {
  Users,
  BarChart3,
  UserPlus,
  Search,
  Loader2,
  Megaphone,
  LayoutGrid,
  Table2,
  ArrowLeft,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { obtenerAfiliadosAction } from "./actions/afiliados";
import { obtenerConfiguracionAction } from "../dashboard/actions/configuracion";
import { calcularNivelCompromiso } from "@/lib/nivelCompromiso";
import MensajesEnviados from "./MensajesEnviados";
import type { FormatoVista } from "./Tabla";

function etiquetaRolCelula(lider: Lider): string {
  if (esRolEmpleado(lider.rol)) return "Empleado";
  if (esUsuarioSede(lider)) return "Sede";
  return "Líder";
}

const familiaEase = [0.25, 0.46, 0.45, 0.94] as const;

interface Props {
  mode?: "embedded" | "page";
  lider: Lider | null;
  onClose?: () => void;
  onEditar: (afiliado: Afiliado) => void;
  onAnadirAfiliado: (liderId: string, isFirstMember?: boolean, familiarDeId?: string) => void;
  onDataChange: () => void;
  rolUsuarioSesion: string;
  afiliadosSimulados?: Afiliado[];
  usuarios?: Lider[];
}

type Vista = "miembros" | "estadisticas" | "mensajes";

export default function Celula({
  mode = "page",
  lider,
  onClose,
  onEditar,
  onAnadirAfiliado,
  onDataChange,
  rolUsuarioSesion,
  afiliadosSimulados,
  usuarios = [],
}: Props) {
  const embedded = mode === "embedded";
  const [vistaActual, setVistaActual] = useState<Vista>("miembros");
  const [busqueda, setBusqueda] = useState("");
  const [formatoVista, setFormatoVista] = useState<FormatoVista>("tarjetas");
  const [titularFamilia, setTitularFamilia] = useState<Afiliado | null>(null);

  const esSimulado = !!lider?.simulado;
  const esSedeSesion = (rolUsuarioSesion || "").toUpperCase() === "SEDE";
  const celulaEsSede = !!lider && esUsuarioSede(lider);
  const soloLectura = esSedeSesion && !celulaEsSede;

  const { data: afiliadosQuery = [], isLoading: isLoadingQuery } = useQuery({
    queryKey: ["afiliados-lider", lider?.id],
    queryFn: () => obtenerAfiliadosAction(lider?.id),
    enabled: !!lider?.id && !esSimulado,
  });

  const afiliadosDelLider = esSimulado ? afiliadosSimulados ?? [] : afiliadosQuery;
  const isLoading = esSimulado ? false : isLoadingQuery;

  const { data: config } = useQuery({
    queryKey: ["config_sistema"],
    queryFn: () => obtenerConfiguracionAction(),
  });

  if (!lider) return null;

  const etiquetaRol = etiquetaRolCelula(lider);

  const liderAfiliado =
    afiliadosDelLider.find((a: Afiliado) => !!a.es_lider) ??
    (afiliadosDelLider.length > 0 ? afiliadosDelLider[0] : null);
  const restantesAfiliados = liderAfiliado
    ? afiliadosDelLider.filter((a: Afiliado) => a.id !== liderAfiliado.id)
    : afiliadosDelLider;

  const miembrosParaTabla = liderAfiliado
    ? [{ ...liderAfiliado, es_lider: true }, ...restantesAfiliados]
    : afiliadosDelLider;

  const totalEnGrupo = afiliadosDelLider.filter((a: Afiliado) => !a.familiar_de).length;
  const META_CELULA = config?.meta_por_lider ?? config?.meta_celula ?? 15;
  const META_MINIMA = config?.meta_celula_minima ?? 10;
  const objetivo = META_CELULA;
  const progreso = Math.min((totalEnGrupo / objetivo) * 100, 100);

  const {
    nivel: nivelCompromiso,
    colorBarra,
    textoColor,
    gifUrl,
    mensaje,
  } = calcularNivelCompromiso(
    totalEnGrupo,
    META_CELULA,
    META_MINIMA,
    lider.nombres,
    etiquetaRol,
  );

  const afiliadosFiltrados =
    busqueda.length >= 2
      ? miembrosParaTabla.filter(
          (a: Afiliado) =>
            a.nombres.toLowerCase().includes(busqueda.toLowerCase()) ||
            a.apellidos.toLowerCase().includes(busqueda.toLowerCase()) ||
            a.dpi.includes(busqueda),
        )
      : miembrosParaTabla;

  const TABS = [
    { id: "miembros", label: "Miembros", icon: Users },
    { id: "estadisticas", label: "Estadísticas", icon: BarChart3 },
    { id: "mensajes", label: "Mensajes", icon: Megaphone },
  ];

  const panelBody = (
    <>
      <div className="px-3 lg:px-6 py-2 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 sticky top-0 z-20">
        <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4 w-full">
          {!embedded && onClose ? (
            <div className="order-1 lg:order-1 shrink-0 w-full flex justify-center lg:w-auto lg:justify-start">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-bold text-red-600 hover:text-red-700 underline underline-offset-[6px] decoration-red-600/90 hover:decoration-red-700 uppercase tracking-wide bg-transparent border-0 cursor-pointer transition-colors"
              >
                Atrás
              </button>
            </div>
          ) : null}

          <div className="order-2 lg:order-3 w-full lg:w-auto text-center lg:text-right px-2 min-w-0 lg:shrink-0 lg:max-w-[min(100%,20rem)]">
            <div className="flex items-center justify-center lg:justify-end gap-1">
              <h3 className="text-sm lg:text-xs font-black uppercase text-blue-700 dark:text-blue-400 leading-tight break-words">
                {lider.nombres} {lider.apellidos}
              </h3>
              {isLoading && (
                <Loader2 className="w-4 h-4 lg:w-3 lg:h-3 animate-spin text-blue-500 dark:text-blue-400 shrink-0" />
              )}
            </div>
          </div>

          <div className="order-3 lg:order-2 w-full lg:flex-1 lg:max-w-md px-1">
            <div className="flex bg-gray-200 dark:bg-neutral-800 p-1 rounded-lg gap-1 w-full">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setVistaActual(tab.id as Vista);
                    setTitularFamilia(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[10px] font-bold transition-all ${
                    vistaActual === tab.id
                      ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-neutral-600"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto px-3 md:px-6 bg-gray-50/50 dark:bg-neutral-950 ${embedded ? "py-2" : "py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"}`}
      >
        <div className="w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 dark:text-blue-400" />
              <p className="text-sm font-bold text-gray-500 dark:text-neutral-400 uppercase">
                Consultando Miembros de Célula...
              </p>
            </div>
          ) : vistaActual === "miembros" ? (
            <AnimatePresence mode="wait" initial={false}>
            {titularFamilia ? (
              <motion.div
                key={`familia-${titularFamilia.id}`}
                className="space-y-4"
                initial={{ opacity: 0, x: 36 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.35, ease: familiaEase }}
              >
                <button
                  type="button"
                  onClick={() => setTitularFamilia(null)}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 hover:text-red-700 underline underline-offset-[6px] decoration-red-600/90 hover:decoration-red-700 uppercase tracking-wide bg-transparent border-0 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  Volver a miembros
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/30 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-wide text-purple-600 dark:text-purple-400">
                        Familia de
                      </p>
                      <h3 className="text-sm md:text-base font-black uppercase truncate text-gray-900 dark:text-gray-100">
                        {titularFamilia.nombres} {titularFamilia.apellidos}
                      </h3>
                    </div>
                  </div>
                  {!soloLectura && (
                    <Button
                      type="button"
                      onClick={() =>
                        onAnadirAfiliado(lider.id, false, titularFamilia.id)
                      }
                      className="gap-2 font-bold bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      Añadir Familiar
                    </Button>
                  )}
                </div>

                <div className="flex justify-end">
                  <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg border border-gray-200 dark:border-neutral-700 shrink-0">
                    <button
                      type="button"
                      onClick={() => setFormatoVista("tarjetas")}
                      title="Ver tarjetas"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-bold uppercase transition-colors ${
                        formatoVista === "tarjetas"
                          ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span className="hidden sm:inline">Tarjetas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormatoVista("tabla")}
                      title="Ver lista"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-bold uppercase transition-colors ${
                        formatoVista === "tabla"
                          ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      <Table2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Lista</span>
                    </button>
                  </div>
                </div>

                <Tabla
                  lider={lider}
                  afiliados={[
                    titularFamilia,
                    ...afiliadosDelLider.filter(
                      (a) => a.familiar_de === titularFamilia.id,
                    ),
                  ]}
                  onEditar={onEditar}
                  onAnadirFamiliar={(titularId) =>
                    onAnadirAfiliado(lider.id, false, titularId)
                  }
                  onDataChange={onDataChange}
                  rolUsuarioSesion={rolUsuarioSesion}
                  config={config}
                  totalEnCelula={totalEnGrupo}
                  isFamilyView
                  formato={formatoVista}
                />
              </motion.div>
            ) : (
              <motion.div
                key="miembros-lista"
                initial={{ opacity: 0, x: -36 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 28 }}
                transition={{ duration: 0.35, ease: familiaEase }}
              >
                <div className="mb-6 p-4 border border-gray-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900/80 shadow-sm flex flex-col md:flex-row items-center gap-4">
                  <div className="w-full md:flex-1">
                    <div className="flex justify-between items-center mb-2 gap-2">
                      <span className="text-xs font-bold text-gray-600 dark:text-neutral-300 uppercase">
                        Nivel de compromiso:{" "}
                        <span className={textoColor}>{nivelCompromiso}</span>
                      </span>
                      <span
                        className={`text-sm font-black shrink-0 ${textoColor}`}
                      >
                        {totalEnGrupo} / {objetivo}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-4 overflow-hidden shadow-inner border border-gray-300/50 dark:border-neutral-700">
                      <div
                        className={`${colorBarra} h-full transition-all duration-1000`}
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                    <div className="hidden md:block text-center mt-2">
                      <span className="text-xs text-gray-600 dark:text-neutral-300 font-bold bg-gray-100 dark:bg-neutral-800/80 px-4 py-1 rounded-full border border-gray-200 dark:border-neutral-700 inline-block">
                        <TextoAnimado textos={[mensaje]} />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-100 dark:bg-neutral-800/60 p-2 rounded-lg border border-gray-200 dark:border-neutral-700 w-full md:w-auto shrink-0">
                    <div className="md:hidden flex-1 min-w-0">
                      <span className="text-[10px] text-gray-600 dark:text-neutral-300 font-bold leading-tight uppercase">
                        <TextoAnimado textos={[mensaje]} />
                      </span>
                    </div>
                    <div className="shrink-0 rounded-lg overflow-hidden bg-white/80 dark:bg-neutral-900/50 p-1">
                      <Image
                        src={gifUrl}
                        alt="Status"
                        width={100}
                        height={100}
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 w-full">
                  <div className="relative w-full sm:max-w-md shrink-0">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400 dark:text-neutral-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o DPI..."
                      className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-neutral-600 rounded-lg w-full bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-sm"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                    <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg border border-gray-200 dark:border-neutral-700 shrink-0">
                      <button
                        type="button"
                        onClick={() => setFormatoVista("tarjetas")}
                        title="Ver tarjetas"
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-bold uppercase transition-colors ${
                          formatoVista === "tarjetas"
                            ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        <LayoutGrid className="w-4 h-4" />
                        <span className="hidden sm:inline">Tarjetas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormatoVista("tabla")}
                        title="Ver lista"
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-bold uppercase transition-colors ${
                          formatoVista === "tabla"
                            ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        <Table2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Lista</span>
                      </button>
                    </div>
                    {!esSimulado && !soloLectura && (
                      <Button
                        variant="outline"
                        className={`gap-2 font-bold h-11 sm:h-12 px-4 sm:px-6 shadow-none flex-1 sm:flex-none uppercase text-xs shrink-0 backdrop-blur-sm transition-colors ${
                          totalEnGrupo === 0 && !celulaEsSede
                            ? "border-green-500 dark:border-green-600 text-green-700 dark:text-green-400 bg-white/70 dark:bg-white/5 hover:bg-green-100 dark:hover:bg-green-950/55 animate-pulse"
                            : "border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/45 hover:bg-blue-100 dark:hover:bg-blue-950/65"
                        }`}
                        onClick={() =>
                          onAnadirAfiliado(
                            lider.id,
                            totalEnGrupo === 0 && !celulaEsSede,
                          )
                        }
                      >
                        {totalEnGrupo === 0 && !celulaEsSede ? (
                          <>
                            <UserPlus className="w-5 h-5" /> Registrarme como{" "}
                            {etiquetaRol}
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-5 h-5" /> Añadir Integrante
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <Tabla
                  lider={lider}
                  afiliados={afiliadosFiltrados}
                  onEditar={onEditar}
                  onAnadirFamiliar={(titularId) =>
                    onAnadirAfiliado(lider.id, false, titularId)
                  }
                  onVerFamilia={setTitularFamilia}
                  onDataChange={onDataChange}
                  rolUsuarioSesion={rolUsuarioSesion}
                  config={config}
                  totalEnCelula={totalEnGrupo}
                  formato={formatoVista}
                />
              </motion.div>
            )}
            </AnimatePresence>
          ) : vistaActual === "estadisticas" ? (
            <div className="w-full pt-4">
              <EstadisticasTabs
                afiliados={afiliadosDelLider}
                mostrarOpcionSimular={["ADMIN", "SUPER", "ADMINISTRADOR", "DOCUMENTADOR"].includes(
                  rolUsuarioSesion.toUpperCase(),
                )}
              />
            </div>
          ) : (
            <MensajesEnviados lideres={usuarios} />
          )}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="w-full flex flex-col bg-white dark:bg-neutral-950 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden min-h-[60vh]">
        {panelBody}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden">{panelBody}</div>
  );
}
