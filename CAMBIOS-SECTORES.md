# Resumen de cambios — Gestión de Sectores y Lugares

Fecha: 22 de agosto de 2026

## Contexto

Se quitó el autoincremento del campo `id` en la tabla `sectores` de Supabase. Al borrar sectores, los IDs no se reiniciaban en 1, por lo que la numeración ahora se controla desde el cliente/servidor.

Esto provocaba el error **"Error al crear el sector"** al intentar insertar sin enviar un `id` explícito.

---

## Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `components/afiliados/forms/afiliados/catalogos.ts` | Lógica de IDs en servidor |
| `components/dashboard/ConfiguracionSistema.tsx` | UI de sectores, validaciones y estilos |

---

## Backend — `catalogos.ts`

### Nueva función `calcularSiguienteId`

- Toma la lista de IDs existentes (excluyendo `0`).
- Si no hay sectores, devuelve `1`.
- Si hay sectores, devuelve `max(id) + 1`.

### `crearSectorAction(nombre, id?)`

- Requiere permisos de admin (`SUPER`, `ADMIN`, `ADMINISTRADOR`).
- Calcula el siguiente ID automáticamente si no se pasa uno.
- Valida que el ID sea `> 0` y que no exista duplicado.
- Valida que el nombre no esté repetido.
- Inserta con `id` explícito usando `supabaseAdmin`.

### `actualizarSectorAction(id, nombre, nuevoId?)`

- Permite cambiar el **nombre** y opcionalmente el **número** del sector.
- Valida duplicados de ID y de nombre.
- Si cambia el ID, actualiza también los `lugares` asociados (`sector_id`).
- Usa un flujo seguro con nombre temporal para no romper la FK de `lugares → sectores`:
  1. Renombra el sector actual a un nombre temporal.
  2. Crea el sector con el nuevo ID.
  3. Mueve los lugares al nuevo ID.
  4. Elimina el sector antiguo.

### Lugares — sin cambios en IDs

- `crearLugarAction` sigue usando autoincremento de Supabase (`GENERATED ALWAYS AS IDENTITY`).
- No se implementó numeración manual para lugares.

---

## Frontend — `ConfiguracionSistema.tsx`

### Crear sector

- Calcula `siguienteId = max(id) + 1` en el cliente antes de crear.
- Muestra el número en el diálogo de confirmación: `Se creará el sector 2: "nombre"`.
- **Al crear, limpia el input** y deselecciona el sector (ya no queda como si estuviera buscando).

### Editar sector (modo lápiz)

- Campo numérico inline para cambiar el número del sector.
- Campo de texto para el nombre.
- Validaciones en cliente:
  - Número mayor a 0.
  - No permitir IDs duplicados.
- Si cambia el ID, actualiza el estado local de lugares y la selección activa.

### Estilo de la lista de sectores

- Texto más grande: `text-base` (antes `text-sm`).
- **"Sector X"** en negrita con color ámbar (`text-amber-600`).
- **": nombre"** en gris suave (`text-gray-500`).
- Función `renderSectorLabel()` para el renderizado visual.

### Textos de ayuda (columna Lugares)

- Tamaño aumentado de `9px` / `10px` a `text-sm` para mejor legibilidad.

---

## Comportamiento actual

### Al crear un sector

1. El usuario escribe el nombre en el buscador.
2. Pulsa **Agregar**.
3. Se confirma con el número que se asignará.
4. Se crea en Supabase con ese ID.
5. El input se limpia y la lista muestra el nuevo sector.

### Al editar un sector

1. Clic en el ícono de lápiz.
2. Aparecen campos para número y nombre.
3. Enter o ✓ guarda; Escape o ✗ cancela.
4. Si el número ya existe, muestra advertencia y no guarda.

### Al eliminar un sector

- Sin cambios: no se puede eliminar si tiene lugares asociados.

---

## Lo que NO se cambió

- IDs de **lugares** (siguen con autoincremento en Supabase).
- Flujo de creación/edición/eliminación de lugares.
- Permisos: solo admins pueden gestionar sectores.
- Sector especial con `id = 0` (no se puede eliminar ni cambiar su número).

---

## Notas técnicas

- Las operaciones de escritura en sectores usan `supabaseAdmin` para evitar problemas de RLS.
- El sector `id = 0` se mantiene al final del listado ordenado.
- La numeración no se reinicia al borrar: si existen sectores 1 y 3, el siguiente será 4 (no 2).
