export type PartesFecha = {
  anio: number;
  mes: number;
  dia: number;
};

export function partesFechaNacimiento(
  nacimiento: string | null | undefined,
): PartesFecha | null {
  if (!nacimiento) return null;
  const s = nacimiento.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    return {
      anio: Number(iso[1]),
      mes: Number(iso[2]),
      dia: Number(iso[3]),
    };
  }
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (dmy) {
    return {
      anio: Number(dmy[3]),
      mes: Number(dmy[2]),
      dia: Number(dmy[1]),
    };
  }
  const fecha = new Date(s);
  if (Number.isNaN(fecha.getTime())) return null;
  return {
    anio: fecha.getUTCFullYear(),
    mes: fecha.getUTCMonth() + 1,
    dia: fecha.getUTCDate(),
  };
}

export function fechaNacimientoInputValue(
  nacimiento: string | null | undefined,
): string {
  const p = partesFechaNacimiento(nacimiento);
  if (!p) return "";
  return `${p.anio}-${String(p.mes).padStart(2, "0")}-${String(p.dia).padStart(2, "0")}`;
}

export function formatearFechaNacimiento(
  nacimiento: string | null | undefined,
): string {
  const p = partesFechaNacimiento(nacimiento);
  if (!p) return "—";
  return `${String(p.dia).padStart(2, "0")}/${String(p.mes).padStart(2, "0")}/${p.anio}`;
}

export function calcularEdadNacimiento(
  nacimiento: string | null | undefined,
  referencia: Date = new Date(),
): number | null {
  const p = partesFechaNacimiento(nacimiento);
  if (!p) return null;
  let edad = referencia.getFullYear() - p.anio;
  const mes = referencia.getMonth() + 1 - p.mes;
  if (mes < 0 || (mes === 0 && referencia.getDate() < p.dia)) edad -= 1;
  return edad < 0 ? null : edad;
}

export function etiquetaEdadNacimiento(
  nacimiento: string | null | undefined,
): string {
  const edad = calcularEdadNacimiento(nacimiento);
  return edad === null ? "—" : `${edad} años`;
}
