export type NivelCompromisoLabel = "Alto" | "Cumple" | "Medio" | "Bajo";

export interface NivelCompromisoVisual {
  nivel: NivelCompromisoLabel;
  colorBarra: string;
  textoColor: string;
  bordeCard: string;
  gifUrl: string;
  mensaje: string;
}

export function calcularNivelCompromiso(
  total: number,
  metaCelula: number,
  metaMinima: number,
  nombreLider?: string,
  etiquetaRol = "Líder",
): NivelCompromisoVisual {
  const objetivo = metaCelula;

  if (total > metaCelula) {
    return {
      nivel: "Alto",
      colorBarra: "bg-green-500",
      textoColor: "text-green-600 dark:text-green-400",
      bordeCard: "border-green-500 dark:border-green-500",
      gifUrl: "/gif/afiliados/gif5.gif",
      mensaje: `🏆 ¡Objetivo superado! ${total} miembros. ¡Excelente trabajo!`,
    };
  }

  if (total === metaCelula) {
    return {
      nivel: "Cumple",
      colorBarra: "bg-blue-600",
      textoColor: "text-blue-600 dark:text-blue-400",
      bordeCard: "border-blue-600 dark:border-blue-500",
      gifUrl: "/gif/afiliados/gif5.gif",
      mensaje: `🏆 ¡Objetivo alcanzado! ${total} miembros. ¡Excelente trabajo!`,
    };
  }

  if (total >= metaMinima && total < metaCelula) {
    return {
      nivel: "Medio",
      colorBarra: "bg-yellow-500",
      textoColor: "text-yellow-600 dark:text-yellow-400",
      bordeCard: "border-yellow-500 dark:border-yellow-500",
      gifUrl: "/gif/afiliados/gif3.gif",
      mensaje: `😎 ¡Casi llegamos a la meta! Somos ${total} de ${objetivo}.`,
    };
  }

  if (total === 1) {
    return {
      nivel: "Bajo",
      colorBarra: "bg-red-500",
      textoColor: "text-red-600 dark:text-red-400",
      bordeCard: "border-red-500 dark:border-red-500",
      gifUrl: "/gif/afiliados/gif2.gif",
      mensaje: `🎉 ¡${etiquetaRol} registrado! Añade a tus familiares y amigos.`,
    };
  }

  if (total === 0) {
    const esSede = (etiquetaRol || "").toUpperCase() === "SEDE";
    return {
      nivel: "Bajo",
      colorBarra: "bg-gray-300 dark:bg-neutral-600",
      textoColor: "text-red-600 dark:text-red-400",
      bordeCard: "border-gray-400 dark:border-neutral-500",
      gifUrl: "/gif/afiliados/gif1.gif",
      mensaje: esSede
        ? "👋 ¡Bienvenido! Empieza añadiendo integrantes a la sede."
        : `👋 ¡Hola ${nombreLider ?? etiquetaRol}! Inicia tu grupo registrándote a ti mismo.`,
    };
  }

  return {
    nivel: "Bajo",
    colorBarra: "bg-red-500",
    textoColor: "text-red-600 dark:text-red-400",
    bordeCard: "border-red-500 dark:border-red-500",
    gifUrl: "/gif/afiliados/gif2.gif",
    mensaje: `🚀 ¡Vamos por buen camino! Somos ${total} de ${objetivo}.`,
  };
}
