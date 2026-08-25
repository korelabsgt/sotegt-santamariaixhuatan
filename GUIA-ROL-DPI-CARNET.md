# Guía: Rol Planilla, carga de DPI y carnet de afiliación

Documento para replicar en otro sistema con la misma estructura (Next.js App Router + Supabase + React).

---

## 1. Agregar un rol nuevo (ejemplo: PLANILLA)

El patrón es el mismo que Líder, Empleado o Admin: registro en BD → helper → pestañas/UI → alta de usuario.

### 1.1 Base de datos

Crear migración en `supabase/migrations/`:

```sql
INSERT INTO public.roles (id, nombre)
SELECT COALESCE((SELECT MAX(id) FROM public.roles), 0) + 1, 'PLANILLA'
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles WHERE upper(trim(nombre)) = 'PLANILLA'
);
```

Ejecutar: `pnpm supabase db push` (o aplicar en el panel de Supabase).

### 1.2 Helper de rol

En `components/afiliados/esquemas.ts`:

```ts
export function esRolPlanilla(rol?: string | null) {
  return (rol || "").toUpperCase() === "PLANILLA";
}
```

Para otro rol: cambiar nombre de función y string comparado.

### 1.3 Pestaña y conteos en la vista principal

En `components/afiliados/Ver.tsx`:

| Qué | Acción |
|-----|--------|
| Tipo `Tab` | Agregar `"Planilla"` |
| `TAB_ORDER` | Insertar `"Planilla"` después de `"Sede"` |
| `TAB_THEMES` | Color/icono para Planilla |
| Filtro usuarios | `usuariosPlanilla = allUsers.filter(u => esRolPlanilla(u.rol))` |
| Totales | Sumar `totalAfiliadosPlanilla` en meta y en `totalMiembrosGeneral` |
| UI pestaña | Bloque `activeTab === "Planilla"` con lista + botón `Nuevo` |
| Crear usuario | `handleOpenCreateUsuarioModal("PLANILLA")` |

### 1.4 Barra de progreso (MetaGeneral)

En `components/afiliados/MetaGeneral.tsx`:

- Prop `totalPlanilla?: number`
- Incluir en `total` y en segmento de barra (color distinto)
- Etiqueta `Planilla: {count}`

### 1.5 Listado general y Excel

En `components/afiliados/AfiliadosGeneral.tsx`:

- Tipo grupo `"planilla"`
- Categoría en `CATEGORIAS`
- `tipoDeLider` → si `esRolPlanilla` devolver `"planilla"`
- Conteos, export Excel y hoja `"Planilla"`

### 1.6 Etiquetas en célula

En `components/afiliados/Celula.tsx`: mapear rol a texto `"Planilla"`.

### 1.7 Formulario de alta

En `components/admin/sign-up/SignForm.tsx`:

- `rolInicial` incluye `"PLANILLA"`
- Estilo visual en `estiloRol`
- Al crear: buscar rol `PLANILLA` en tabla `roles` y asignar `rolId`
- Filtrar selector y título `"Nuevo Usuario Planilla"`

### Checklist rol nuevo

```
[ ] Migración SQL en roles
[ ] esRolXxx() en esquemas.ts
[ ] Tab + orden + tema en Ver.tsx
[ ] MetaGeneral conteo
[ ] AfiliadosGeneral agrupación/export
[ ] Celula etiqueta
[ ] SignForm creación
```

---

## 2. Carga de DPI con guía de encuadre

### 2.1 Archivos involucrados

```
lib/dpiLayout.ts              → Constantes de proporción y región de foto
components/imgs/
  DpiPhotoGuide.tsx           → Marco amarillo (solo foto)
  DpiLayoutOverlay.tsx        → Overlay en cámara (% sobre tarjeta)
  DpiCameraCapture.tsx        → Captura con cámara + overlay
  ImageEditorModal.tsx        → Recorte galería (portal, sin Headless Transition)
  ImageUploader.tsx           → Orquesta galería/cámara/subida
  cropImage.ts                → Recorte final (fondo blanco en canvas)
components/afiliados/
  GestionDpiModal.tsx         → Modal frontal/reverso
  actions/dpi.ts              → Guarda path en afiliados
```

### 2.2 Constantes (`lib/dpiLayout.ts`)

| Constante | Uso |
|-----------|-----|
| `DPI_RATIO` | Proporción tarjeta 85.6×53.98 mm |
| `DPI_PHOTO_GUIDE` | Marco amarillo en editor (x,y,w,h en % del área recortada) |
| `DPI_PHOTO_ASPECT` | Aspecto real del retrato: `(GUIDE.w * DPI_RATIO) / GUIDE.h` |
| `DPI_MRZ_GUIDE` | Marco reverso (zona MRZ) |
| `dpiPhotoRect()` | Recorta retrato del DPI guardado para el carnet |

Coordenadas son **porcentaje 0–1** respecto a la imagen DPI ya recortada (aspecto 85:54).

### 2.3 Storage Supabase

- Bucket: `dpis`
- Campos en `afiliados`: `dpi_frontal_url`, `dpi_reverso_url` (path del archivo, no URL pública)
- Server action `actualizarCampoDpiAction` actualiza el path y hace `revalidatePath`

### 2.4 Flujo de subida

```
Usuario elige Galería o Cámara
        ↓
[Galería] ImageEditorModal
  - aspect fijo DPI_RATIO (85:54)
  - Guía amarilla = DPI_PHOTO_GUIDE sobre .reactEasyCrop_CropArea
  - cropImage.ts: canvas con fill blanco (#fff) antes de exportar JPEG
        ↓
[Cámara] DpiCameraCapture
  - Recuadro con aspecto DPI + DpiLayoutOverlay
  - Captura recorte; canvas con fondo blanco
        ↓
ImageUploader comprime (browser-image-compression) y sube a bucket dpis
        ↓
onUploadSuccess → mutation → actualizarCampoDpiAction(afiliadoId, campo, path)
```

### 2.5 Integración en modal DPI

En `GestionDpiModal.tsx`, por cada lado:

```tsx
<ImageUploader
  label="Frontal"
  bucketName="dpis"
  currentImagePath={frontalPath}
  captureOverlay="front"   // o "back" para reverso
  enableImageLoupe
  onUploadSuccess={... dpi_frontal_url ...}
/>
```

`captureOverlay` activa guía + aspecto DPI en editor y cámara.

### 2.6 Detalles importantes al replicar

1. **Relleno blanco**: en `cropImage.ts` y `DpiCameraCapture.tsx`, `fillRect` blanco antes de `drawImage` (evita franjas negras en JPEG).
2. **Sin parpadeo**: `ImageEditorModal` usa `createPortal` a `document.body`, sin `Transition` de Headless UI; guía posicionada por DOM del crop area, sin `MutationObserver` en la guía misma.
3. **Vista previa**: contenedor `bg-white` en `ImageUploader`.
4. **Guía solo foto**: no dibujar plantilla completa del DPI; solo `DpiPhotoGuide` (marco amarillo).

---

## 3. Carnet de afiliación

### 3.1 Archivo principal

`components/afiliados/CarnetAfiliacion.tsx`

Se abre desde `Tabla.tsx` (botón CARNET).

### 3.2 Flujo de datos

```
Modal abre (createPortal, z-[70])
        ↓
Skeleton mientras carga (CarnetSkeleton)
        ↓
Precarga logo (/images/logosede.png → fallback /images/logo.png)
        ↓
Si hay dpi_frontal_url:
  signed URL desde bucket dpis
  recortarRetratoDpi() → dpiPhotoRect() con DPI_PHOTO_GUIDE
        ↓
recursosListos = true → mostrar carnet completo de una vez
```

### 3.3 Layout del carnet

| Elemento | Posición |
|----------|----------|
| Nombre + datos (DPI, género, nacimiento, edad, lugar) | Izquierda |
| Logo | Esquina superior derecha (`h-[5.5rem]` / `h-[6rem]`) |
| Foto retrato | Esquina inferior derecha (`w-[24%]`, `aspectRatio: DPI_PHOTO_ASPECT`) |
| "Carnet de Afiliación" | Inferior izquierda, blanco, cursiva, sobre cintillo azul (`OndaCarnet` SVG) |

Proporción tarjeta: `aspectRatio: "85.6 / 53.98"`.

### 3.4 Foto en carnet = misma región que guía de subida

- Editor guía: `DPI_PHOTO_GUIDE` sobre área de recorte 85:54.
- Carnet: `dpiPhotoRect()` usa **los mismos** `DPI_PHOTO_GUIDE`.
- Contenedor foto: `aspectRatio: DPI_PHOTO_ASPECT` (incluye `DPI_RATIO` en el cálculo).
- Imagen: `object-fill` (sin estirar si el aspecto del contenedor coincide).

**Error común**: usar `DPI_PHOTO_GUIDE.w / DPI_PHOTO_GUIDE.h` sin multiplicar por `DPI_RATIO` → foto estirada verticalmente.

### 3.5 Exportar

- **Descargar**: `html-to-image` (`toPng`) del nodo `carnetRef`, escala 3×.
- **Imprimir**: misma captura en ventana nueva con `@page` tamaño carnet mm.
- Botones deshabilitados hasta `recursosListos`.

### 3.6 Dependencias

- `html-to-image` (captura PNG)
- `react-easy-crop` (recorte galería)
- `browser-image-compression` (subida)
- Supabase Storage + signed URLs

---

## 4. Estructura mínima para otro proyecto

```
lib/
  dpiLayout.ts

components/imgs/
  cropImage.ts
  DpiPhotoGuide.tsx
  DpiLayoutOverlay.tsx
  DpiCameraCapture.tsx
  ImageEditorModal.tsx
  ImageUploader.tsx

components/afiliados/
  esquemas.ts              # helpers de rol + tipo Afiliado
  Ver.tsx                  # tabs y conteos
  MetaGeneral.tsx
  AfiliadosGeneral.tsx
  Celula.tsx
  GestionDpiModal.tsx
  CarnetAfiliacion.tsx
  Tabla.tsx                # abre carnet y DPI
  actions/dpi.ts

components/admin/sign-up/
  SignForm.tsx

supabase/migrations/
  YYYYMMDD_add_rol_planilla.sql

public/images/
  logosede.png
  logo.png
```

### Tabla `afiliados` (campos usados)

- `dpi_frontal_url` — text, path en bucket
- `dpi_reverso_url` — text, path en bucket
- `nombres`, `apellidos`, `dpi`, `no_padron`, `sexo`, `nacimiento`, `lugar_nombre`

### Tabla `roles`

- `id`, `nombre` (ej. `LIDER`, `EMPLEADO`, `PLANILLA`, `ADMIN`, `SUPER`)

---

## 5. Orden de implementación recomendado

1. Rol en BD + `esRolXxx` + UI tabs/conteos + SignForm  
2. Bucket `dpis` + columnas + `actualizarCampoDpiAction`  
3. `dpiLayout.ts` + `ImageUploader` + editor/cámara + fondo blanco en crop  
4. `GestionDpiModal` conectado a `Tabla`  
5. `CarnetAfiliacion` con skeleton, mismo `DPI_PHOTO_GUIDE` y export PNG/print  

---

## 6. Ajuste fino de la guía de foto

Si el marco amarillo no coincide con el retrato en carnet, editar solo `DPI_PHOTO_GUIDE` en `lib/dpiLayout.ts`:

```ts
export const DPI_PHOTO_GUIDE = {
  x: 0.72,   // izquierda (0 = borde izq. del DPI recortado)
  y: 0.383,  // arriba
  w: 0.24,   // ancho
  h: 0.48,   // alto (y + h = borde inferior del marco)
} as const;
```

`DPI_PHOTO_ASPECT` se recalcula automáticamente. No hace falta tocar carnet ni editor si solo cambias estas cuatro cifras.
