import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { getCachedAuthUsers } from "@/components/afiliados/actions/cache";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [profileRes, perfilesRes, conteoRes, lugaresRes, sectoresRes] =
    await Promise.all([
      supabase
        .from("info_perfil")
        .select("nombres, apellidos, rol_id, roles ( nombre )")
        .eq("user_id", user.id)
        .single(),

      supabase
        .from("info_perfil")
        .select(
          "user_id, nombres, apellidos, activo, rol_id, roles!inner ( id, nombre )",
        )
        .order("nombres", { ascending: true }),

      supabase
        .from("afiliados")
        .select("lider_id, familiar_de")
        .not("lider_id", "is", null),

      supabase
        .from("lugares")
        .select("id, nombre, sector_id")
        .order("nombre", { ascending: true }),

      supabase.from("sectores").select("id, nombre"),
    ]);

  const profileAny = profileRes.data as {
    roles?: { nombre?: string };
  } | null;

  const sessionData = {
    id: user.id,
    email: user.email || "",
    nombres: profileRes.data?.nombres || "",
    apellidos: profileRes.data?.apellidos || "",
    rol: profileAny?.roles?.nombre || "",
    rol_id: profileRes.data?.rol_id || null,
  };

  const perfiles = perfilesRes.data || [];
  const conteoRaw = conteoRes.data || [];
  const sectores = sectoresRes.data || [];
  const sectorMap = new Map(sectores.map((s) => [s.id, s.nombre]));
  const authUsers = await getCachedAuthUsers();
  const emailMap = new Map(authUsers.map((u) => [u.id, u.email || ""]));

  const conteoMap = new Map<
    string,
    { total: number; titulares: number; familiares: number }
  >();

  conteoRaw.forEach((row) => {
    if (row.lider_id) {
      const current = conteoMap.get(row.lider_id) || {
        total: 0,
        titulares: 0,
        familiares: 0,
      };
      current.total++;
      if (row.familiar_de) {
        current.familiares++;
      } else {
        current.titulares++;
      }
      conteoMap.set(row.lider_id, current);
    }
  });

  const usuarios = perfiles.map((p: any) => ({
    id: p.user_id,
    email: emailMap.get(p.user_id) || "",
    nombres: p.nombres,
    apellidos: p.apellidos,
    activo: p.activo,
    rol: p.roles?.nombre,
    rol_id: p.rol_id,
    conteoAfiliados: conteoMap.get(p.user_id)?.total || 0,
    conteoTitulares: conteoMap.get(p.user_id)?.titulares || 0,
    conteoFamiliares: conteoMap.get(p.user_id)?.familiares || 0,
  }));

  const lugares = (lugaresRes.data || []).map((l) => ({
    id: l.id,
    nombre: l.nombre,
    sector_id: l.sector_id ?? null,
    sector_nombre: l.sector_id ? sectorMap.get(l.sector_id) || null : null,
  }));

  return NextResponse.json({
    session: sessionData,
    usuarios,
    lugares,
  });
}
