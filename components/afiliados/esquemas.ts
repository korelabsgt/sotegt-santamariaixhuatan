import { z } from "zod";

export interface Lider {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  rol: string;
  nivel_compromiso?: "bajo" | "medio" | "alto" | null;
  conteoAfiliados?: number;
  conteoTitulares?: number;
  conteoFamiliares?: number;
  simulado?: boolean;
}

export function esUsuarioSede(lider: {
  nombres?: string | null;
  apellidos?: string | null;
  email?: string | null;
  rol?: string | null;
}): boolean {
  if ((lider.rol || "").trim().toUpperCase() === "SEDE") return true;

  const nombres = (lider.nombres || "").trim().toLowerCase();
  const apellidos = (lider.apellidos || "").trim().toLowerCase();
  const nombreCompleto = `${nombres} ${apellidos}`.trim();
  const emailLocal = (lider.email || "").split("@")[0].trim().toLowerCase();

  return (
    nombres === "sede" ||
    nombreCompleto === "sede" ||
    nombreCompleto.startsWith("sede ") ||
    emailLocal === "sede"
  );
}

export function esRolEmpleado(rol?: string | null) {
  const r = (rol || "").toUpperCase();
  return r === "EMPLEADO" || r === "TRABAJADOR";
}

export const POLITICAS = [
  "Obras de Infraestructura",
  "Red Vial",
  "Educación",
  "Medio Ambiente",
  "Desarrollo Económico Local",
  "Servicios Públicos",
  "de Seguridad",
  "Salud",
] as const;

export const afiliadoSchema = z.object({
  nombres: z.string().min(2, "Requerido"),
  apellidos: z.string().min(2, "Requerido"),
  telefono: z
    .string()
    .min(8, "Requerido y debe tener 8 dígitos numéricos")
    .refine((val) => val.length === 8 && /^\d+$/.test(val), {
      message: "Debe tener 8 dígitos numéricos",
    }),
  telefono2: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || (val.length === 8 && /^\d+$/.test(val)), {
      message: "Debe tener 8 dígitos numéricos",
    }),
  telefono3: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || (val.length === 8 && /^\d+$/.test(val)), {
      message: "Debe tener 8 dígitos numéricos",
    }),
  dpi: z
    .string()
    .length(13, "Debe tener 13 dígitos")
    .regex(/^\d+$/, "Solo números"),
  nacimiento: z.string().min(1, "Requerido"),
  sexo: z.enum(["M", "F"]),
  lugar_id: z.number().min(1, "Seleccione un lugar"),
  lider_id: z.string().uuid().nullable(),
  politica_id: z.number().min(1, "Programa de interés es requerido"),
  sub_politica_id: z.number().nullable().optional(),
  empadronado: z.boolean().optional(),
  no_padron: z.string().min(1, "El No. de Padrón es obligatorio"),
  religion: z.string().min(1, "Religión es requerida"),
  religion_otra: z.string().optional(),
  condicion_especial: z.string().optional().nullable(),
});

// Definimos AfiliadoFormData directamente desde Zod
export type AfiliadoFormData = z.infer<typeof afiliadoSchema>;

export interface Afiliado extends AfiliadoFormData {
  id: string;
  created_at: string;
  lider_nombre: string | null;
  lider_email: string | null;
  lugar_nombre: string | null;
  sector_nombre?: string | null;
  sector_id?: number | null;
  conteoAfiliados?: number;
  politica?: string | null;
  sub_politica?: string | null;
  telefono2?: string | null;
  telefono3?: string | null;
  condicion_especial?: string | null;
  familiar_de?: string | null;
  es_lider?: boolean | null;
  img?: string | null;
  dpi_frontal_url?: string | null;
  dpi_reverso_url?: string | null;
}
