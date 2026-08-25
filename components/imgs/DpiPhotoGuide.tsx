"use client";

import { forwardRef, type CSSProperties } from "react";

interface Props {
  className?: string;
  style?: CSSProperties;
}

const DpiPhotoGuide = forwardRef<HTMLDivElement, Props>(function DpiPhotoGuide(
  { className = "", style },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`rounded-md border-[3px] border-dashed border-yellow-400 bg-sky-400/10 shadow-[0_0_0_1px_rgba(0,0,0,0.35)] ${className}`}
      style={style}
      aria-hidden
    />
  );
});

export default DpiPhotoGuide;
