"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { useState, useEffect, useId } from "react";
import type { Afiliado } from "../esquemas";
import {
  ChartTooltip,
  ChartHeader,
} from "./chartTheme";
import { useChartTheme } from "./useChartTheme";

interface Props {
  afiliados: Afiliado[];
}

export default function Edades({ afiliados }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const theme = useChartTheme();
  const uid = useId().replace(/:/g, "");
  const gradHombres = `gradHombres-${uid}`;
  const gradMujeres = `gradMujeres-${uid}`;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const rangos = [
    { name: "Jóvenes (18-30)", min: 18, max: 30, hombres: 0, mujeres: 0 },
    { name: "Adultos (31-60)", min: 31, max: 60, hombres: 0, mujeres: 0 },
    { name: "Mayores (61+)", min: 61, max: 150, hombres: 0, mujeres: 0 },
  ];

  let totalHombres = 0;
  let totalMujeres = 0;

  afiliados.forEach((af) => {
    if (af.sexo === "M") totalHombres++;
    else if (af.sexo === "F") totalMujeres++;

    const nacimiento = new Date(af.nacimiento);
    const edad = new Date().getFullYear() - nacimiento.getFullYear();
    const rango = rangos.find((r) => edad >= r.min && edad <= r.max);
    if (rango) {
      if (af.sexo === "M") rango.hombres++;
      else rango.mujeres++;
    }
  });

  const datos = [
    { name: "Total", hombres: totalHombres, mujeres: totalMujeres },
    ...rangos,
  ];

  return (
    <div className="w-full h-full flex flex-col">
      <ChartHeader
        title="Demografía del Grupo"
        subtitle="Distribución por rangos de edad y género"
        trailing={
          <span className="text-[10px] text-gray-500 dark:text-neutral-400 uppercase font-bold whitespace-nowrap tabular-nums">
            Total de registros: {afiliados.length}
          </span>
        }
      />

      <div className="flex-1 w-full min-h-[280px] overflow-x-auto overflow-y-hidden pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
        <ResponsiveContainer width="100%" height="100%" minHeight={280}>
          <BarChart data={datos} margin={{ top: 24, right: 12, left: -12, bottom: 8 }}>
            <defs>
              <linearGradient id={gradHombres} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id={gradMujeres} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f472b6" stopOpacity={1} />
                <stop offset="100%" stopColor="#db2777" stopOpacity={0.85} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={theme.grid}
              opacity={0.6}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fontWeight: 700, fill: theme.tick }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: theme.tick }}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: theme.cursor, radius: 8 }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: "11px", color: theme.tick, paddingBottom: 8 }}
            />
            <Bar
              dataKey="hombres"
              name="Hombres"
              fill={`url(#${gradHombres})`}
              radius={[8, 8, 0, 0]}
              barSize={isMobile ? 22 : 44}
              maxBarSize={48}
            >
              <LabelList
                dataKey="hombres"
                position="top"
                fill={theme.hombresLabel}
                fontSize={10}
                fontWeight="900"
                formatter={(v: number) => (v > 0 ? v : "")}
              />
            </Bar>
            <Bar
              dataKey="mujeres"
              name="Mujeres"
              fill={`url(#${gradMujeres})`}
              radius={[8, 8, 0, 0]}
              barSize={isMobile ? 22 : 44}
              maxBarSize={48}
            >
              <LabelList
                dataKey="mujeres"
                position="top"
                fill={theme.mujeresLabel}
                fontSize={10}
                fontWeight="900"
                formatter={(v: number) => (v > 0 ? v : "")}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
