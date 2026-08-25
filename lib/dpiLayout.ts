export const DPI_RATIO = 85.6 / 53.98;

export const DPI_PHOTO = {
  x: 0.668,
  y: 0.158,
  w: 0.305,
  h: 0.705,
} as const;

export const DPI_PHOTO_GUIDE = {
  x: 0.72,
  y: 0.383,
  w: 0.24,
  h: 0.48,
} as const;

export const DPI_PHOTO_ASPECT =
  (DPI_PHOTO_GUIDE.w * DPI_RATIO) / DPI_PHOTO_GUIDE.h;

export const DPI_MRZ_GUIDE = {
  x: 0.042,
  y: 0.704,
  w: 0.916,
  h: 0.218,
} as const;

export type DpiSide = "front" | "back";

export function dpiPhotoRect(width: number, height: number) {
  return {
    x: width * DPI_PHOTO_GUIDE.x,
    y: height * DPI_PHOTO_GUIDE.y,
    width: width * DPI_PHOTO_GUIDE.w,
    height: height * DPI_PHOTO_GUIDE.h,
  };
}
