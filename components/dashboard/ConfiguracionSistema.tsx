"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Loader2,
  Search,
  MapPin,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
} from "@/lib/toast";
import useUserData from "@/hooks/sesion/useUserData";
import {
  obtenerConfiguracionAction,
  actualizarConfiguracionAction,
  actualizarConfiguracionGeneralAction,
} from "./actions/configuracion";
import {
  obtenerLugaresAction,
  obtenerSectoresAction,
  crearLugarAction,
  crearSectorAction,
  actualizarSectorAction,
  eliminarSectorAction,
  actualizarLugarAction,
  eliminarLugarAction,
  type Lugar,
  type Sector,
} from "@/components/afiliados/forms/afiliados/catalogos";

interface Props {
  showMetas?: boolean;
  allowEditing?: boolean;
  onClose?: () => void;
}

export default function ConfiguracionSistema({
  showMetas = true,
  allowEditing = true,
  onClose,
}: Props) {
  const { rol, cargando: cargandoRol } = useUserData();
  const queryClient = useQueryClient();
  const [guardando, setGuardando] = useState(false);

  const canEdit =
    (rol === "SUPER" || rol === "ADMINISTRADOR" || rol === "ADMIN") &&
    allowEditing;

  const { data: config, isLoading } = useQuery({
    queryKey: ["config_sistema"],
    queryFn: () => obtenerConfiguracionAction(),
  });

  const [nombreCandidato, setNombreCandidato] = useState("");
  const [lugar, setLugar] = useState("");
  const [frase, setFrase] = useState("");
  const [objetivoTotal, setObjetivoTotal] = useState(0);
  const [metaPorLider, setMetaPorLider] = useState(0);
  const [metaCelulaMinima, setMetaCelulaMinima] = useState(10);
  const [padronPrecargado, setPadronPrecargado] = useState(false);
  const [activeTab, setActiveTab] = useState<"candidato" | "metas" | "lugares">(
    "candidato",
  );

  const [initialized, setInitialized] = useState(false);

  // Sincronizar estados locales una sola vez al cargar o cuando cambie la config
  if (config && !initialized) {
    setNombreCandidato(config.nombre_candidato || "");
    setLugar(config.lugar || "");
    setFrase(config.frase || "");
    setObjetivoTotal(config.objetivo_total || 0);
    setMetaPorLider(config.meta_por_lider || config.meta_celula || 0);
    setMetaCelulaMinima(config.meta_celula_minima ?? 10);
    setPadronPrecargado(config.padron ?? false);
    setInitialized(true);
  }

  // ── Sectores y Lugares ──
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [sectorQuery, setSectorQuery] = useState("");
  const [lugarQuery, setLugarQuery] = useState("");
  const [sectorSeleccionado, setSectorSeleccionado] = useState<number | null>(
    null,
  );
  const [creandoSector, setCreandoSector] = useState(false);
  const [creandoLugar, setCreandoLugar] = useState(false);
  const [editandoSectorId, setEditandoSectorId] = useState<number | null>(null);
  const [editandoSectorNombre, setEditandoSectorNombre] = useState("");
  const [editandoSectorNumero, setEditandoSectorNumero] = useState("");
  const [guardandoSector, setGuardandoSector] = useState(false);
  const [editandoLugarId, setEditandoLugarId] = useState<number | null>(null);
  const [editandoLugarNombre, setEditandoLugarNombre] = useState("");
  const [guardandoLugar, setGuardandoLugar] = useState(false);

  useEffect(() => {
    if (canEdit) {
      obtenerSectoresAction().then(setSectores);
      obtenerLugaresAction().then(setLugares);
    }
  }, [canEdit]);

  const sectoresFiltrados = sectores.filter((s) => {
    const queryLower = sectorQuery.toLowerCase().trim();
    const matchSector = queryLower.match(/^sector\s+(\d+)$/);
    if (matchSector) {
      return s.id === parseInt(matchSector[1], 10);
    }
    const formatted = s.id === 0 ? s.nombre : `Sector ${s.id}: ${s.nombre}`;
    return formatted.toLowerCase().includes(queryLower);
  });
  const sectorExacto = sectores.find((s) => {
    const formatted = s.id === 0 ? s.nombre : `Sector ${s.id}: ${s.nombre}`;
    return formatted.toLowerCase() === sectorQuery.trim().toLowerCase();
  });
  const puedeCrearSector = sectorQuery.trim().length > 1 && !sectorExacto;

  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const lugaresFiltrados = lugares.filter((l) => {
    if (sectorSeleccionado && l.sector_id !== sectorSeleccionado) return false;
    const qNorm = normalize(lugarQuery);
    if (qNorm === "") return true;
    const lNorm = normalize(l.nombre);
    return lNorm.includes(qNorm);
  });
  const lugarExactoEnSector = lugares.find(
    (l) =>
      normalize(l.nombre) === normalize(lugarQuery) &&
      l.sector_id === sectorSeleccionado,
  );
  const puedeCrearLugar =
    lugarQuery.trim().length > 1 && !lugarExactoEnSector && sectorSeleccionado;

  useEffect(() => {
    setLugarQuery("");
  }, [sectorSeleccionado]);

  const calcularSiguienteIdSector = (lista: Sector[]) => {
    const ids = lista.filter((s) => s.id > 0).map((s) => s.id);
    if (ids.length === 0) return 1;
    return Math.max(...ids) + 1;
  };

  const handleCrearSector = async () => {
    if (!puedeCrearSector) return;

    const siguienteId = calcularSiguienteIdSector(sectores);

    const confirmacion = await Swal.fire({
      title: "¿Agregar sector?",
      text: `Se creará el sector ${siguienteId}: "${sectorQuery.trim()}".`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#d97706",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, agregar",
      cancelButtonText: "Cancelar",
    });
    if (!confirmacion.isConfirmed) return;

    setCreandoSector(true);
    const nuevo = await crearSectorAction(sectorQuery.trim(), siguienteId);
    if (nuevo) {
      setSectores((prev) =>
        [...prev, nuevo].sort((a, b) => {
          if (a.id === 0) return 1;
          if (b.id === 0) return -1;
          return a.id - b.id;
        }),
      );
      setSectorSeleccionado(null);
      setSectorQuery("");
      showSuccessToast(`Sector "${nuevo.nombre}" creado`);
    } else {
      showErrorToast("Error al crear el sector");
    }
    setCreandoSector(false);
  };

  const handleCrearLugar = async () => {
    if (!puedeCrearLugar || !sectorSeleccionado) return;

    const confirmacion = await Swal.fire({
      title: "¿Agregar lugar?",
      text: `Se creará el lugar "${lugarQuery.trim()}" en ${sectorNombre}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#d97706",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, agregar",
      cancelButtonText: "Cancelar",
    });
    if (!confirmacion.isConfirmed) return;

    setCreandoLugar(true);
    const nuevo = await crearLugarAction(lugarQuery.trim(), sectorSeleccionado);
    if (nuevo) {
      setLugares((prev) =>
        [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
      setLugarQuery("");
      showSuccessToast(`Lugar "${nuevo.nombre}" creado`);
    } else {
      showErrorToast("Error al crear el lugar");
    }
    setCreandoLugar(false);
  };

  const formatSectorLabel = (s: Sector) =>
    s.id === 0 ? s.nombre : `Sector ${s.id}: ${s.nombre}`;

  const renderSectorLabel = (s: Sector) => {
    if (s.id === 0) {
      return (
        <span className="font-extrabold text-amber-600 dark:text-amber-400">
          {s.nombre}
        </span>
      );
    }
    return (
      <>
        <span className="font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
          Sector {s.id}
        </span>
        <span className="font-medium text-gray-500 dark:text-gray-400">
          : {s.nombre}
        </span>
      </>
    );
  };

  const iniciarEdicionSector = (s: Sector) => {
    setEditandoSectorId(s.id);
    setEditandoSectorNombre(s.nombre);
    setEditandoSectorNumero(s.id === 0 ? "" : String(s.id));
  };

  const cancelarEdicionSector = () => {
    setEditandoSectorId(null);
    setEditandoSectorNombre("");
    setEditandoSectorNumero("");
  };

  const handleGuardarSector = async () => {
    if (editandoSectorId === null || editandoSectorNombre.trim().length < 2)
      return;

    const numeroParsed = parseInt(editandoSectorNumero, 10);
    if (editandoSectorId !== 0) {
      if (!editandoSectorNumero.trim() || isNaN(numeroParsed) || numeroParsed <= 0) {
        showWarningToast("El número de sector debe ser mayor a 0");
        return;
      }
      const duplicado = sectores.some(
        (s) => s.id === numeroParsed && s.id !== editandoSectorId,
      );
      if (duplicado) {
        showWarningToast("Ya existe un sector con ese número");
        return;
      }
    }

    setGuardandoSector(true);
    const nuevoId =
      editandoSectorId === 0 ? undefined : numeroParsed;
    const actualizado = await actualizarSectorAction(
      editandoSectorId,
      editandoSectorNombre,
      nuevoId,
    );
    if (actualizado) {
      const idAnterior = editandoSectorId;
      setSectores((prev) =>
        prev
          .map((s) => (s.id === idAnterior ? actualizado : s))
          .sort((a, b) => {
            if (a.id === 0) return 1;
            if (b.id === 0) return -1;
            return a.id - b.id;
          }),
      );
      if (idAnterior !== actualizado.id) {
        setLugares((prev) =>
          prev.map((l) =>
            l.sector_id === idAnterior
              ? { ...l, sector_id: actualizado.id }
              : l,
          ),
        );
        if (sectorSeleccionado === idAnterior) {
          setSectorSeleccionado(actualizado.id);
        }
      }
      if (sectorSeleccionado === actualizado.id) {
        setSectorQuery(formatSectorLabel(actualizado));
      }
      cancelarEdicionSector();
      showSuccessToast(`Sector "${actualizado.nombre}" actualizado`);
    } else {
      showErrorToast("Error al actualizar el sector o el nombre ya existe");
    }
    setGuardandoSector(false);
  };

  const handleEliminarSector = async (s: Sector) => {
    const lugaresDelSector = lugares.filter((l) => l.sector_id === s.id);
    if (lugaresDelSector.length > 0) {
      await Swal.fire({
        title: "No se puede eliminar el sector",
        html: `El sector <strong>"${formatSectorLabel(s)}"</strong> tiene <strong>${lugaresDelSector.length}</strong> lugar(es) asociado(s).<br/><br/>Debe eliminar todos los lugares de este sector antes de poder eliminarlo.`,
        icon: "error",
        confirmButtonColor: "#6c757d",
        confirmButtonText: "Entendido",
      });
      return;
    }

    const confirmacion = await Swal.fire({
      title: "¿Eliminar sector?",
      text: `Se eliminará "${formatSectorLabel(s)}" permanentemente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DC3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!confirmacion.isConfirmed) return;

    const result = await eliminarSectorAction(s.id);
    if (result.ok) {
      setSectores((prev) => prev.filter((item) => item.id !== s.id));
      if (sectorSeleccionado === s.id) {
        setSectorSeleccionado(null);
        setSectorQuery("");
      }
      showSuccessToast(`Sector "${s.nombre}" eliminado`);
    } else if (result.error?.includes("lugar")) {
      await Swal.fire({
        title: "No se puede eliminar el sector",
        html: `${result.error}.<br/><br/>Debe eliminar todos los lugares de este sector antes de poder eliminarlo.`,
        icon: "error",
        confirmButtonColor: "#6c757d",
        confirmButtonText: "Entendido",
      });
    } else {
      showErrorToast(result.error || "Error al eliminar el sector");
    }
  };

  const iniciarEdicionLugar = (l: Lugar) => {
    setEditandoLugarId(l.id);
    setEditandoLugarNombre(l.nombre);
  };

  const cancelarEdicionLugar = () => {
    setEditandoLugarId(null);
    setEditandoLugarNombre("");
  };

  const handleGuardarLugar = async () => {
    if (editandoLugarId === null || editandoLugarNombre.trim().length < 2)
      return;
    setGuardandoLugar(true);
    const actualizado = await actualizarLugarAction(
      editandoLugarId,
      editandoLugarNombre,
    );
    if (actualizado) {
      setLugares((prev) =>
        prev
          .map((l) => (l.id === actualizado.id ? actualizado : l))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
      cancelarEdicionLugar();
      showSuccessToast(`Lugar "${actualizado.nombre}" actualizado`);
    } else {
      showErrorToast("Error al actualizar el lugar o el nombre ya existe");
    }
    setGuardandoLugar(false);
  };

  const handleEliminarLugar = async (l: Lugar) => {
    const confirmacion = await Swal.fire({
      title: "¿Eliminar lugar?",
      text: `Se eliminará "${l.nombre}" permanentemente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DC3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!confirmacion.isConfirmed) return;

    const result = await eliminarLugarAction(l.id);
    if (result.ok) {
      setLugares((prev) => prev.filter((item) => item.id !== l.id));
      showSuccessToast(`Lugar "${l.nombre}" eliminado`);
    } else {
      showErrorToast(result.error || "Error al eliminar el lugar");
    }
  };

  const sectorObj = sectores.find((s) => s.id === sectorSeleccionado);
  const sectorNombre = sectorObj
    ? sectorObj.id === 0
      ? sectorObj.nombre
      : `Sector ${sectorObj.id}: ${sectorObj.nombre}`
    : undefined;

  const handleSaveCandidato = async () => {
    if (!nombreCandidato.trim() || !lugar.trim()) {
      showWarningToast("El nombre y lugar son obligatorios");
      return;
    }

    try {
      setGuardando(true);
      const result = await actualizarConfiguracionGeneralAction(
        nombreCandidato,
        lugar,
        frase,
        metaPorLider || config?.meta_celula || 15,
        metaCelulaMinima,
      );
      queryClient.setQueryData(["config_sistema"], result);
      showSuccessToast("Candidato guardado correctamente");
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : "Error desconocido";
      showErrorToast("Error al guardar: " + mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const handleSaveMetas = async () => {
    if (!nombreCandidato.trim() || !lugar.trim()) {
      showWarningToast("El nombre y lugar son obligatorios");
      return;
    }
    if (metaPorLider <= 0) {
      showWarningToast("La meta por líder debe ser mayor a 0");
      return;
    }
    if (metaCelulaMinima >= metaPorLider) {
      showWarningToast("La meta mínima debe ser menor que la meta por líder");
      return;
    }

    try {
      setGuardando(true);
      const result = await actualizarConfiguracionAction(
        nombreCandidato,
        lugar,
        frase,
        objetivoTotal,
        metaPorLider,
        padronPrecargado,
        metaPorLider,
        metaCelulaMinima,
      );
      queryClient.setQueryData(["config_sistema"], result);
      showSuccessToast("Metas guardadas correctamente");
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : "Error desconocido";
      showErrorToast("Error al guardar: " + mensaje);
    } finally {
      setGuardando(false);
    }
  };

  if (isLoading || cargandoRol)
    return (
      <div className="h-16 w-full bg-blue-50/50 animate-pulse rounded-xl mb-2" />
    );

  if (!config && !canEdit) return null;

  const currentConfig = config || {
    nombre_candidato: "",
    lugar: "",
    frase: "",
  };
  const isNew = !config;

  return (
    <div className={`w-full mx-auto flex flex-col ${canEdit ? "h-full" : ""}`}>
      {canEdit ? (
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          {/* TABS */}
          <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab("candidato")}
              className={`flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all ${
                activeTab === "candidato"
                  ? "bg-white dark:bg-neutral-700 text-blue-700 dark:text-blue-300 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Candidato
            </button>
            {showMetas && (
              <button
                onClick={() => setActiveTab("metas")}
                className={`flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all ${
                  activeTab === "metas"
                    ? "bg-white dark:bg-neutral-700 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Metas
              </button>
            )}
            <button
              onClick={() => setActiveTab("lugares")}
              className={`flex-1 py-1 text-[10px] sm:text-[10px] font-bold uppercase rounded-lg transition-all whitespace-pre-line leading-tight ${
                activeTab === "lugares"
                  ? "bg-white dark:bg-neutral-700 text-blue-700 dark:text-blue-300 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {"Lugares y\nSectores"}
            </button>
          </div>

          {/* SECCIÓN 1: INFORMACIÓN DEL CANDIDATO */}
          {activeTab === "candidato" && (
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border-2 border-gray-200 dark:border-neutral-700 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
                Información del Candidato
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase ml-1">
                    Nombre Completo / Título
                  </label>
                  <Input
                    value={nombreCandidato}
                    onChange={(e) => setNombreCandidato(e.target.value)}
                    className="h-12 text-lg font-black text-blue-900 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-600 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all bg-white dark:bg-neutral-800"
                    placeholder="Escribe aqui el nombre del candidato"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase ml-1">
                      Frase o Lema
                    </label>
                    <Input
                      value={frase}
                      onChange={(e) => setFrase(e.target.value)}
                      className="h-12 text-base italic text-gray-700 dark:text-gray-200 border-2 border-blue-300 dark:border-blue-600 focus:border-blue-600 dark:focus:border-blue-500 bg-white dark:bg-neutral-800"
                      placeholder="Escribe aqui tu frase o lema"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase ml-1">
                      Municipio / Ubicación
                    </label>
                    <Input
                      value={lugar}
                      onChange={(e) => setLugar(e.target.value)}
                      className="h-12 text-base font-bold uppercase border-2 border-blue-300 dark:border-blue-600 focus:border-blue-600 dark:focus:border-blue-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                      placeholder="Escribe aqui el lugar"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-neutral-800 flex justify-end">
                <Button
                  onClick={handleSaveCandidato}
                  disabled={guardando}
                  variant="outline"
                  className="w-full sm:w-auto px-10 h-11 border-2 border-blue-500 dark:border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/45 hover:bg-blue-100 dark:hover:bg-blue-950/65 font-black uppercase tracking-widest rounded-xl shadow-none transition-colors"
                >
                  {guardando ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Guardar Candidato"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* SECCIÓN 2: METAS Y OBJETIVOS */}
          {showMetas && activeTab === "metas" && (
            <div className="bg-blue-50/50 dark:bg-blue-950/30 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-800 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
                Configuración de Metas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase ml-1">
                    Objetivo Total
                  </label>
                  <Input
                    type="number"
                    value={objetivoTotal}
                    onChange={(e) => setObjetivoTotal(Number(e.target.value))}
                    className="h-12 text-2xl font-black text-blue-900 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-600 focus:border-blue-600 dark:focus:border-blue-500 bg-white dark:bg-neutral-800 text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase ml-1">
                    Meta por Líder
                  </label>
                  <Input
                    type="number"
                    value={metaPorLider}
                    onChange={(e) => setMetaPorLider(Number(e.target.value))}
                    className="h-12 text-2xl font-black text-blue-900 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-600 focus:border-blue-600 dark:focus:border-blue-500 bg-white dark:bg-neutral-800 text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase ml-1">
                    Meta Mínima
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={metaCelulaMinima}
                    onChange={(e) =>
                      setMetaCelulaMinima(Number(e.target.value) || 0)
                    }
                    className="h-12 text-2xl font-black text-blue-900 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-600 focus:border-blue-600 dark:focus:border-blue-500 bg-white dark:bg-neutral-800 text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 rounded-xl border-2 border-blue-200 dark:border-blue-700">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase">
                    Padrón Precargado
                  </span>
                  <span className="text-[10px] text-blue-500 dark:text-blue-400">
                    Indica si el padrón electoral ya fue cargado en el sistema
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPadronPrecargado((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    padronPrecargado ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                      padronPrecargado ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {objetivoTotal > 0 && metaPorLider > 0 && (
                <div className="mt-4 p-5 bg-blue-600 rounded-2xl shadow-lg flex items-center justify-between text-white">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase opacity-80">
                      Requerimiento de Células
                    </span>
                    <span className="text-base font-bold">
                      Líderes necesarios para la meta
                    </span>
                  </div>
                  <div className="text-4xl font-black">
                    {Math.ceil(objetivoTotal / metaPorLider)}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-blue-100 dark:border-blue-900 flex justify-end">
                <Button
                  onClick={handleSaveMetas}
                  disabled={guardando}
                  variant="outline"
                  className="w-full sm:w-auto px-10 h-11 border-2 border-blue-500 dark:border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/45 hover:bg-blue-100 dark:hover:bg-blue-950/65 font-black uppercase tracking-widest rounded-xl shadow-none transition-colors"
                >
                  {guardando ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Guardar Metas"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* SECCIÓN 3: GESTIÓN DE SECTORES Y LUGARES */}
          {activeTab === "lugares" && (
            <div className="bg-amber-50/50 dark:bg-amber-950/25 p-6 rounded-2xl border-2 border-amber-200 dark:border-amber-800 space-y-5 flex-1 flex flex-col">
              <h3 className="text-sm font-black text-amber-900 dark:text-amber-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Gestión de Sectores y Lugares
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* SECTORES */}
                <div className="space-y-3 flex flex-col min-h-0">
                  <label className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase ml-1">
                    Sectores
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={sectorQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSectorQuery(val);
                          if (val.trim() === "") setSectorSeleccionado(null);
                        }}
                        placeholder="Buscar o escribir nombre nuevo..."
                        className="w-full h-10 pl-9 pr-3 border-2 border-amber-300 dark:border-amber-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600 shrink-0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!puedeCrearSector || creandoSector}
                      onClick={handleCrearSector}
                      className="h-10 px-3 flex items-center border-2 border-amber-600 dark:border-amber-300 bg-transparent text-amber-600 dark:text-amber-300 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 font-bold text-xs uppercase shrink-0 shadow-none disabled:opacity-50"
                    >
                      {creandoSector ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Agregar"
                      )}
                    </Button>
                  </div>

                  <div className="bg-white dark:bg-neutral-900 border border-amber-100 dark:border-amber-900 rounded-lg flex-1 overflow-y-auto">
                    {sectoresFiltrados.length === 0 && !puedeCrearSector ? (
                      <p className="text-xs text-gray-400 p-3 text-center">
                        No hay sectores
                      </p>
                    ) : (
                      <>
                        {sectoresFiltrados.map((s) => (
                          <div
                            key={s.id}
                            className={`flex items-center gap-1 transition-colors ${
                              sectorSeleccionado === s.id
                                ? "bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200"
                                : "hover:bg-amber-50 dark:hover:bg-amber-950/40 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {editandoSectorId === s.id ? (
                              <div className="flex items-center gap-1 flex-1 px-2 py-1.5">
                                {s.id !== 0 && (
                                  <input
                                    type="number"
                                    min={1}
                                    value={editandoSectorNumero}
                                    onChange={(e) =>
                                      setEditandoSectorNumero(e.target.value)
                                    }
                                    className="w-12 h-8 px-1 border border-amber-300 dark:border-amber-700 rounded text-sm text-center bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        handleGuardarSector();
                                      if (e.key === "Escape")
                                        cancelarEdicionSector();
                                    }}
                                  />
                                )}
                                <input
                                  type="text"
                                  value={editandoSectorNombre}
                                  onChange={(e) =>
                                    setEditandoSectorNombre(e.target.value)
                                  }
                                  className="flex-1 h-8 px-2 border border-amber-300 dark:border-amber-700 rounded text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                  autoFocus={s.id === 0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleGuardarSector();
                                    if (e.key === "Escape")
                                      cancelarEdicionSector();
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={guardandoSector}
                                  onClick={handleGuardarSector}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                >
                                  {guardandoSector ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelarEdicionSector}
                                  className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSectorSeleccionado(s.id);
                                    setSectorQuery(formatSectorLabel(s));
                                  }}
                                  className="flex-1 text-left px-3 py-2.5 text-base flex items-center justify-between gap-2"
                                >
                                  <span className="truncate">
                                    {renderSectorLabel(s)}
                                  </span>
                                  {sectorSeleccionado === s.id && (
                                    <Check className="w-3 h-3 text-amber-600" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => iniciarEdicionSector(s)}
                                  className="p-1.5 mr-0.5 text-amber-600 hover:bg-amber-200/50 rounded"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {s.id !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarSector(s)}
                                    className="p-1.5 mr-1 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* LUGARES */}
                <div className="space-y-3 flex flex-col min-h-0">
                  <label className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase ml-1">
                    Lugares
                    {sectorNombre && (
                      <span className="text-amber-500 dark:text-amber-400 font-normal ml-1">
                        — {sectorNombre}
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={lugarQuery}
                        onChange={(e) => setLugarQuery(e.target.value)}
                        placeholder={
                          sectorSeleccionado
                            ? "Buscar o escribir nombre nuevo..."
                            : "Selecciona un sector primero"
                        }
                        disabled={!sectorSeleccionado}
                        className="w-full h-10 pl-9 pr-3 border-2 border-amber-300 dark:border-amber-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-neutral-900 shrink-0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!puedeCrearLugar || creandoLugar}
                      onClick={handleCrearLugar}
                      className="h-10 px-3 flex items-center border-2 border-amber-600 dark:border-amber-300 bg-transparent text-amber-600 dark:text-amber-300 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 font-bold text-xs uppercase shrink-0 shadow-none disabled:opacity-50"
                    >
                      {creandoLugar ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Agregar"
                      )}
                    </Button>
                  </div>

                  <div className="bg-white dark:bg-neutral-900 border border-amber-100 dark:border-amber-900 rounded-lg flex-1 overflow-y-auto">
                    {!sectorSeleccionado ? (
                      <p className="text-xs text-gray-400 p-3 text-center italic">
                        Selecciona un sector para ver sus lugares
                      </p>
                    ) : lugaresFiltrados.length === 0 && !puedeCrearLugar ? (
                      <p className="text-xs text-gray-400 p-3 text-center">
                        {lugarExactoEnSector ? (
                          <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded-md border border-red-100">
                            ⚠️ ESTE LUGAR YA EXISTE EN ESTE SECTOR
                          </span>
                        ) : (
                          "No hay lugares en este sector"
                        )}
                      </p>
                    ) : (
                      <>
                        {lugaresFiltrados.map((l) => (
                          <div
                            key={l.id}
                            className="px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1 border-b border-gray-50 dark:border-neutral-800 last:border-0"
                          >
                            {editandoLugarId === l.id ? (
                              <>
                                <input
                                  type="text"
                                  value={editandoLugarNombre}
                                  onChange={(e) =>
                                    setEditandoLugarNombre(e.target.value)
                                  }
                                  className="flex-1 h-8 px-2 border border-amber-300 dark:border-amber-700 rounded text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleGuardarLugar();
                                    if (e.key === "Escape")
                                      cancelarEdicionLugar();
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={guardandoLugar}
                                  onClick={handleGuardarLugar}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                >
                                  {guardandoLugar ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelarEdicionLugar}
                                  className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <MapPin className="w-3 h-3 text-amber-400 shrink-0 ml-1" />
                                <span className="flex-1">{l.nombre}</span>
                                <button
                                  type="button"
                                  onClick={() => iniciarEdicionLugar(l)}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEliminarLugar(l)}
                                  className="p-1.5 mr-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {!sectorSeleccionado && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 italic">
                      Selecciona un sector existente para poder gestionar sus
                      lugares.
                    </p>
                  )}

                  <div className="pt-4 border-t border-amber-100 dark:border-amber-900 mt-4 flex flex-col gap-3">
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium italic text-center">
                      * Los cambios en sectores y lugares se guardan
                      automáticamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 ${showMetas ? "md:grid-cols-2 gap-8" : ""} items-stretch`}
        >
          <div
            className={`relative flex flex-col justify-center items-center select-none text-center h-full  pt-4 sm:pt-0 pb-2 sm:pb-4  transition-all duration-300 rounded-xl ${!showMetas ? "max-w-4xl mx-auto" : ""}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key="view-lider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col relative w-full items-center"
              >
                <h1 className="text-2xl md:text-4xl font-bold text-center leading-tight bg-gradient-to-r from-blue-800 via-blue-400 to-blue-800 bg-[length:200%_auto] text-transparent bg-clip-text animate-text-shine">
                  {currentConfig.nombre_candidato || "Sin nombre asignado"}
                </h1>

                {currentConfig.frase && (
                  <p className="mt-2 text-base md:text-lg text-blue-500 font-medium italic opacity-80 text-center">
                    "{currentConfig.frase}"
                  </p>
                )}

                <div className="flex flex-col items-center mt-4 w-full">
                  <span className="text-sm md:text-base font-bold text-blue-300 uppercase tracking-widest flex items-center gap-2">
                    <span className="h-[1px] w-6 bg-blue-200"></span>
                    {currentConfig.lugar || "Sin lugar"}
                    <span className="h-[1px] w-6 bg-blue-200"></span>
                  </span>

                  {(rol === "SUPER" ||
                    rol === "ADMINISTRADOR" ||
                    rol === "ADMIN") &&
                    currentConfig.objetivo_total > 0 &&
                    currentConfig.meta_por_lider > 0 && (
                      <div className="mt-2 bg-blue-50/50 dark:bg-blue-950/40 px-4 py-1.5 rounded-full border border-blue-100/50 dark:border-blue-800/50">
                        <p className="text-xs md:text-lg font-black text-blue-900/60 dark:text-blue-300/80 uppercase tracking-tight">
                          Se requieren{" "}
                          <span className="text-blue-600 text-sm md:text-2xl">
                            {Math.ceil(
                              currentConfig.objetivo_total /
                                currentConfig.meta_por_lider,
                            )}{" "}
                            líderes
                          </span>{" "}
                          para la meta
                        </p>
                      </div>
                    )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {showMetas && (
            <div className="relative flex flex-col justify-center items-center select-none text-center h-full min-h-[140px] p-4 transition-all duration-300 rounded-xl cursor-default">
              <div className="flex flex-col items-center">
                <motion.div
                  key="view-metas"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-row relative w-full items-center justify-center gap-12"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Objetivo Total
                    </span>
                    <span className="text-xl md:text-2xl font-black text-blue-700">
                      {currentConfig.objetivo_total
                        ? currentConfig.objetivo_total.toLocaleString()
                        : "0"}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Meta por Líder
                    </span>
                    <span className="text-xl md:text-2xl font-black text-blue-500">
                      {currentConfig.meta_por_lider
                        ? currentConfig.meta_por_lider.toLocaleString()
                        : "0"}
                    </span>
                  </div>
                </motion.div>
                {currentConfig.objetivo_total > 0 &&
                  currentConfig.meta_por_lider > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 text-xs font-bold text-blue-900 uppercase tracking-widest"
                    >
                      {Math.ceil(
                        currentConfig.objetivo_total /
                          currentConfig.meta_por_lider,
                      )}{" "}
                      <span className="text-gray-500">líderes nesesarios</span>
                    </motion.p>
                  )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
