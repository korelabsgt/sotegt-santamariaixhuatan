"use server";

import { createClient } from "@/utils/supabase/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { enviarNotificacionPush } from "@/lib/push";
import { calcularNivelCompromiso } from "@/lib/nivelCompromiso";

interface EnviarMensajeInput {
  titulo?: string;
  mensaje: string;
  publico_objetivo: string;
  usuarios_especificos?: string[];
  ruta?: string;
}

function calcularNivel(
  conteo: number,
  metaCelula: number,
  metaMinima: number,
): string {
  if (conteo > metaCelula) return "Alto";
  if (conteo === metaCelula) return "Cumple";
  if (conteo >= metaMinima) return "Medio";
  return "Bajo";
}

async function resolverUserIdsPorNivel(nivel: string): Promise<string[]> {
  const [configRes, perfilesRes, conteoRes] = await Promise.all([
    supabaseAdmin
      .from("sis_configuracion")
      .select("meta_celula, meta_celula_minima, meta_por_lider")
      .single(),
    supabaseAdmin.from("info_perfil").select("user_id"),
    supabaseAdmin.from("afiliados").select("lider_id").not("lider_id", "is", null),
  ]);

  const metaCelula =
    configRes.data?.meta_por_lider ?? configRes.data?.meta_celula ?? 15;
  const metaMinima = configRes.data?.meta_celula_minima ?? 10;

  const conteoMap = new Map<string, number>();
  (conteoRes.data || []).forEach((row: { lider_id: string | null }) => {
    if (row.lider_id) {
      conteoMap.set(row.lider_id, (conteoMap.get(row.lider_id) || 0) + 1);
    }
  });

  return (perfilesRes.data || [])
    .map((p: { user_id: string }) => p.user_id)
    .filter(
      (uid) =>
        calcularNivel(conteoMap.get(uid) || 0, metaCelula, metaMinima).toUpperCase() ===
        nivel.toUpperCase(),
    );
}

function nombreRolDesdeRelacion(
  roles:
    | { nombre?: string | null }
    | { nombre?: string | null }[]
    | null
    | undefined,
): string {
  if (!roles) return "";
  if (Array.isArray(roles)) return (roles[0]?.nombre || "").toUpperCase();
  return (roles.nombre || "").toUpperCase();
}

async function resolverUserIdsPorRol(roles: string[]): Promise<string[]> {
  const rolesUpper = new Set(roles.map((r) => r.toUpperCase()));
  const { data } = await supabaseAdmin
    .from("info_perfil")
    .select("user_id, roles!inner(nombre)");

  const filas = (data ?? []) as Array<{
    user_id: string;
    roles?:
      | { nombre?: string | null }
      | { nombre?: string | null }[]
      | null;
  }>;

  return filas
    .filter((p) => {
      const nombre = nombreRolDesdeRelacion(p.roles);
      if (rolesUpper.has(nombre)) return true;
      if (rolesUpper.has("EMPLEADO") && nombre === "TRABAJADOR") return true;
      if (rolesUpper.has("LIDER") && nombre === "LÍDER") return true;
      return false;
    })
    .map((p) => p.user_id);
}

export async function enviarMensajeAction(input: EnviarMensajeInput) {
  const {
    titulo,
    mensaje,
    publico_objetivo,
    usuarios_especificos = [],
    ruta,
  } = input;

  const supabase = await createClient();
  const rutaFinal = ruta?.trim() || "/";

  const { data, error } = await supabase
    .from("sis_mensajes")
    .insert({
      titulo: titulo?.trim() || null,
      mensaje,
      publico_objetivo,
      usuarios_especificos,
      ruta: rutaFinal,
      activo: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  let push = { enviadas: 0, fallidas: 0 };
  try {
    let userIds: string[] | undefined;
    if (publico_objetivo === "Todos") {
      userIds = undefined;
    } else if (publico_objetivo === "Usuarios Específicos") {
      userIds = usuarios_especificos;
    } else if (publico_objetivo === "Lideres") {
      userIds = await resolverUserIdsPorRol(["LIDER", "LÍDER"]);
    } else if (publico_objetivo === "Empleados") {
      userIds = await resolverUserIdsPorRol(["EMPLEADO", "TRABAJADOR"]);
    } else {
      userIds = await resolverUserIdsPorNivel(publico_objetivo);
    }

    push = await enviarNotificacionPush({
      titulo: titulo?.trim() || "Nueva difusión SOTE",
      mensaje,
      ruta: rutaFinal,
      userIds,
      tag: data.id,
    });
  } catch (pushError) {
    console.error("[mensajes] Error enviando notificación push:", pushError);
  }

  return { mensaje: data, push };
}

function mensajeAplicaAlUsuario(
  mensaje: {
    publico_objetivo: string;
    usuarios_especificos?: string[] | null;
  },
  userId: string,
  nivelCompromiso: string,
  rolUsuario = "",
) {
  if (mensaje.publico_objetivo === "Todos") return true;
  if (mensaje.publico_objetivo === "Usuarios Específicos") {
    return mensaje.usuarios_especificos?.includes(userId) ?? false;
  }
  const pub = (mensaje.publico_objetivo || "").toUpperCase();
  const rol = (rolUsuario || "").toUpperCase();
  if (pub === "LIDERES" || pub === "LÍDERES") {
    return rol === "LIDER" || rol === "LÍDER";
  }
  if (pub === "EMPLEADOS") {
    return rol === "EMPLEADO" || rol === "TRABAJADOR";
  }
  return pub === (nivelCompromiso || "").toUpperCase();
}

async function obtenerRolUsuario(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  const { data: perfil } = await supabase
    .from("info_perfil")
    .select("roles(nombre)")
    .eq("user_id", userId)
    .single();

  return nombreRolDesdeRelacion(
    (perfil as { roles?: { nombre?: string } | { nombre?: string }[] | null } | null)
      ?.roles,
  );
}

async function obtenerMensajesPendientesParaUsuario(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  nivelCompromiso: string,
) {
  const { data: mensajes, error: errorMensaje } = await supabase
    .from("sis_mensajes")
    .select("*")
    .eq("activo", true)
    .order("created_at", { ascending: false });

  if (errorMensaje || !mensajes?.length) return [];

  const [{ data: lecturas }, rolUsuario] = await Promise.all([
    supabase
      .from("sis_mensajes_lecturas")
      .select("mensaje_id")
      .eq("user_id", userId),
    obtenerRolUsuario(supabase, userId),
  ]);

  const leidosIds = new Set((lecturas || []).map((l) => l.mensaje_id));

  return mensajes.filter(
    (m) =>
      !leidosIds.has(m.id) &&
      mensajeAplicaAlUsuario(m, userId, nivelCompromiso, rolUsuario),
  );
}

export async function obtenerMensajePendienteAction(
  userId: string,
  nivelCompromiso: string,
) {
  if (!userId) return null;

  const supabase = await createClient();
  const pendientes = await obtenerMensajesPendientesParaUsuario(
    supabase,
    userId,
    nivelCompromiso,
  );

  return pendientes[0] ?? null;
}

export async function contarMensajesPendientesAction(
  userId: string,
  nivelCompromiso: string,
) {
  if (!userId) return 0;

  const supabase = await createClient();
  const pendientes = await obtenerMensajesPendientesParaUsuario(
    supabase,
    userId,
    nivelCompromiso,
  );

  return pendientes.length;
}

export async function marcarLeidoAction(mensajeId: string, userId: string) {
  if (!userId || !mensajeId) return;

  const supabase = await createClient();

  const { error } = await supabase.from("sis_mensajes_lecturas").insert({
    mensaje_id: mensajeId,
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function obtenerNivelCompromisoLider(userId: string): Promise<string> {
  const [configRes, conteoRes] = await Promise.all([
    supabaseAdmin
      .from("sis_configuracion")
      .select("meta_celula, meta_celula_minima, meta_por_lider")
      .single(),
    supabaseAdmin
      .from("afiliados")
      .select("id", { count: "exact", head: true })
      .eq("lider_id", userId),
  ]);

  const total = conteoRes.count ?? 0;
  const metaCelula =
    configRes.data?.meta_por_lider ?? configRes.data?.meta_celula ?? 15;
  const metaMinima = configRes.data?.meta_celula_minima ?? 10;

  return calcularNivelCompromiso(total, metaCelula, metaMinima).nivel;
}

export async function obtenerHistorialMensajesAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  const { data: perfil } = await supabase
    .from("info_perfil")
    .select("roles(nombre)")
    .eq("user_id", user.id)
    .single();

  const rol = nombreRolDesdeRelacion(
    (perfil as { roles?: { nombre?: string } | { nombre?: string }[] | null } | null)
      ?.roles,
  );

  const { data: mensajes, error } = await supabase
    .from("sis_mensajes")
    .select(`
      *,
      sis_mensajes_lecturas (
        user_id,
        leido_en
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const lista = mensajes ?? [];

  if (
    rol === "LIDER" ||
    rol === "LÍDER" ||
    rol === "EMPLEADO" ||
    rol === "TRABAJADOR"
  ) {
    const nivelCompromiso = await obtenerNivelCompromisoLider(user.id);
    return lista.filter((m) =>
      mensajeAplicaAlUsuario(m, user.id, nivelCompromiso, rol),
    );
  }

  return lista;
}
