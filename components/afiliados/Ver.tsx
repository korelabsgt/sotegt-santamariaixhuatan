"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  FileBarChart,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  Fragment,
  type ReactNode,
  useRef,
  useState,
} from "react";
import {
  PiBriefcaseDuotone,
  PiBuildingsDuotone,
  PiChatCircleDotsDuotone,
  PiClipboardTextDuotone,
  PiCodeDuotone,
  PiMedalDuotone,
  PiShieldCheckDuotone,
  PiUsersThreeDuotone,
} from "react-icons/pi";

import ConfiguracionSistema from "../dashboard/ConfiguracionSistema";
import EstadisticasTabs from "./estadisticas/EstadisticasTabs";

import { SignupForm } from "@/components/admin/sign-up/SignForm";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import AfiliadosGeneral from "./AfiliadosGeneral";
import Celula from "./Celula";
import Difusion from "./Difusion";
import Lideres from "./Lideres";
import MetaGeneral from "./MetaGeneral";
import ModalBienvenida from "./ModalBienvenida";
import Padron from "./Padron";
import type { Afiliado, Lider } from "./esquemas";
import { esRolEmpleado, esUsuarioSede } from "./esquemas";
import Form from "./forms/afiliados/Afiliados";
import ReporteLideresClasificacion from "./reportes/ReporteLideresClasificacion";
import { eliminar } from "./acciones";
import { swalNoEliminarCelula } from "@/lib/swalTheme";
import { obtenerAfiliadosAction } from "./actions/afiliados";
import { obtenerConfiguracionAction } from "@/components/dashboard/actions/configuracion";
import { AFILIADOS_SIMULADOS, LIDER_SIMULADO } from "./datosSimulados";

type Lugar = {
  id: number;
  nombre: string;
  sector_id: number | null;
  sector_nombre: string | null;
};

type Tab =
  | "Sede"
  | "Lideres"
  | "Afiliados"
  | "Trabajadores"
  | "Padron"
  | "Administrativos"
  | "Mensajes";

import { useQuery, useQueryClient } from "@tanstack/react-query";

const TAB_THEMES: Record<
  Tab,
  {
    activeText: string;
    activeIconBg: string;
    activeIconText: string;
    lineBg: string;
  }
> = {
  Sede: {
    activeText: "text-blue-700 dark:text-blue-400",
    activeIconBg: "bg-blue-100 dark:bg-blue-950/60",
    activeIconText: "text-blue-700 dark:text-blue-400",
    lineBg: "bg-blue-500 dark:bg-blue-400",
  },
  Lideres: {
    activeText: "text-orange-600 dark:text-orange-400",
    activeIconBg: "bg-orange-100 dark:bg-orange-950/60",
    activeIconText: "text-orange-600 dark:text-orange-400",
    lineBg: "bg-orange-500 dark:bg-orange-400",
  },
  Afiliados: {
    activeText: "text-sky-600 dark:text-sky-400",
    activeIconBg: "bg-sky-100 dark:bg-sky-950/60",
    activeIconText: "text-sky-600 dark:text-sky-400",
    lineBg: "bg-sky-500 dark:bg-sky-400",
  },
  Trabajadores: {
    activeText: "text-violet-600 dark:text-violet-400",
    activeIconBg: "bg-violet-100 dark:bg-violet-950/60",
    activeIconText: "text-violet-600 dark:text-violet-400",
    lineBg: "bg-violet-500 dark:bg-violet-400",
  },
  Padron: {
    activeText: "text-teal-700 dark:text-teal-400",
    activeIconBg: "bg-teal-100 dark:bg-teal-950/60",
    activeIconText: "text-teal-700 dark:text-teal-400",
    lineBg: "bg-teal-500 dark:bg-teal-400",
  },
  Administrativos: {
    activeText: "text-indigo-600 dark:text-indigo-400",
    activeIconBg: "bg-indigo-100 dark:bg-indigo-950/60",
    activeIconText: "text-indigo-600 dark:text-indigo-400",
    lineBg: "bg-indigo-500 dark:bg-indigo-400",
  },
  Mensajes: {
    activeText: "text-green-600 dark:text-green-400",
    activeIconBg: "bg-green-100 dark:bg-green-950/60",
    activeIconText: "text-green-600 dark:text-green-400",
    lineBg: "bg-green-500 dark:bg-green-400",
  },
};

const tabEase = [0.25, 0.46, 0.45, 0.94] as const;

const TAB_ORDER: Tab[] = [
  "Sede",
  "Lideres",
  "Trabajadores",
  "Afiliados",
  "Padron",
  "Administrativos",
  "Mensajes",
];

const tabBtnClass = (active: boolean, tab: Tab) => {
  const theme = TAB_THEMES[tab];
  return `relative flex w-full md:w-auto md:shrink-0 flex-col md:flex-row items-center justify-center gap-0.5 md:gap-1.5 px-1 md:px-3 py-1.5 md:py-2 text-[10px] leading-tight md:text-sm font-semibold bg-transparent transition-colors duration-300 ${
    active
      ? `z-10 ${theme.activeText}`
      : `z-0 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200`
  }`;
};

const tabIconClass = (active: boolean, tab: Tab) => {
  const theme = TAB_THEMES[tab];
  return `flex items-center justify-center p-0.5 md:p-1 rounded-md transition-colors duration-300 shrink-0 ${
    active
      ? `${theme.activeIconBg} ${theme.activeIconText}`
      : "text-gray-400 dark:text-gray-500"
  }`;
};

export default function Ver() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("Sede");
  const [tabSlideDir, setTabSlideDir] = useState(1);
  const prevTabRef = useRef<Tab>("Sede");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEstadisticasOpen, setIsEstadisticasOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isReportesLideresOpen, setIsReportesLideresOpen] = useState(false);
  const [signupFormKey, setSignupFormKey] = useState(0);
  const [modoCrearSede, setModoCrearSede] = useState(false);
  const [rolCreacionInicial, setRolCreacionInicial] = useState<
    "LIDER" | "EMPLEADO" | "ADMIN" | "SUPER" | null
  >(null);

  const [afiliadoParaEditar, setAfiliadoParaEditar] = useState<Afiliado | null>(
    null,
  );
  const [liderAEditar, setLiderAEditar] = useState<Lider | null>(null);
  const [liderParaCelula, setLiderParaCelula] = useState<Lider | null>(null);
  const [liderParaNuevoAfiliado, setLiderParaNuevoAfiliado] = useState<
    string | null
  >(null);
  const [familiarDeIdParaNuevo, setFamiliarDeIdParaNuevo] = useState<
    string | null
  >(null);

  const [isFirstMemberAddition, setIsFirstMemberAddition] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [liderSimulado, setLiderSimulado] = useState<Lider | null>(null);

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Error al cargar datos");
        return null;
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const session = dashboardData?.session;
  const rol = session?.rol || "";
  const userId = session?.id || "";
  const rolUpper = (rol || "").toUpperCase();

  const puedeVerBotonNuevo =
    rolUpper === "ADMIN" ||
    rolUpper === "ADMINISTRADOR" ||
    rolUpper === "SUPER";
  const puedeCrearRolSuper = rolUpper === "SUPER";
  const puedeSimular =
    rolUpper === "ADMINISTRADOR" ||
    rolUpper === "ADMIN" ||
    rolUpper === "SUPER" ||
    rolUpper === "DOCUMENTADOR";
  const esAdminOSuper =
    rolUpper === "ADMINISTRADOR" ||
    rolUpper === "ADMIN" ||
    rolUpper === "SUPER";
  const puedeVerReportesLideres = rolUpper === "ADMIN" || rolUpper === "SUPER";
  const esSedeSesion =
    rolUpper === "SEDE" ||
    (!!session &&
      esUsuarioSede({
        nombres: session.nombres,
        apellidos: session.apellidos,
        email: session.email,
        rol: session.rol,
      }));
  const vistaConPestanas = esAdminOSuper || esSedeSesion;
  const soloLecturaSede = esSedeSesion;
  const esLider = rolUpper === "LIDER";

  const handleSimular = () => {
    setLiderSimulado((prev) => (prev ? null : LIDER_SIMULADO));
  };

  const { data: configSis } = useQuery({
    queryKey: ["config_sistema"],
    queryFn: () => obtenerConfiguracionAction(),
    staleTime: 5 * 60_000,
    refetchOnMount: false,
  });

  const padronHabilitado = configSis?.padron === true;

  const { data: afiliados = [], isPending: isLoadingAfiliados } = useQuery({
    queryKey: ["afiliados-gl"],
    queryFn: () => obtenerAfiliadosAction(),
    enabled:
      isEstadisticasOpen ||
      (vistaConPestanas &&
        (activeTab === "Afiliados" ||
          activeTab === "Sede" ||
          !!liderParaCelula)) ||
      !vistaConPestanas ||
      (isReportesLideresOpen && puedeVerReportesLideres),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
  });

  const allUsers = (dashboardData?.usuarios || []) as Lider[];
  const allLideres = allUsers.filter(
    (u) =>
      (u.rol || "").toUpperCase() === "LIDER" ||
      (u.rol || "").toUpperCase() === "SEDE" ||
      esUsuarioSede(u),
  );
  const miPerfilDesdeLista = allUsers.find((l) => l.id === userId);
  const miPerfilGlobal: Lider | null =
    miPerfilDesdeLista ||
    (userId && session
      ? {
          id: userId,
          email: session.email || "",
          nombres: session.nombres || "",
          apellidos: session.apellidos || "",
          rol: session.rol || (esSedeSesion ? "SEDE" : ""),
          conteoAfiliados: 0,
        }
      : null);

  const rolesAdmin =
    rolUpper === "SUPER"
      ? ["ADMINISTRADOR", "SUPER", "ADMIN"]
      : ["ADMIN", "ADMINISTRADOR"];
  const administrativos = allUsers.filter((u) =>
    rolesAdmin.includes((u.rol || "").toUpperCase()),
  );
  const trabajadores = allUsers.filter((u) => esRolEmpleado(u.rol));
  const totalAfiliadosTrabajadores = trabajadores.reduce(
    (acc, u) => acc + (u.conteoAfiliados || 0),
    0,
  );
  const sedeUsuario =
    allUsers.find((u) => esUsuarioSede(u)) ||
    (esSedeSesion && miPerfilGlobal ? miPerfilGlobal : null);
  const totalAfiliadosSede = sedeUsuario?.conteoAfiliados || 0;
  const totalAfiliadosLideres = allUsers
    .filter((u) => (u.rol || "").toUpperCase() === "LIDER")
    .reduce((acc, u) => acc + (u.conteoAfiliados || 0), 0);
  const lugares = (dashboardData?.lugares || []) as Lugar[];

  const lideres = (() => {
    if (rolUpper === "LIDER" && userId) {
      const myLider = allLideres.find((l) => l.id === userId);
      const otherLideres = allLideres.filter((l) => l.id !== userId);
      return myLider ? [myLider, ...otherLideres] : allLideres;
    }
    return allLideres;
  })();

  const lideresBase = allUsers.filter(
    (u) => (u.rol || "").toUpperCase() === "LIDER",
  );

  const lideresVisibles = (() => {
    const base = liderSimulado ? [liderSimulado, ...lideres] : lideres;
    return base.filter(
      (l) => (l.rol || "").toUpperCase() !== "DOCUMENTADOR" && !esUsuarioSede(l),
    );
  })();

  const lideresParaFormulario = esAdminOSuper
    ? lideresVisibles
    : lideresVisibles.filter((l) => l.id === userId);

  const totalLideresRegistrados = lideresBase.length;
  const totalEmpleadosRegistrados = trabajadores.length;
  const totalAdministrativosRegistrados = administrativos.length;
  const totalMiembrosGeneral =
    totalAfiliadosSede + totalAfiliadosLideres + totalAfiliadosTrabajadores;

  const cargandoLideres = isDashboardLoading;
  const cargandoMiembros = isLoadingAfiliados || cargandoLideres;

  const fetchData = async () => {
    await queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    await queryClient.invalidateQueries({ queryKey: ["afiliados-lider"] });
    await queryClient.invalidateQueries({ queryKey: ["afiliados-gl"] });
    await queryClient.invalidateQueries({ queryKey: ["conteo_padron"] });
  };

  const refreshAfterDeletion = () => {
    void fetchData();
  };

  const handleOpenCreateUsuarioModal = (
    rol: "LIDER" | "EMPLEADO" | "ADMIN" | "SUPER",
  ) => {
    if (rol === "SUPER" && !puedeCrearRolSuper) return;
    setLiderAEditar(null);
    setModoCrearSede(false);
    setRolCreacionInicial(rol);
    setSignupFormKey((k) => k + 1);
    setIsSignupModalOpen(true);
  };

  const handleOpenCrearSedeModal = () => {
    setLiderAEditar(null);
    setModoCrearSede(true);
    setRolCreacionInicial(null);
    setSignupFormKey((k) => k + 1);
    setIsSignupModalOpen(true);
  };

  const handleOpenEditLiderModal = (lider: Lider) => {
    setLiderAEditar(lider);
    setModoCrearSede(false);
    setRolCreacionInicial(null);
    setSignupFormKey((k) => k + 1);
    setIsSignupModalOpen(true);
  };

  const handleSignupSuccess = () => {
    setIsSignupModalOpen(false);
    setLiderAEditar(null);
    setModoCrearSede(false);
    setRolCreacionInicial(null);
    void fetchData();
  };

  const handleCloseSignupModal = () => {
    setIsSignupModalOpen(false);
    setLiderAEditar(null);
    setModoCrearSede(false);
    setRolCreacionInicial(null);
  };

  const handleOpenAnadirAfiliadoModal = (
    liderId: string,
    isFirstMember = false,
    familiarDeId: string | null = null,
  ) => {
    setAfiliadoParaEditar(null);
    setLiderParaNuevoAfiliado(liderId);
    setIsFirstMemberAddition(isFirstMember);
    setFamiliarDeIdParaNuevo(familiarDeId);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (afiliado: Afiliado) => {
    setAfiliadoParaEditar(afiliado);
    setLiderParaNuevoAfiliado(null);
    setFamiliarDeIdParaNuevo(null);
    setIsFirstMemberAddition(false);
    setIsFormOpen(true);
  };

  const handleOpenCelula = (lider: Lider) => {
    if (!lider) return;
    setLiderParaCelula(lider);
  };

  const handleVolverDeCelula = () => {
    setLiderParaCelula(null);
  };

  const cambiarTab = (tab: Tab) => {
    if (
      soloLecturaSede &&
      (tab === "Mensajes" || tab === "Administrativos" || tab === "Padron")
    ) {
      return;
    }
    const prev = prevTabRef.current;
    const prevIdx = TAB_ORDER.indexOf(prev);
    const nextIdx = TAB_ORDER.indexOf(tab);
    setTabSlideDir(nextIdx >= prevIdx ? 1 : -1);
    prevTabRef.current = tab;
    setActiveTab(tab);
    setSearchTerm("");
    setLiderParaCelula(null);
  };

  const renderBarraPestana = (acciones?: ReactNode) => (
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 w-full min-w-0">
      <div className="relative flex-1 min-w-0 w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre"
          className="pl-9 md:pl-10 pr-3 py-2 h-10 text-sm border border-gray-300 dark:border-neutral-700 rounded-md w-full bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {acciones ? (
        <div className="flex flex-row items-center gap-2 shrink-0 w-full sm:w-auto">
          {acciones}
        </div>
      ) : null}
    </div>
  );

  const handleCloseFormModal = () => {
    setIsFormOpen(false);
  };

  const handleSaveAndCloseForm = async () => {
    setIsFormOpen(false);
    await fetchData();

    if (esLider) return;

    if (liderParaCelula) {
      const updatedLider = allUsers.find((l) => l.id === liderParaCelula.id);
      if (updatedLider) setLiderParaCelula(updatedLider);
    }
  };

  const rolSesionCelula = esSedeSesion ? "SEDE" : rol;

  return (
    <>
      {!isDashboardLoading && userId && (
        <ModalBienvenida
          userId={userId}
          conteoAfiliados={miPerfilGlobal?.conteoAfiliados || 0}
          nombreLider={miPerfilGlobal?.nombres || "Usuario"}
        />
      )}
      <div className="px-2 md:px-6 max-w-full overflow-x-hidden min-w-0 w-full">
        <ConfiguracionSistema showMetas={false} allowEditing={false} />
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0 w-full">
          <div
            className={`relative shrink-0 min-w-0 ${puedeSimular ? "group" : ""}`}
          >
            <h1
              className={`text-base sm:text-xl md:text-2xl font-bold text-black dark:text-white flex items-center gap-1.5 md:gap-2 ${
                puedeSimular
                  ? "cursor-pointer underline decoration-transparent underline-offset-[6px] decoration-2 transition-[text-decoration-color] duration-300 ease-in-out group-hover:decoration-black dark:group-hover:decoration-white"
                  : ""
              }`}
              onClick={puedeSimular ? handleSimular : undefined}
            >
              <span className="whitespace-nowrap">Gestión de Datos</span>
              <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-blue-600 shrink-0" />
            </h1>
            {puedeSimular && (
              <span className="pointer-events-none absolute left-0 top-full z-50 mt-2 scale-95 whitespace-nowrap rounded-md bg-gray-900/95 dark:bg-gray-100 dark:text-gray-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg translate-y-1 transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100 group-hover:translate-y-0 group-hover:delay-100">
                Click para simular un registro
              </span>
            )}
          </div>
          {vistaConPestanas && (
            <Button
              onClick={() => setIsEstadisticasOpen(true)}
              variant="outline"
              className="gap-1.5 h-10 px-3 text-sm font-bold border-blue-500 dark:border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 shadow-sm hover:bg-blue-200 dark:hover:bg-blue-900 hover:text-blue-900 dark:hover:text-blue-100 hover:shadow-md transition-all w-full sm:w-auto shrink-0"
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              Estadísticas
            </Button>
          )}
        </div>

        {isDashboardLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-14 bg-gray-100 dark:bg-neutral-800 rounded-lg" />
            <div className="h-32 bg-gray-100 dark:bg-neutral-800 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-44 bg-gray-100 dark:bg-neutral-800 rounded-lg"
                />
              ))}
            </div>
          </div>
        ) : !vistaConPestanas ? (
          <>
            <MetaGeneral
              totalSede={totalAfiliadosSede}
              totalLideres={totalAfiliadosLideres}
              totalTrabajadores={totalAfiliadosTrabajadores}
              objetivoTotal={configSis?.objetivo_total || 0}
            />
            {miPerfilGlobal ? (
              <Celula
                mode="embedded"
                lider={miPerfilGlobal}
                onEditar={handleOpenEditModal}
                onAnadirAfiliado={handleOpenAnadirAfiliadoModal}
                onDataChange={fetchData}
                rolUsuarioSesion={rolSesionCelula}
                usuarios={allUsers}
              />
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-8 border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
                No se encontró tu perfil de usuario.
              </div>
            )}
          </>
        ) : (
          <>
            <MetaGeneral
              totalSede={totalAfiliadosSede}
              totalLideres={totalAfiliadosLideres}
              totalTrabajadores={totalAfiliadosTrabajadores}
              objetivoTotal={configSis?.objetivo_total || 0}
            />
            <div className="mb-6 w-full min-w-0 bg-white dark:bg-neutral-950">
              <div className="relative w-full min-w-0 gap-0.5 md:gap-1 grid grid-cols-4 md:flex md:flex-nowrap md:items-stretch border-b border-gray-200 dark:border-neutral-700">
                {(
                  [
                    {
                      id: "Sede" as Tab,
                      label: "Sede",
                      count: totalAfiliadosSede,
                      icon: PiBuildingsDuotone,
                      show: true,
                    },
                    {
                      id: "Lideres" as Tab,
                      label: "Líderes",
                      count: totalLideresRegistrados,
                      icon: PiMedalDuotone,
                      show: true,
                    },
                    {
                      id: "Trabajadores" as Tab,
                      label: "Empleados",
                      count: totalEmpleadosRegistrados,
                      icon: PiBriefcaseDuotone,
                      show: true,
                    },
                    {
                      id: "Afiliados" as Tab,
                      label: "Miembros",
                      count: totalMiembrosGeneral,
                      icon: PiUsersThreeDuotone,
                      show: true,
                    },
                    {
                      id: "Padron" as Tab,
                      label: "Padrón",
                      count: null as number | null,
                      icon: PiClipboardTextDuotone,
                      show: esAdminOSuper && padronHabilitado,
                    },
                    {
                      id: "Administrativos" as Tab,
                      label: "Administrativos",
                      count: totalAdministrativosRegistrados,
                      icon: PiShieldCheckDuotone,
                      show: esAdminOSuper,
                    },
                    {
                      id: "Mensajes" as Tab,
                      label: "Mensajes",
                      count: null as number | null,
                      icon: PiChatCircleDotsDuotone,
                      show: esAdminOSuper,
                    },
                  ] as const
                )
                  .filter((t) => t.show)
                  .map((tab) => {
                    const Icon = tab.icon;
                    const activo = activeTab === tab.id;
                    const theme = TAB_THEMES[tab.id];
                    return (
                      <motion.button
                        key={tab.id}
                        type="button"
                        onClick={() => cambiarTab(tab.id)}
                        className={tabBtnClass(activo, tab.id)}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.25, ease: tabEase }}
                      >
                        <span
                          className={`relative z-10 ${tabIconClass(activo, tab.id)}`}
                        >
                          <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                        </span>
                        <span className="relative z-10 inline-flex items-center justify-center gap-1 md:gap-1.5 max-w-full">
                          <span className="text-center break-words hyphens-auto">
                            {tab.label}
                          </span>
                          {tab.count !== null && (
                            <span
                              className={`inline-flex items-center justify-center min-w-[1.15rem] h-4 md:min-w-[1.35rem] md:h-5 px-1 rounded-full text-[9px] md:text-[11px] font-black leading-none tabular-nums ${
                                activo
                                  ? `${theme.activeIconBg} ${theme.activeIconText}`
                                  : "bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-gray-400"
                              }`}
                            >
                              {tab.count > 999 ? "999+" : tab.count}
                            </span>
                          )}
                        </span>
                        {activo && (
                          <motion.span
                            layoutId="pestana-underline"
                            className={`pointer-events-none absolute left-1 right-1 md:left-2 md:right-2 bottom-0 h-0.5 rounded-full z-20 ${theme.lineBg}`}
                            transition={{
                              type: "spring",
                              stiffness: 380,
                              damping: 32,
                              mass: 0.7,
                            }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false} custom={tabSlideDir}>
              {liderParaCelula && activeTab !== "Sede" ? (
                <motion.div
                  key={`celula-${liderParaCelula.id}`}
                  custom={tabSlideDir}
                  initial={{ opacity: 0, x: tabSlideDir * 36 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: tabSlideDir * -28 }}
                  transition={{ duration: 0.45, ease: tabEase }}
                >
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={handleVolverDeCelula}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 hover:text-red-700 underline underline-offset-[6px] decoration-red-600/90 hover:decoration-red-700 uppercase tracking-wide bg-transparent border-0 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                      Volver
                    </button>
                  </div>
                  <Celula
                    mode="embedded"
                    lider={liderParaCelula}
                    onEditar={handleOpenEditModal}
                    onAnadirAfiliado={handleOpenAnadirAfiliadoModal}
                    onDataChange={fetchData}
                    rolUsuarioSesion={rolSesionCelula}
                    afiliadosSimulados={
                      liderParaCelula.simulado ? AFILIADOS_SIMULADOS : undefined
                    }
                    usuarios={allUsers}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  custom={tabSlideDir}
                  initial={{ opacity: 0, x: tabSlideDir * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: tabSlideDir * -32 }}
                  transition={{ duration: 0.45, ease: tabEase }}
                >
                  {activeTab === "Sede" &&
                    (sedeUsuario ? (
                      <>
                        {esAdminOSuper && (
                          <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                handleOpenEditLiderModal(sedeUsuario)
                              }
                              className="gap-1.5 h-9 px-3 text-sm border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60"
                            >
                              <Pencil className="w-4 h-4 shrink-0" />
                              Editar Sede
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                if ((sedeUsuario.conteoAfiliados || 0) > 0) {
                                  swalNoEliminarCelula();
                                  return;
                                }
                                void eliminar(
                                  sedeUsuario,
                                  refreshAfterDeletion,
                                );
                              }}
                              className="gap-1.5 h-9 px-3 text-sm border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                              Eliminar Sede
                            </Button>
                          </div>
                        )}
                        <Celula
                          mode="embedded"
                          lider={sedeUsuario}
                          onEditar={handleOpenEditModal}
                          onAnadirAfiliado={handleOpenAnadirAfiliadoModal}
                          onDataChange={fetchData}
                          rolUsuarioSesion={rolSesionCelula}
                          usuarios={allUsers}
                        />
                      </>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-blue-400/70 dark:border-blue-700 bg-blue-50/80 dark:bg-blue-950/20 px-4 py-6">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shrink-0">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-blue-900 dark:text-blue-200">
                              Aún no existe el usuario Sede
                            </p>
                            <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                              Créalo para afiliar desde sede y diferenciarlo del
                              avance de los líderes.
                            </p>
                          </div>
                        </div>
                        {esAdminOSuper && (
                          <Button
                            type="button"
                            onClick={handleOpenCrearSedeModal}
                            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Building2 className="h-4 w-4 mr-2" />
                            Crear Sede
                          </Button>
                        )}
                      </div>
                    ))}

                  {activeTab === "Lideres" && (
                    <>
                      {renderBarraPestana(
                        puedeVerBotonNuevo ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              handleOpenCreateUsuarioModal("LIDER")
                            }
                            className="gap-1.5 h-10 px-3 text-sm font-semibold border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-950/60 shadow-sm w-full sm:w-auto"
                          >
                            <PiMedalDuotone className="w-4 h-4 shrink-0" />
                            Nuevo Líder
                          </Button>
                        ) : undefined,
                      )}
                      <Lideres
                        lideres={lideresVisibles}
                        onVerCelula={handleOpenCelula}
                        onEditar={handleOpenEditLiderModal}
                        rolUsuarioSesion={rolSesionCelula}
                        onDataChange={refreshAfterDeletion}
                        searchTerm={searchTerm}
                        idUsuarioSesion={userId}
                        isLoading={cargandoLideres}
                      />
                    </>
                  )}
                  {activeTab === "Afiliados" && (
                    <>
                      {renderBarraPestana()}
                      <AfiliadosGeneral
                        afiliados={afiliados}
                        lideres={allUsers}
                        onEditar={handleOpenEditModal}
                        onDataChange={refreshAfterDeletion}
                        searchTerm={searchTerm}
                        isLoading={cargandoMiembros}
                      />
                    </>
                  )}
                  {activeTab === "Trabajadores" && (
                    <>
                      {renderBarraPestana(
                        puedeVerBotonNuevo ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              handleOpenCreateUsuarioModal("EMPLEADO")
                            }
                            className="gap-1.5 h-10 px-3 text-sm font-semibold border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-950/60 shadow-sm w-full sm:w-auto"
                          >
                            <PiBriefcaseDuotone className="w-4 h-4 shrink-0" />
                            Nuevo Empleado
                          </Button>
                        ) : undefined,
                      )}
                      <Lideres
                        lideres={trabajadores}
                        onVerCelula={handleOpenCelula}
                        onEditar={handleOpenEditLiderModal}
                        rolUsuarioSesion={rolSesionCelula}
                        onDataChange={refreshAfterDeletion}
                        searchTerm={searchTerm}
                        idUsuarioSesion={userId}
                        isLoading={cargandoLideres}
                      />
                    </>
                  )}
                  {activeTab === "Padron" &&
                    esAdminOSuper &&
                    padronHabilitado && <Padron />}
                  {activeTab === "Administrativos" && (
                    <>
                      {renderBarraPestana(
                        puedeVerBotonNuevo ? (
                          <>
                            {puedeVerReportesLideres && (
                              <Button
                                type="button"
                                variant="outline"
                                className="gap-1.5 h-10 px-3 text-sm font-semibold text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60"
                                onClick={() => setIsReportesLideresOpen(true)}
                              >
                                <FileBarChart className="w-4 h-4 shrink-0" />
                                Reportes
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                handleOpenCreateUsuarioModal("ADMIN")
                              }
                              className="gap-1.5 h-10 px-3 text-sm font-semibold border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 shadow-sm"
                            >
                              <PiShieldCheckDuotone className="w-4 h-4 shrink-0" />
                              Nuevo Admin
                            </Button>
                            {puedeCrearRolSuper && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  handleOpenCreateUsuarioModal("SUPER")
                                }
                                className="gap-1.5 h-10 px-3 text-sm font-semibold border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 shadow-sm"
                              >
                                <PiCodeDuotone className="w-4 h-4 shrink-0" />
                                Nuevo Super
                              </Button>
                            )}
                          </>
                        ) : undefined,
                      )}
                      <Lideres
                        lideres={administrativos}
                        onVerCelula={handleOpenCelula}
                        onEditar={handleOpenEditLiderModal}
                        rolUsuarioSesion={rolSesionCelula}
                        onDataChange={refreshAfterDeletion}
                        searchTerm={searchTerm}
                        idUsuarioSesion={userId}
                        isLoading={cargandoLideres}
                      />
                    </>
                  )}
                  {activeTab === "Mensajes" && esAdminOSuper && (
                    <Difusion
                      usuarios={allUsers}
                      puedeEnviar={esAdminOSuper}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      <Transition show={isEstadisticasOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsEstadisticasOpen(false)}
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="fixed inset-0 flex flex-col">
            <DialogPanel className="w-full h-full bg-white dark:bg-neutral-950 flex flex-col">
              <div className="flex justify-between items-center gap-4 px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-900/95 backdrop-blur-md z-10">
                <div className="flex flex-col min-w-0">
                  <h3 className="text-base md:text-xl font-black uppercase flex items-center gap-2 text-gray-900 dark:text-neutral-100 tracking-tight">
                    Estadísticas Generales
                    <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-neutral-500 font-bold uppercase mt-1 tracking-wide">
                    Análisis global de {afiliados.length} registros
                  </p>
                </div>
                <Button
                  onClick={() => setIsEstadisticasOpen(false)}
                  variant="ghost"
                  size="icon"
                  className="rounded-full shrink-0 h-9 w-9 border border-gray-200 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-400"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-neutral-950 px-4 py-4 md:px-6 md:py-6 lg:px-8">
                <div className="w-full">
                  <EstadisticasTabs
                    afiliados={afiliados}
                    mostrarOpcionSimular={puedeSimular}
                  />
                </div>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      </Transition>

      <Form
        isOpen={isFormOpen}
        onClose={handleCloseFormModal}
        onSave={handleSaveAndCloseForm}
        afiliadoAEditar={afiliadoParaEditar}
        liderPredefinidoId={liderParaNuevoAfiliado}
        lugares={lugares}
        lideres={lideresParaFormulario}
        afiliados={afiliados}
        isFirstMember={isFirstMemberAddition}
        familiarDeId={familiarDeIdParaNuevo}
        datosLider={lideresParaFormulario.find(
          (l) => l.id === liderParaNuevoAfiliado,
        )}
      />

      <ReporteLideresClasificacion
        open={isReportesLideresOpen && puedeVerReportesLideres}
        onClose={() => setIsReportesLideresOpen(false)}
        lideres={lideresBase}
        afiliados={afiliados}
        mostrarOpcionSimular={rolUpper === "SUPER"}
      />

      <Transition show={isSignupModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={handleCloseSignupModal}
        >
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
          </TransitionChild>
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-gray-200 dark:border-neutral-800">
                  <div className="p-4 md:p-6">
                    <SignupForm
                      key={signupFormKey}
                      initialData={liderAEditar}
                      onSuccess={handleSignupSuccess}
                      onClose={handleCloseSignupModal}
                      isModal
                      rolSesion={rol}
                      modoCrearSede={modoCrearSede}
                      rolInicial={rolCreacionInicial}
                    />
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
