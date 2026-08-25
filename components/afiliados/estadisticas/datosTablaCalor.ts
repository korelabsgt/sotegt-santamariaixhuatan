import type { Afiliado } from "../esquemas";

export type FilaAoAExcel = readonly (string | number)[];

export type HojaExcel = {
  nombre: string;
  filas: FilaAoAExcel[];
};

export type FilaTablaCalor = {
  etiqueta: string;
  celdas: number[];
  esTotal?: boolean;
};

export type TablaCalorData = {
  titulo: string;
  columnas: string[];
  filas: FilaTablaCalor[];
  nombreArchivo: string;
  nombreHoja: string;
  hojasExcel?: HojaExcel[];
  dividirGruposEnColumnas?: boolean;
};

function pct(valor: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((valor / total) * 1000) / 10;
}

export function buildTablaEdades(afiliados: Afiliado[]): TablaCalorData {
  const rangos = [
    { etiqueta: "Jóvenes (18-30)", min: 18, max: 30, hombres: 0, mujeres: 0 },
    { etiqueta: "Adultos (31-60)", min: 31, max: 60, hombres: 0, mujeres: 0 },
    { etiqueta: "Mayores (61+)", min: 61, max: 150, hombres: 0, mujeres: 0 },
  ];

  let totalHombres = 0;
  let totalMujeres = 0;

  afiliados.forEach((af) => {
    if (af.sexo === "M") totalHombres++;
    else if (af.sexo === "F") totalMujeres++;

    const edad = new Date().getFullYear() - new Date(af.nacimiento).getFullYear();
    const rango = rangos.find((r) => edad >= r.min && edad <= r.max);
    if (!rango) return;
    if (af.sexo === "M") rango.hombres++;
    else rango.mujeres++;
  });

  const filasRango = rangos.map((r) => ({
    etiqueta: r.etiqueta,
    celdas: [r.hombres, r.mujeres, r.hombres + r.mujeres],
  }));

  return {
    titulo: "Distribución por edad y género",
    columnas: ["Hombres", "Mujeres", "Total"],
    filas: [
      {
        etiqueta: "Total",
        celdas: [totalHombres, totalMujeres, totalHombres + totalMujeres],
      },
      ...filasRango,
    ],
    nombreArchivo: "estadisticas-edades",
    nombreHoja: "Edades",
  };
}

export function buildTablaReligion(afiliados: Afiliado[]): TablaCalorData {
  const conteo: Record<string, number> = {};
  afiliados.forEach((af) => {
    const rel = af.religion || "Sin especificar";
    conteo[rel] = (conteo[rel] || 0) + 1;
  });

  const total = afiliados.length;
  const filas = Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .map(([etiqueta, valor]) => ({
      etiqueta,
      celdas: [valor, pct(valor, total)],
    }));

  return {
    titulo: "Distribución por religión",
    columnas: ["Cantidad", "%"],
    filas,
    nombreArchivo: "estadisticas-religion",
    nombreHoja: "Religion",
  };
}

export function buildTablaCondicion(afiliados: Afiliado[]): TablaCalorData {
  const conteo: Record<string, number> = {};
  afiliados.forEach((af) => {
    const c = af.condicion_especial || "Sin especificar";
    conteo[c] = (conteo[c] || 0) + 1;
  });

  const total = afiliados.length;
  const filas = Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .map(([etiqueta, valor]) => ({
      etiqueta,
      celdas: [valor, pct(valor, total)],
    }));

  return {
    titulo: "Distribución por condición especial",
    columnas: ["Cantidad", "%"],
    filas,
    nombreArchivo: "estadisticas-condicion",
    nombreHoja: "Condicion",
  };
}

export function buildTablaIntereses(afiliados: Afiliado[]): TablaCalorData {
  const conteo: Record<string, Record<string, number>> = {};

  afiliados.forEach((af) => {
    const politica = af.politica || "Sin programa";
    const sub = af.sub_politica || "Sin sub-programa";
    if (!conteo[politica]) conteo[politica] = {};
    conteo[politica][sub] = (conteo[politica][sub] || 0) + 1;
  });

  const total = afiliados.length;
  const filas: FilaTablaCalor[] = [];
  const hojaPrincipal: (string | number)[][] = [
    ["Programa / Sub-programa", "Cantidad", "%"],
  ];
  const hojasPoliticas: HojaExcel[] = [];

  const politicasOrdenadas = Object.entries(conteo)
    .map(([politica, subs]) => {
      const subsOrdenadas = Object.entries(subs).sort((a, b) => b[1] - a[1]);
      const totalPolitica = subsOrdenadas.reduce((s, [, v]) => s + v, 0);
      return { politica, subsOrdenadas, totalPolitica };
    })
    .sort((a, b) => b.totalPolitica - a.totalPolitica);

  politicasOrdenadas.forEach(({ politica, subsOrdenadas, totalPolitica }) => {
    hojaPrincipal.push([politica, totalPolitica, pct(totalPolitica, total)]);

    subsOrdenadas.forEach(([sub, valor]) => {
      filas.push({
        etiqueta: `${politica} · ${sub}`,
        celdas: [valor, pct(valor, total)],
      });
      hojaPrincipal.push([`  ${sub}`, valor, pct(valor, total)]);
    });

    filas.push({
      etiqueta: `Total · ${politica}`,
      celdas: [totalPolitica, pct(totalPolitica, total)],
      esTotal: true,
    });

    hojasPoliticas.push({
      nombre: politica,
      filas: [
        ["Sub-programa", "Cantidad", "% del programa"],
        ...subsOrdenadas.map(([sub, valor]) => [
          sub,
          valor,
          pct(valor, totalPolitica),
        ]),
        ["Total del programa", totalPolitica, 100],
      ],
    });
  });

  return {
    titulo: "Distribución por interés y sub-programa",
    columnas: ["Cantidad", "%"],
    filas,
    nombreArchivo: "estadisticas-intereses",
    nombreHoja: "Intereses",
    hojasExcel: [{ nombre: "Intereses", filas: hojaPrincipal }, ...hojasPoliticas],
    dividirGruposEnColumnas: true,
  };
}

export function buildTablaUbicacion(afiliados: Afiliado[]): TablaCalorData {
  const conteo: Record<string, { sector: string; count: number }> = {};

  afiliados.forEach((af) => {
    const lugar = af.lugar_nombre || "Sin especificar";
    const sector = af.sector_nombre || "Sin clasificar";
    if (!conteo[lugar]) conteo[lugar] = { sector, count: 0 };
    conteo[lugar].count++;
  });

  const total = afiliados.length;
  const filas = Object.entries(conteo)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([lugar, { sector, count }]) => ({
      etiqueta: `${sector} · ${lugar}`,
      celdas: [count, pct(count, total)],
    }));

  return {
    titulo: "Distribución por lugar",
    columnas: ["Cantidad", "%"],
    filas,
    nombreArchivo: "estadisticas-ubicacion",
    nombreHoja: "Ubicacion",
  };
}

export function buildTablaUbicacionMatriz(afiliados: Afiliado[]): TablaCalorData {
  const porSector: Record<string, Record<string, number>> = {};

  afiliados.forEach((af) => {
    const sector = af.sector_nombre || "Sin clasificar";
    const lugar = af.lugar_nombre || "Sin especificar";
    if (!porSector[sector]) porSector[sector] = {};
    porSector[sector][lugar] = (porSector[sector][lugar] || 0) + 1;
  });

  const sectores = Object.keys(porSector).sort();
  const lugares = [
    ...new Set(
      afiliados.map((af) => af.lugar_nombre || "Sin especificar"),
    ),
  ].sort();

  const filas = sectores.map((sector) => ({
    etiqueta: sector,
    celdas: lugares.map((lugar) => porSector[sector]?.[lugar] ?? 0),
  }));

  return {
    titulo: "Mapa de calor por sector y lugar",
    columnas: lugares,
    filas,
    nombreArchivo: "estadisticas-ubicacion-matriz",
    nombreHoja: "Ubicacion",
  };
}
