"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Briefcase,
  Download,
  Medal,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import * as XLSX from "xlsx";
import type { Afiliado, Lider } from "./esquemas";
import { esUsuarioSede } from "./esquemas";
import { formatearDpi, TelefonoInline } from "./contacto";
import { etiquetaEdadNacimiento } from "./fechaNacimiento";
import { Button } from "@/components/ui/button";

interface Props {
  afiliados: Afiliado[];
  lideres: Lider[];
  onEditar: (afiliado: Afiliado) => void;
  onDataChange: () => void;
  searchTerm: string;
  isLoading?: boolean;
}

type GrupoTipo = "todos" | "sede" | "lider" | "trabajador";

type GrupoAfiliados = {
  lider: Lider;
  afiliados: Afiliado[];
  tipo: Exclude<GrupoTipo, "todos">;
};

const CATEGORIAS: Array<{
  tipo: GrupoTipo;
  titulo: string;
  icon: typeof Building2;
  active: string;
  idle: string;
  rowActive: string;
}> = [
  {
    tipo: "todos",
    titulo: "Todos",
    icon: Users,
    active:
      "bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-200/50 dark:shadow-none",
    idle: "bg-white dark:bg-neutral-900 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40",
    rowActive: "bg-sky-50 dark:bg-sky-950/40",
  },
  {
    tipo: "sede",
    titulo: "Sede",
    icon: Building2,
    active:
      "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200/50 dark:shadow-none",
    idle: "bg-white dark:bg-neutral-900 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40",
    rowActive: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    tipo: "lider",
    titulo: "Líderes",
    icon: Medal,
    active:
      "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200/50 dark:shadow-none",
    idle: "bg-white dark:bg-neutral-900 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/40",
    rowActive: "bg-orange-50 dark:bg-orange-950/30",
  },
  {
    tipo: "trabajador",
    titulo: "Empleado",
    icon: Briefcase,
    active:
      "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200/50 dark:shadow-none",
    idle: "bg-white dark:bg-neutral-900 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-950/40",
    rowActive: "bg-violet-50 dark:bg-violet-950/30",
  },
];

function esRolEmpleado(rol: string | null | undefined) {
  const r = (rol || "").toUpperCase();
  return r === "EMPLEADO" || r === "TRABAJADOR";
}

function tipoDeLider(lider: Lider): Exclude<GrupoTipo, "todos"> {
  if (esUsuarioSede(lider)) return "sede";
  if (esRolEmpleado(lider.rol)) return "trabajador";
  return "lider";
}

function etiquetaGrupo(tipo: Exclude<GrupoTipo, "todos">) {
  if (tipo === "sede") return "Sede";
  if (tipo === "trabajador") return "Empleado";
  return "Líder";
}

function normalizarNombre(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function compararNombres(a: string, b: string) {
  return normalizarNombre(a).localeCompare(normalizarNombre(b), "es");
}

function calcularEdad(fechaNacimiento: string) {
  return etiquetaEdadNacimiento(fechaNacimiento);
}

function filaExcel(
  afiliado: Afiliado,
  liderNombre: string,
  grupo: string,
) {
  return {
    Nombre: `${afiliado.nombres} ${afiliado.apellidos}`.trim(),
    DPI: afiliado.dpi || "",
    Teléfono: afiliado.telefono || "",
    Edad: calcularEdad(afiliado.nacimiento),
    Sexo: afiliado.sexo || "",
    Ubicación: afiliado.lugar_nombre || "",
    Empadronado: afiliado.empadronado ? "Sí" : "No",
    "No. Padrón": afiliado.no_padron || "",
    Líder: liderNombre,
    Grupo: grupo,
  };
}

function AfiliadosSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 w-36 bg-gray-100 dark:bg-neutral-800 rounded-xl"
          />
        ))}
      </div>
      <div className="h-64 bg-gray-100 dark:bg-neutral-800 rounded-xl" />
    </div>
  );
}

export default function AfiliadosGeneral({
  afiliados,
  lideres,
  searchTerm,
  isLoading = false,
}: Props) {
  const [categoria, setCategoria] = useState<GrupoTipo>("todos");
  const [liderSeleccionadoId, setLiderSeleccionadoId] = useState<string | null>(
    null,
  );

  const grupos = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const grouped = new Map<string, Afiliado[]>();

    afiliados.forEach((afiliado) => {
      if (!afiliado.lider_id) return;
      const fullName =
        `${afiliado.nombres} ${afiliado.apellidos}`.toLowerCase();
      const dpi = afiliado.dpi || "";
      if (searchTerm && !fullName.includes(term) && !dpi.includes(term)) {
        return;
      }
      if (!grouped.has(afiliado.lider_id)) {
        grouped.set(afiliado.lider_id, []);
      }
      grouped.get(afiliado.lider_id)?.push(afiliado);
    });

    const result: GrupoAfiliados[] = [];

    lideres.forEach((lider) => {
      const tipo = tipoDeLider(lider);
      const rol = (lider.rol || "").toUpperCase();

      if (tipo === "sede") {
        result.push({
          lider,
          afiliados: grouped.get(lider.id) || [],
          tipo: "sede",
        });
        return;
      }
      if (esRolEmpleado(rol)) {
        result.push({
          lider,
          afiliados: grouped.get(lider.id) || [],
          tipo: "trabajador",
        });
        return;
      }
      if (rol === "LIDER") {
        result.push({
          lider,
          afiliados: grouped.get(lider.id) || [],
          tipo: "lider",
        });
      }
    });

    return result.sort((a, b) =>
      compararNombres(
        `${a.lider.nombres} ${a.lider.apellidos}`,
        `${b.lider.nombres} ${b.lider.apellidos}`,
      ),
    );
  }, [afiliados, lideres, searchTerm]);

  const conteosCategoria = useMemo(() => {
    const map: Record<GrupoTipo, number> = {
      todos: 0,
      sede: 0,
      lider: 0,
      trabajador: 0,
    };
    grupos.forEach((g) => {
      map[g.tipo] += g.afiliados.length;
      map.todos += g.afiliados.length;
    });
    return map;
  }, [grupos]);

  const gruposDeCategoria = useMemo(() => {
    if (categoria === "todos") return [];
    return grupos.filter((g) => g.tipo === categoria);
  }, [grupos, categoria]);

  const miembrosTodos = useMemo(() => {
    const rows: Array<{
      afiliado: Afiliado;
      liderNombre: string;
      grupo: string;
    }> = [];

    grupos.forEach((g) => {
      const liderNombre = `${g.lider.nombres} ${g.lider.apellidos}`.trim();
      const grupo = etiquetaGrupo(g.tipo);
      g.afiliados.forEach((a) => {
        rows.push({ afiliado: a, liderNombre, grupo });
      });
    });

    return rows.sort((a, b) =>
      compararNombres(
        `${a.afiliado.nombres} ${a.afiliado.apellidos}`,
        `${b.afiliado.nombres} ${b.afiliado.apellidos}`,
      ),
    );
  }, [grupos]);

  useEffect(() => {
    setLiderSeleccionadoId(null);
  }, [categoria, searchTerm]);

  const grupoActivo = useMemo(
    () =>
      gruposDeCategoria.find((g) => g.lider.id === liderSeleccionadoId) || null,
    [gruposDeCategoria, liderSeleccionadoId],
  );

  const categoriaCfg =
    CATEGORIAS.find((c) => c.tipo === categoria) || CATEGORIAS[0];

  const descargarExcel = () => {
    const porTipo = {
      sede: [] as ReturnType<typeof filaExcel>[],
      lider: [] as ReturnType<typeof filaExcel>[],
      trabajador: [] as ReturnType<typeof filaExcel>[],
    };

    grupos.forEach((g) => {
      const liderNombre = `${g.lider.nombres} ${g.lider.apellidos}`.trim();
      const grupo = etiquetaGrupo(g.tipo);
      const ordenados = [...g.afiliados].sort((a, b) =>
        compararNombres(
          `${a.nombres} ${a.apellidos}`,
          `${b.nombres} ${b.apellidos}`,
        ),
      );
      ordenados.forEach((a) => {
        porTipo[g.tipo].push(filaExcel(a, liderNombre, grupo));
      });
    });

    const todos = [...porTipo.sede, ...porTipo.lider, ...porTipo.trabajador].sort(
      (a, b) => compararNombres(a.Nombre, b.Nombre),
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(todos),
      "Todos",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(porTipo.sede),
      "Sede",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(porTipo.lider),
      "Lideres",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(porTipo.trabajador),
      "Empleados",
    );

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `miembros_${fecha}.xlsx`);
  };

  if (isLoading) return <AfiliadosSkeleton />;

  if (grupos.every((g) => g.afiliados.length === 0) && afiliados.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 mt-8 border dark:border-neutral-700 rounded-lg p-4">
        No se encontraron miembros.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon;
            const activo = categoria === cat.tipo;
            const total = conteosCategoria[cat.tipo];
            return (
              <button
                key={cat.tipo}
                type="button"
                onClick={() => {
                  setCategoria(cat.tipo);
                  setLiderSeleccionadoId(null);
                }}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${
                  activo ? cat.active : cat.idle
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{cat.titulo}</span>
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                    activo
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {total}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={descargarExcel}
          className="gap-2 font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          <Download className="h-4 w-4" />
          Descargar Excel
        </Button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {categoria === "todos" ? (
          <motion.div
            key="lista-todos"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm"
          >
            {miembrosTodos.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                No hay miembros{searchTerm ? " para esta búsqueda" : ""}.
              </div>
            ) : (
              <table className="min-w-full text-xs">
                <thead className="bg-sky-50 dark:bg-sky-950/40">
                  <tr>
                    <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                      No.
                    </th>
                    <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                      Nombre
                    </th>
                    <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                      DPI
                    </th>
                    <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                      Teléfono
                    </th>
                    <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                      Edad
                    </th>
                    <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                      Ubicación
                    </th>
                    <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                      Líder
                    </th>
                    <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                      Grupo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                  {miembrosTodos.map((row, index) => (
                    <tr
                      key={row.afiliado.id}
                      className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 uppercase"
                    >
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap font-bold text-gray-900 dark:text-gray-100">
                        {row.afiliado.nombres} {row.afiliado.apellidos}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap font-mono">
                        {row.afiliado.dpi
                          ? formatearDpi(row.afiliado.dpi)
                          : "—"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap font-mono normal-case">
                        <TelefonoInline
                          telefono={row.afiliado.telefono || ""}
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap font-bold">
                        {calcularEdad(row.afiliado.nacimiento)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {row.afiliado.lugar_nombre || "—"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap font-semibold text-sky-700 dark:text-sky-400">
                        {row.liderNombre}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {row.grupo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.div>
        ) : gruposDeCategoria.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="rounded-xl border border-dashed border-gray-200 dark:border-neutral-700 px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
          >
            No hay {categoriaCfg.titulo.toLowerCase()}
            {searchTerm ? " para esta búsqueda" : ""}.
          </motion.div>
        ) : !grupoActivo ? (
          <motion.div
            key={`lista-${categoria}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm"
          >
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-neutral-800">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-300 uppercase text-xs">
                    No.
                  </th>
                  <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-300 uppercase text-xs">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-right font-bold text-gray-600 dark:text-gray-300 uppercase text-xs">
                    Miembros
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                {gruposDeCategoria.map(({ lider, afiliados: list }, index) => (
                  <tr
                    key={lider.id}
                    onClick={() => setLiderSeleccionadoId(lider.id)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-900 dark:text-gray-100 uppercase">
                      {lider.nombres} {lider.apellidos}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-black text-gray-800 dark:text-gray-200">
                      {list.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ) : (
          <motion.div
            key={`celula-${grupoActivo.lider.id}`}
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-3"
          >
            <button
              type="button"
              onClick={() => setLiderSeleccionadoId(null)}
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a {categoriaCfg.titulo}
            </button>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm">
              <div
                className={`flex items-center justify-between gap-3 px-4 py-3 border-b dark:border-neutral-800 ${categoriaCfg.rowActive}`}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Célula de
                  </p>
                  <h3 className="text-sm md:text-base font-black uppercase truncate text-gray-900 dark:text-gray-100">
                    {grupoActivo.lider.nombres} {grupoActivo.lider.apellidos}
                  </h3>
                </div>
                <span className="shrink-0 text-sm font-black text-gray-800 dark:text-gray-200">
                  {grupoActivo.afiliados.length} miembro
                  {grupoActivo.afiliados.length === 1 ? "" : "s"}
                </span>
              </div>

              {grupoActivo.afiliados.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  Este líder aún no tiene miembros
                  {searchTerm ? " que coincidan con la búsqueda" : ""}.
                </div>
              ) : (
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100 dark:bg-neutral-800">
                    <tr>
                      <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                        No.
                      </th>
                      <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                        Nombre
                      </th>
                      <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                        DPI
                      </th>
                      <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                        Teléfono
                      </th>
                      <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                        Edad
                      </th>
                      <th className="px-4 py-2 text-left font-bold text-gray-600 dark:text-gray-300 uppercase">
                        Ubicación
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                    {[...grupoActivo.afiliados]
                      .sort((a, b) =>
                        compararNombres(
                          `${a.nombres} ${a.apellidos}`,
                          `${b.nombres} ${b.apellidos}`,
                        ),
                      )
                      .map((afiliado, index) => (
                        <motion.tr
                          key={afiliado.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.22,
                            delay: Math.min(index * 0.02, 0.24),
                            ease: [0.25, 0.46, 0.45, 0.94],
                          }}
                          className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 uppercase"
                        >
                          <td className="px-4 py-2 whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {index + 1}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap font-bold text-gray-900 dark:text-gray-100">
                            {afiliado.nombres} {afiliado.apellidos}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap font-mono">
                            {afiliado.dpi ? formatearDpi(afiliado.dpi) : "—"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap font-mono normal-case">
                            <TelefonoInline
                              telefono={afiliado.telefono || ""}
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap font-bold">
                            {calcularEdad(afiliado.nacimiento)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {afiliado.lugar_nombre || "—"}
                          </td>
                        </motion.tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
