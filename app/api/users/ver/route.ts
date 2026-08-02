import { NextResponse } from "next/server";
import supabaseAdmin from "@/utils/supabase/admin";

export async function POST(req: Request) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
  }

  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from("info_perfil")
    .select(
      `
      *,
      roles (nombre)
    `,
    )
    .eq("user_id", id)
    .single();

  const { data: userResult, error: userError } =
    await supabaseAdmin.auth.admin.getUserById(id);

  if (perfilError || userError || !perfil || !userResult?.user) {
    console.error("Error al buscar usuario:", perfilError || userError);
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const user = userResult.user;

  return NextResponse.json({
    usuario: {
      id: user.id,
      email: user.email,
      nombres: perfil.nombres || "",
      apellidos: perfil.apellidos || "",
      rol: perfil.roles?.nombre || null,
      rol_id: perfil.rol_id || null,
      activo: perfil.activo ?? true,
    },
  });
}
