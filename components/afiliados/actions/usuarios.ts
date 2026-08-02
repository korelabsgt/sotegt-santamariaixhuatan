"use server";

import { createClient } from "@/utils/supabase/server";
import { getCachedAuthUsers } from "./cache";

export async function listarUsuariosAction(rol_filtro?: string | string[]) {
  const supabase = await createClient();

  const queryPerfiles = supabase
    .from("info_perfil")
    .select(`
      user_id, 
      nombres, 
      apellidos, 
      activo, 
      rol_id,
      nivel_compromiso,
      roles!inner ( id, nombre )
    `)
    .order("nombres", { ascending: true });

  let filtroPerfiles = queryPerfiles;

  if (rol_filtro) {
    if (Array.isArray(rol_filtro)) {
      filtroPerfiles = queryPerfiles.in("roles.nombre", rol_filtro);
    } else {
      filtroPerfiles = queryPerfiles.eq("roles.nombre", rol_filtro);
    }
  }

  const [perfilesRes, conteoRes] = await Promise.all([
    filtroPerfiles,
    supabase.from("afiliados").select("lider_id, familiar_de"),
  ]);

  if (perfilesRes.error) throw new Error(perfilesRes.error.message);

  const perfiles = perfilesRes.data || [];
  const authUsers = await getCachedAuthUsers();
  const emailMap = new Map(authUsers.map((u) => [u.id, u.email || ""]));

  const conteoMap = new Map<string, { total: number; titulares: number; familiares: number }>();

  const conteoRaw = conteoRes.data || [];
  conteoRaw.forEach((row) => {
    if (row.lider_id) {
      const current = conteoMap.get(row.lider_id) || { total: 0, titulares: 0, familiares: 0 };
      current.total++;
      if (row.familiar_de) {
        current.familiares++;
      } else {
        current.titulares++;
      }
      conteoMap.set(row.lider_id, current);
    }
  });

  return perfiles.map((p: any) => ({
    id: p.user_id,
    email: (emailMap.get(p.user_id) || "").replace(/@.*$/, "") || "",
    nombres: p.nombres,
    apellidos: p.apellidos,
    activo: p.activo,
    rol: p.roles?.nombre,
    rol_id: p.rol_id,
    nivel_compromiso: p.nivel_compromiso,
    conteoAfiliados: conteoMap.get(p.user_id)?.total || 0,
    conteoTitulares: conteoMap.get(p.user_id)?.titulares || 0,
    conteoFamiliares: conteoMap.get(p.user_id)?.familiares || 0,
  }));
}
