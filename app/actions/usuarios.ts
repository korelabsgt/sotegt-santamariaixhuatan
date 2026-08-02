"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import supabaseAdmin from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { invalidateCachedAuthUsers } from "@/components/afiliados/actions/cache";

export const deleteUserAccountAction = async (userId: string) => {
  if (!userId) return { error: "ID de usuario no proporcionado." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id && user.id === userId) {
      return { error: "No puedes eliminar tu propio perfil." };
    }

    await supabaseAdmin.from("logs").delete().eq("user_id", userId);

    const { error: perfilError } = await supabaseAdmin
      .from("info_perfil")
      .delete()
      .eq("user_id", userId);

    if (perfilError) {
      console.error("Error al eliminar perfil de usuario:", perfilError.message);
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Error al eliminar usuario (auth):", error.message);
      return { error: error.message };
    }

    invalidateCachedAuthUsers();
    revalidatePath("/dashboard/usuarios");
    return { success: "Usuario eliminado correctamente." };
  } catch (err: any) {
    console.error("Error inesperado al eliminar cuenta:", err);
    return { error: "Error inesperado al eliminar la cuenta." };
  }
};

export const updateUsuarioAction = async (formData: FormData) => {
  const id = formData.get("id") as string;
  const nombres = formData.get("nombres") as string;
  const apellidos = formData.get("apellidos") as string;
  const emailRaw = (formData.get("email") as string | null)?.trim() || "";
  const email = emailRaw
    ? emailRaw.includes("@")
      ? emailRaw
      : `${emailRaw}@app.com`
    : "";
  const rol_id = formData.get("rol_id") as string;
  const password = formData.get("password") as string;
  const nivelCompromisoRaw = formData.get("nivel_compromiso");
  const nivel_compromiso =
    nivelCompromisoRaw === "bajo" ||
    nivelCompromisoRaw === "medio" ||
    nivelCompromisoRaw === "alto"
      ? nivelCompromisoRaw
      : undefined;

  if (!id) return { error: "ID de usuario no proporcionado." };

  const perfilUpdate: {
    nombres: string;
    apellidos: string;
    rol_id: number;
    nivel_compromiso?: "bajo" | "medio" | "alto";
  } = {
    nombres,
    apellidos,
    rol_id: parseInt(rol_id),
  };
  if (nivel_compromiso) perfilUpdate.nivel_compromiso = nivel_compromiso;

  const { error: updateError } = await supabaseAdmin
    .from("info_perfil")
    .update(perfilUpdate)
    .eq("user_id", id);

  if (updateError) return { error: updateError.message };

  const authUpdateData: {
    email?: string;
    password?: string;
    email_confirm?: boolean;
  } = {};
  if (email) {
    authUpdateData.email = email;
    authUpdateData.email_confirm = true;
  }
  if (password && password.trim() !== "") authUpdateData.password = password;

  if (Object.keys(authUpdateData).length > 0) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      authUpdateData,
    );
    if (authError) return { error: authError.message };
  }

  invalidateCachedAuthUsers();
  revalidatePath("/dashboard/usuarios");
  return { success: "Usuario actualizado correctamente" };
};

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const nombres = formData.get("nombres")?.toString();
  const apellidos = formData.get("apellidos")?.toString();
  const rol_id = formData.get("rol_id")?.toString();

  const supabase = await createClient();

  // Validamos solo los campos que quedaron
  if (!email || !password || !rol_id || !nombres || !apellidos) {
    return { error: "Todos los campos son obligatorios." };
  }

  // Ya no verificamos DPI aquí porque el líder lo registrará en la tabla afiliados después

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (
      error.message.includes("already been registered") ||
      error.status === 422
    ) {
      return { error: `El Usuario: ${email} ya está registrado.` };
    }
    return { error: error.message || "No se pudo crear la cuenta." };
  }

  if (!data?.user) return { error: "No se pudo crear la cuenta de usuario." };

  const user_id = data.user.id;

  const { error: errorPerfil } = await supabase.from("info_perfil").insert({
    user_id,
    nombres,
    apellidos,
    activo: true,
    rol_id: parseInt(rol_id, 10),
  });

  if (errorPerfil) {
    console.error("Error al insertar en info_perfil:", errorPerfil);
    await supabaseAdmin.auth.admin.deleteUser(user_id);
    return { error: "Error al guardar perfil. Se ha revertido la cuenta." };
  }

  invalidateCachedAuthUsers();
  revalidatePath("/dashboard/usuarios");
  return { success: "Usuario creado con éxito." };
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const traduccionErrores: Record<string, string> = {
      "Invalid login credentials": "Usuario o contraseña incorrectos.",
      "Email not confirmed":
        "Debe confirmar su Usuario antes de iniciar sesión.",
      "User is banned": "Este usuario ha sido suspendido.",
    };
    return { error: traduccionErrores[error.message] || error.message };
  }

  const { data: perfil, error: errorPerfil } = await supabase
    .from("info_perfil")
    .select("activo")
    .eq("user_id", data.user?.id)
    .maybeSingle();

  if (errorPerfil || !perfil) {
    await supabase.auth.signOut();
    return { error: "No se encontró un perfil asociado o está inactivo." };
  }

  if (!perfil.activo) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta está desactivada." };
  }

  return redirect("/protected");
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) return { error: "Campos requeridos." };
  if (password !== confirmPassword)
    return { error: "Las contraseñas no coinciden." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Error al actualizar." };

  return { success: "Contraseña restablecida." };
};

export async function obtenerEmailUsuarioAction(userId: string): Promise<string> {
  if (!userId) return "";

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (error || !data?.user?.email) return "";

  return data.user.email.replace(/@.*$/, "");
}

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/");
};
