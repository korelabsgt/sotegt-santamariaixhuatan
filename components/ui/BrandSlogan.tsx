import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { cn } from "@/lib/utils";

type BrandSloganProps = {
  size?: "sm" | "lg";
};

export function BrandSlogan({ size = "lg" }: BrandSloganProps) {
  const isLarge = size === "lg";

  return (
    <div
      className={cn(
        "w-full flex items-center",
        isLarge ? "mt-2 md:mt-3 gap-2 md:gap-3" : "mt-1.5 md:mt-2 gap-1.5 md:gap-2"
      )}
    >
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-blue-600/60 dark:via-blue-400/25 dark:to-blue-400/55" />
      <AnimatedGradientText
        speed={1.15}
        colorFrom="#1e3a8a"
        colorTo="#38bdf8"
        className={cn(
          "shrink-0 font-semibold leading-snug tracking-tight font-['Plus_Jakarta_Sans',sans-serif]",
          isLarge ? "text-sm md:text-lg" : "text-[11px] sm:text-xs md:text-sm"
        )}
      >
        De la estructura a la victoria
      </AnimatedGradientText>
      <span className="flex-1 h-px bg-gradient-to-l from-transparent via-blue-500/30 to-blue-600/60 dark:via-blue-400/25 dark:to-blue-400/55" />
    </div>
  );
}
