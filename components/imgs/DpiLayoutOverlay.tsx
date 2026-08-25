"use client";

import { DPI_MRZ_GUIDE, DPI_PHOTO_GUIDE, type DpiSide } from "@/lib/dpiLayout";
import DpiPhotoGuide from "./DpiPhotoGuide";

interface Props {
  lado: DpiSide;
}

export default function DpiLayoutOverlay({ lado }: Props) {
  if (lado === "back") {
    return (
      <DpiPhotoGuide
        className="absolute rounded-md border-[3px] border-yellow-400 bg-black/20"
        style={{
          left: `${DPI_MRZ_GUIDE.x * 100}%`,
          top: `${DPI_MRZ_GUIDE.y * 100}%`,
          width: `${DPI_MRZ_GUIDE.w * 100}%`,
          height: `${DPI_MRZ_GUIDE.h * 100}%`,
        }}
      />
    );
  }

  return (
    <DpiPhotoGuide
      className="absolute"
      style={{
        left: `${DPI_PHOTO_GUIDE.x * 100}%`,
        top: `${DPI_PHOTO_GUIDE.y * 100}%`,
        width: `${DPI_PHOTO_GUIDE.w * 100}%`,
        height: `${DPI_PHOTO_GUIDE.h * 100}%`,
      }}
    />
  );
}
