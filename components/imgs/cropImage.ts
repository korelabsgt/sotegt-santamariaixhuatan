export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    img.src = src;
  });

const getRotatedSize = (width: number, height: number, rotation: number) => {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

export const getCroppedFile = async (
  file: File,
  pixelCrop: PixelCrop,
  rotation: number,
): Promise<File> => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);

    const rotRad = (rotation * Math.PI) / 180;
    const { width: bBoxW, height: bBoxH } = getRotatedSize(
      image.width,
      image.height,
      rotation,
    );

    const rotatedCanvas = document.createElement("canvas");
    rotatedCanvas.width = bBoxW;
    rotatedCanvas.height = bBoxH;
    const rotatedCtx = rotatedCanvas.getContext("2d");
    if (!rotatedCtx) throw new Error("No se pudo crear el canvas.");

    rotatedCtx.fillStyle = "#ffffff";
    rotatedCtx.fillRect(0, 0, bBoxW, bBoxH);
    rotatedCtx.translate(bBoxW / 2, bBoxH / 2);
    rotatedCtx.rotate(rotRad);
    rotatedCtx.translate(-image.width / 2, -image.height / 2);
    rotatedCtx.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = Math.round(pixelCrop.width);
    croppedCanvas.height = Math.round(pixelCrop.height);
    const croppedCtx = croppedCanvas.getContext("2d");
    if (!croppedCtx) throw new Error("No se pudo crear el canvas final.");

    croppedCtx.fillStyle = "#ffffff";
    croppedCtx.fillRect(0, 0, pixelCrop.width, pixelCrop.height);
    croppedCtx.drawImage(
      rotatedCanvas,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );

    const outputType =
      file.type === "image/png" || file.type === "image/webp"
        ? file.type
        : "image/jpeg";

    const blob = await new Promise<Blob>((resolve, reject) => {
      croppedCanvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("No se pudo exportar la imagen.")),
        outputType,
        0.95,
      );
    });

    const safeBaseName =
      file.name.replace(/\.[^.]+$/, "") || `imagen-${Date.now()}`;
    const ext = outputType === "image/png" ? "png" : outputType === "image/webp" ? "webp" : "jpg";

    return new File([blob], `${safeBaseName}.${ext}`, { type: outputType });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
