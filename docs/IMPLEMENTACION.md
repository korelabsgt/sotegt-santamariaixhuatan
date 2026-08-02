---
description: Resumen de cambios (SEDE por contexto, pestañas underline, Nuevo por tab, SignForm cards, Lideres UI, mensajes TS, no auto-delete) para replicar en otro proyecto
alwaysApply: false
---

# Portar cambios — sesión afiliados / roles / UI

## Dependencias

```bash
pnpm add xlsx
# ya usados: sweetalert2, html-to-image, framer-motion
```

---

## 1. Usuario de acceso vacío al editar perfil

**Problema:** Al editar, nombres/rol cargaban pero “Usuario de acceso” quedaba vacío.

**Causa:** En `/api/dashboard` (y actions similares) el email iba hardcodeado como `""` porque no se leía de Auth.

**Fix:**

- Usar `getCachedAuthUsers()` (`listUsers` admin + caché 5 min) y mapear `email` por `user_id`.
- Archivos: `app/api/dashboard/route.ts`, `components/afiliados/actions/dashboard.ts`, `components/afiliados/actions/usuarios.ts`.
- En `SignForm.tsx` el usuario se muestra como local-part: `email.replace(/@.*$/, "")`.
- En `app/api/users/ver/route.ts` devolver `nombres` / `apellidos` (no solo `nombre`) para `EditarUsuarioForm`.

---

## 2. SweetAlert: Maximum call stack size exceeded

**Archivo:** `lib/swal.ts`

**Causa:** `Object.assign(Swal, { fire })` hacía que `fire` se llamara a sí mismo.

**Fix:** Guardar referencia al fire nativo **antes** del override:

```ts
const nativeFire = SwalBase.fire.bind(SwalBase);
// dentro del wrapper: return nativeFire(withTheme(...));
```

---

## 3. Rol SEDE: ver pestañas, permisos por contexto

**Reglas de negocio:**

| Rol                 | Vista                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| SUPER / ADMIN       | Todas las pestañas + editar/eliminar (incl. usuario Sede)                    |
| SEDE                | Sede, Líderes, Empleados, Miembros — **sin** Administrativos/Mensajes/Padrón |
| Resto (LIDER, etc.) | Meta + su célula                                                             |

**Detección SEDE:** rol `SEDE` **o** `esUsuarioSede({ nombres, apellidos, email, rol })` (nombre “Sede …”, email `sede@…`).

**Permisos SEDE (refinado):**

| Contexto                            | Crear/editar afiliados | Ver célula líder/empleado |
| ----------------------------------- | ---------------------- | ------------------------- |
| **Su propia célula** (pestaña Sede) | Sí                     | —                         |
| Células de líderes/empleados        | No (solo lectura)      | Sí                        |

**Implementación:**

```ts
const celulaEsSede = !!lider && esUsuarioSede(lider);
const soloLectura = esSedeSesion && !celulaEsSede;
```

- `Celula.tsx` y `Tabla.tsx`: usar `soloLectura` arriba (no `rol === "SEDE"` a ciegas).
- `Lideres.tsx`: menú ⋮ solo si `puedeGestionarUsuarios` (`ADMIN/SUPER/DOCUMENTADOR`); SEDE no ve el menú.
- `Ver.tsx`: `cambiarTab` bloquea `Mensajes`, `Administrativos`, `Padron` si `soloLecturaSede`.
- Pestañas Administrativos/Mensajes/Padrón: `show: esAdminOSuper` (y padrón si config).
- Pasar `rolUsuarioSesion={esSedeSesion ? "SEDE" : rol}`.

**Sede es un lugar (no persona):**

- En célula Sede **nunca** mostrar “Registrarme como Sede”.
- Siempre **“Añadir Integrante”**; no pasar `isFirstMember: true` al crear afiliado en sede (`totalEnGrupo === 0 && !celulaEsSede`).
- Mensaje nivel 0 en `lib/nivelCompromiso.ts`: _“¡Bienvenido! Empieza añadiendo integrantes a la sede.”_

**Admin/Super y usuario Sede:**

- En pestaña Sede, si `sedeUsuario` existe: botones **Editar Sede** / **Eliminar Sede** (`handleOpenEditLiderModal` + `eliminar` con `swalNoEliminarCelula` si tiene afiliados).
- En `SignForm`: crear/editar sede → `rolesParaSelector` **solo** rol `SEDE` (ignorar `DOCUMENTADOR`); card única de rol en creación.

**Perfil no encontrado:** si el usuario no está en `allUsers` (RLS/`roles!inner`), armar fallback desde `session` y usar como `miPerfilGlobal` / `sedeUsuario`.

**No eliminar propio perfil:**

- `Lideres.tsx`: opción Eliminar solo si `esAdminOSuper && lider.id !== idUsuarioSesion`.
- `app/actions/usuarios.ts` → `deleteUserAccountAction`: si `user.id === userId` retornar error _“No puedes eliminar tu propio perfil.”_

---

## 4. Rol EMPLEADO (antes TRABAJADOR)

El filtro de UI usaba `TRABAJADOR` pero en BD el rol es `EMPLEADO`.

```ts
const esRolEmpleado = (rol?: string | null) => {
  const r = (rol || "").toUpperCase();
  return r === "EMPLEADO" || r === "TRABAJADOR"; // compat
};
```

Usar en:

- Lista pestaña Empleados (`Ver.tsx`)
- Agrupación en `AfiliadosGeneral.tsx`
- Contadores / meta

**Label UI:** “Empleado(s)” no “Trabajadores”.

---

## 5. Pestañas (`Ver.tsx`)

**Orden:** Sede → Líderes → Empleados → Miembros → Padrón → Administrativos → Mensajes

**Contadores:** badge redondo junto al label (no paréntesis), p. ej. `Líderes` + pill `1`.

| Pestaña         | Contador                                     |
| --------------- | -------------------------------------------- |
| Sede            | `conteoAfiliados` del usuario sede           |
| Líderes         | # usuarios rol `LIDER`                       |
| Empleados       | # usuarios rol `EMPLEADO`                    |
| Miembros        | total afiliados (sede + líderes + empleados) |
| Administrativos | # usuarios ADMIN/SUPER                       |

**Iconos:** medalla (`PiMedalDuotone`) líderes; maletín empleados; escudo admin; código super.

**Estilo pestañas (moderno, fino):**

- Fila con `border-b border-gray-200`; sin caja gruesa ni línea separada debajo.
- Pestaña activa: subrayado `h-0.5` con `layoutId="pestana-underline"` (framer-motion) y color `TAB_THEMES[tab].lineBg`.
- Texto/icono activo con color del tema; inactivo gris.
- Móvil: `grid-cols-4`; desktop: `md:flex` fila única.

**Contenido:** `AnimatePresence` + slide horizontal según dirección del cambio de tab.

**Header “Gestión de Datos”:**

- Fila: título izquierda + botón **Estadísticas** derecha (solo eso; sin buscador ni Nuevo global).
- Al cambiar de pestaña: `setSearchTerm("")`.

**Buscador y Nuevo por pestaña** (ver §12): dentro del contenido de cada tab, no en el header global.

---

## 6. Miembros — `AfiliadosGeneral.tsx`

**Filtros:** Todos (celeste/sky) | Sede | Líderes | Empleado

**Flujo:**

1. Tabla de líderes del grupo (No., Nombre, Miembros), orden **alfabético**.
2. Click → tabla de miembros de ese líder (animación suave framer-motion).
3. “Todos” → listado plano de todos los afiliados A–Z (columnas: nombre, dpi, tel, edad, lugar, líder, grupo).

**Excel (`xlsx`):** botón “Descargar Excel” con 4 hojas: `Todos`, `Sede`, `Lideres`, `Empleados`.

---

## 7. Vista lista/tabla en cada célula (`Celula.tsx` + `Tabla.tsx`)

Dentro de **cada célula** (pestaña Sede, click a un líder/empleado, o vista embebida) el usuario puede alternar cómo se ven los integrantes:

| Modo         | UI                         | Default |
| ------------ | -------------------------- | ------- |
| **Tarjetas** | Grid de cards (como antes) | Sí      |
| **Lista**    | Tabla densa (filas)        | No      |

**En `Celula.tsx`:**

- Estado: `formatoVista: FormatoVista` (`"tarjetas" | "tabla"`), default `"tarjetas"`.
- Toggle junto al buscador (segmented control):
  - Icono `LayoutGrid` → Tarjetas
  - Icono `Table2` → Lista (label “Lista”)
- Pasar a `<Tabla formato={formatoVista} ... />`.

**En `Tabla.tsx`:**

```ts
export type FormatoVista = "tarjetas" | "tabla";
// prop opcional: formato?: FormatoVista  (default "tarjetas")
```

- Si `formato === "tabla"`: renderizar `<table>` con columnas  
  **No. | Nombre | DPI | Teléfono | Edad | Sexo | Ubicación | Padrón | Acciones**  
  (Acciones solo si `puedeEditar`; SEDE solo edita en **su** célula vía `soloLectura` + `esUsuarioSede(lider)`).
- Si `formato === "tarjetas"`: grid de tarjetas con el mismo menú de acciones / carnet / teléfono.
- Mismo orden de afiliados en ambos modos (líder primero, luego por fecha/nombre).
- Contacto reutilizable: `TelefonoInline` / footer de llamada-WhatsApp-carnet.

**Nota:** Aplica a todas las células (Sede, líderes, empleados) porque todas usan `Celula` → `Tabla`.

**Badge de líder en `Tabla.tsx`:** usar **medalla** (`Medal` / `PiMedalDuotone`), **no corona** (`Crown`).

---

## 8. Familia embebida en la célula (`Celula.tsx` + `Tabla.tsx`)

**Problema:** “Familia” / añadir familiar abría un modal a pantalla completa (y a veces salía mal posicionado abajo).

**Fix:**

- **No modal full-screen.** La vista de familia se muestra **dentro de la célula** (mismo panel del líder).
- Estado en `Celula`: `titularFamilia: Afiliado | null`.
- `Tabla` emite `onVerFamilia(titular)` en lugar de abrir `Dialog`.
- UI embebida:
  - Botón **“Volver a miembros”** (`ArrowLeft`).
  - Cabecera “Familia de {nombre}” + **“Añadir Familiar”** (oculto si `soloLectura` en esa célula).
  - Misma `Tabla` con `isFamilyView` y afiliados = titular + `familiar_de === titular.id`.
- Toggle Tarjetas/Lista sigue disponible en la vista familia.
- Al cambiar de pestaña (Miembros / Estadísticas / Mensajes) limpiar `titularFamilia`.

**Transición suave (framer-motion):**

```tsx
<AnimatePresence mode="wait" initial={false}>
  {titularFamilia ? (
    <motion.div
      key={`familia-${titularFamilia.id}`}
      initial={{ opacity: 0, x: 36 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -28 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      …
    </motion.div>
  ) : (
    <motion.div
      key="miembros-lista"
      initial={{ opacity: 0, x: -36 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 28 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      …
    </motion.div>
  )}
</AnimatePresence>
```

Entrar a familia: slide desde la derecha. Volver a miembros: slide desde la izquierda.

---

## 9. Carnet — descarga en móvil (`CarnetAfiliacion.tsx`)

**Problema:** En iPhone/Android `<a download>` con dataURL no hace nada.

**Fix:**

1. Clonar el nodo del carnet off-screen a tamaño fijo (mismo aspect CR80) y capturar con `html-to-image` → se ve igual que el modal.
2. Esperar carga de imágenes (`crossOrigin="anonymous"` en logo).
3. Guardar:
   - Móvil + `navigator.canShare({ files })` → Web Share (Guardar en Fotos).
   - iOS sin share → abrir imagen en ventana nueva + “mantener pulsado → Guardar”.
   - Desktop → blob + `<a download>` clásico.
4. Toast de error/éxito; ignorar `AbortError` si el usuario cancela el share.

---

## 10. Meta general de afiliación (una sola, grande)

**Problema:** Había dos barras de “Meta general” (una en `MetaGeneral` / `Ver.tsx` y otra duplicada dentro de `Lideres.tsx`).

**Fix:**

- **Dejar solo** la de arriba: `components/afiliados/MetaGeneral.tsx` (usada en `Ver.tsx`).
- Hacerla **más grande**: tipografía `text-sm`/`md:text-xl`–`2xl`, barra `h-5`/`md:h-7`, contenedor con borde/padding (`px-4 py-4 md:px-6`).
- Mostrar `total / objetivo (xx%)` y segmentos Sede (azul) / Líderes (naranja) / Empleados (violeta).
- **Quitar** de `Lideres.tsx` la meta general duplicada y la fila “Líderes registrados / Empadronados TSE”.
- Ya no hace falta prop `hideMeta` en `Lideres`.

---

## 11. Menú ⋮ Editar / Eliminar en filas (`Lideres.tsx`)

**Problema:** Botones “Editar” y “Eliminar” a la vista en cada fila (líderes, empleados, administrativos).

**Fix:** Reemplazar por **tres puntos verticales** (`MoreVertical`) + `DropdownMenu`:

- Trigger: icono ⋮ compacto (`h-8 w-8`).
- Opciones: **Editar**; **Eliminar** solo si `ADMIN/SUPER` **y** `lider.id !== idUsuarioSesion`.
- Eliminar: `swalNoEliminarCelula()` si `conteoAfiliados > 0`.
- Menú compacto: `text-sm`, `py-2 px-2.5`, `min-w-[7.5rem]`.
- Solo si `puedeGestionarUsuarios` (`ADMIN/SUPER/DOCUMENTADOR`); SEDE no ve el menú.

**Filas líder (UI):**

- Nombre en una línea; a la derecha: `Nivel de compromiso:` en negro/blanco + nivel en color (`textoColor`).
- Más `pt` en la card; badges Total / Titulares / Familiares con `leading-none`.
- **Paginación simple:** `<` `1/3` `>` + `<select>` nativo (10 / 50 / Todos); `mb-10 md:mb-14`.

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button … aria-label="Acciones"><MoreVertical /></button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="min-w-[7.5rem] p-1">
    <DropdownMenuItem onClick={() => onEditar(lider)}>Editar</DropdownMenuItem>
    {esAdminOSuper && lider.id !== idUsuarioSesion && (
      <DropdownMenuItem onClick={…}>Eliminar</DropdownMenuItem>
    )}
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 12. Botones “Nuevo” por pestaña + SignForm con cards de rol (`Ver.tsx` + `SignForm.tsx`)

**Problema:** Un solo botón “Nuevo” global con dropdown no encajaba con el flujo por pestaña.

**Fix — barra por pestaña (`renderBarraPestana`):**

- Helper: buscador + slot opcional de acciones a la derecha.
- **Líderes:** “Nuevo Líder” → `handleOpenCreateUsuarioModal("LIDER")`.
- **Empleados:** “Nuevo Empleado” → `EMPLEADO`.
- **Administrativos:** “Nuevo Admin” + “Nuevo Super” (Super solo si `puedeCrearRolSuper`).
- **Miembros / Sede:** solo buscador (crear afiliado desde la célula).
- **Visibilidad:** solo `ADMIN` y `SUPER` (`puedeVerBotonNuevo`). No DOCUMENTADOR.
- Al cambiar de pestaña: `setSearchTerm("")`.

**Estado y modal:**

- `rolCreacionInicial: "LIDER" | "EMPLEADO" | "ADMIN" | "SUPER" | null`.
- `handleOpenCreateUsuarioModal(rol)` — bloquear `SUPER` si sesión no es SUPER.
- Pasar `rolInicial={rolCreacionInicial}` a `SignupForm`.
- Limpiar `rolCreacionInicial` al cerrar / éxito / editar / crear sede.

**SignForm — cards de rol (no `<select>`):**

- **Crear:** una sola card de rol (solo lectura), según `rolInicial` o `modoCrearSede`.
- **Editar:** grid 2 columnas de cards clicables (salvo `rolSoloLectura`).
- Iconos/colores: Líder naranja (`PiMedal`), Empleado violeta (`PiBriefcase`), Admin índigo (`PiShield`), Super esmeralda (`PiCode`), Sede azul.
- Excluir `DOCUMENTADOR` del selector.
- `modoCrearSede` / `editandoSede`: **solo** rol `nombre === "SEDE"` (no filtrar por `r.id === 5` aislado).
- `rolSoloLectura` incluye `editandoSede` y creación con rol fijo.
- Input oculto `rol_id` + `formData.set("rol_id", rol_id)` en submit (disabled no entra en FormData).
- Título del modal según `rolInicial` / modo sede.

**Editar usuario de acceso (email):**

- En `updateUsuarioAction`: actualizar Auth con `email` + `email_confirm: true` (admin).
- Normalizar: si llega sin `@`, agregar `@app.com`.
- Tras create/update/delete: `invalidateCachedAuthUsers()`.

```tsx
const renderBarraPestana = (acciones?: ReactNode) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    {/* buscador */}
    {acciones}
  </div>
);

{
  renderBarraPestana(
    puedeVerBotonNuevo && (
      <Button onClick={() => handleOpenCreateUsuarioModal("LIDER")}>
        <UserPlus /> Nuevo Líder
      </Button>
    ),
  );
}
```

---

## 13. TypeScript — relación `roles` en mensajes (`mensajes.ts`)

**Problema:** Supabase tipa el join `roles` como `{ nombre }[]` pero el código lo trataba como objeto → error de build.

**Fix:** helper que acepta array u objeto:

```ts
function nombreRolDesdeRelacion(
  roles: { nombre: string } | { nombre: string }[] | null | undefined,
): string | null {
  if (!roles) return null;
  if (Array.isArray(roles)) return roles[0]?.nombre ?? null;
  return roles.nombre ?? null;
}
```

Usar en filtros/map de filas con cast explícito si hace falta.

---

## 14. Archivos tocados (checklist port)

```
lib/swal.ts
lib/nivelCompromiso.ts                         # mensaje bienvenida sede (sin auto-registro)
app/api/dashboard/route.ts
app/api/users/ver/route.ts
app/actions/usuarios.ts                        # deleteUserAccountAction: no auto-eliminación
components/afiliados/actions/dashboard.ts
components/afiliados/actions/usuarios.ts
components/afiliados/actions/cache.ts          # getCachedAuthUsers (si no existe)
components/dashboard/actions/mensajes.ts       # nombreRolDesdeRelacion
components/afiliados/Ver.tsx                   # pestañas underline; barra por tab; Editar/Eliminar Sede
components/afiliados/Lideres.tsx               # menú ⋮; nivel compromiso inline; paginación simple
components/afiliados/Celula.tsx                # soloLectura SEDE; toggle Tarjetas/Lista; familia embebida
components/afiliados/Tabla.tsx                 # soloLectura; FormatoVista; onVerFamilia; badge Medal
components/afiliados/contacto.tsx              # tel / DPI helpers (si aplica)
components/afiliados/AfiliadosGeneral.tsx
components/afiliados/MetaGeneral.tsx           # meta única, más grande
components/afiliados/esquemas.ts               # esUsuarioSede
components/afiliados/CarnetAfiliacion.tsx
components/admin/sign-up/SignForm.tsx                  # cards de rol; rolInicial; solo SEDE en crear sede
components/afiliados/reportes/ReporteLideresClasificacion.tsx  # niveles por metas; sin labels barras/dona
package.json                                   # + xlsx / html-to-image
```

**Roles en BD (referencia):**

| id  | nombre       | UI                         |
| --- | ------------ | -------------------------- |
| 1   | SUPER        | Crear solo si sesión SUPER |
| 2   | ADMIN        | Crear usuarios             |
| 3   | LIDER        | —                          |
| 4   | DOCUMENTADOR | **Oculto** en selector     |
| 5   | SEDE         | Solo en crear/editar sede  |
| 6   | EMPLEADO     | —                          |

---

## 15. Criterios de aceptación al portar

- [ ] Editar líder/empleado muestra usuario de acceso (sin `@dominio`).
- [ ] Swal no crashea al actualizar.
- [ ] Usuario SEDE ve Sede / Líderes / Empleados / Miembros; **no** ve Administrativos / Mensajes / Padrón.
- [ ] SEDE **puede** crear/editar/eliminar afiliados en **su** célula; en células de líderes/empleados es solo lectura.
- [ ] Sede no muestra “Registrarme como Sede”; siempre “Añadir Integrante”.
- [ ] Admin/Super ven **Editar Sede** / **Eliminar Sede** en pestaña Sede.
- [ ] No se puede eliminar el propio perfil (UI + server action).
- [ ] Usuario con rol `EMPLEADO` aparece en pestaña Empleados.
- [ ] Contadores en badges junto al label; pestañas con subrayado `layoutId`; Mensajes al final.
- [ ] Header: solo “Gestión de Datos” + Estadísticas; buscador y Nuevo **por pestaña**.
- [ ] Miembros: Todos + tablas + Excel 4 hojas.
- [ ] En cada célula: toggle **Tarjetas / Lista**; tabla con columnas completas (± Acciones según permisos).
- [ ] Familia: dentro de la célula; “Volver a miembros” + “Añadir Familiar”; transición slide.
- [ ] Badge de líder: medalla (`Medal`), no corona.
- [ ] Nuevo Líder / Empleado / Admin por pestaña (solo ADMIN/SUPER); Super solo en Administrativos y solo sesión SUPER.
- [ ] SignForm: cards de rol (crear = una card; editar = grid); crear sede solo rol SEDE.
- [ ] Carnet: en móvil se puede guardar/compartir imagen igual al modal.
- [ ] Solo una **Meta general** arriba (grande); no duplicada en pestaña Líderes.
- [ ] Filas líderes: nivel de compromiso a la derecha del nombre; paginación simple.
- [ ] En filas: ⋮ compacto con Editar / Eliminar (no botones sueltos).
- [ ] Build pasa sin error TS en `mensajes.ts`.
- [ ] Reportes líderes: niveles Bajo / Medio / Cumple / Alto según metas; sin labels “barras”/“dona”.

---

## 16. Reportes — clasificación por integrantes (`ReporteLideresClasificacion.tsx`)

**Problema:** El reporte usaba `nivel_compromiso` de BD (Alto/Medio/Bajo/Sin calificar) y títulos redundantes “(barras)” / “(dona)”.

**Reglas (igual que barra en `Lideres.tsx` + `calcularNivelCompromiso`):**

Fuente de metas: `ConfiguracionSistema` → `meta_celula_minima` (META MÍNIMA) y `meta_por_lider` (META POR LÍDER).

| Condición (integrantes de la célula) | Nivel   |
| ------------------------------------ | ------- |
| `< meta mínima`                      | Bajo    |
| `≥ meta mínima` y `< meta por líder` | Medio   |
| `=== meta por líder`                 | Cumple  |
| `> meta por líder`                   | Alto    |

**Implementación:**

- Leer config con `obtenerConfiguracionAction` / query `config_sistema`.
- Calcular nivel con `calcularNivelCompromiso(conteoAfiliados, metaPorLider, metaMinima).nivel`.
- Gráficos, filtros, tabla y Excel usan esos 4 niveles (ya no “Sin calificar” ni el campo BD).
- Títulos de charts: `Distribución`, `Distribución por sector`, etc. **sin** “(barras)” / “(dona)”.

**Archivo:** `components/afiliados/reportes/ReporteLideresClasificacion.tsx`
