"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BrandSlogan } from "@/components/ui/BrandSlogan";

export default function LogoLink() {
  const router = useRouter();

  return (
    <div className="flex justify-start items-center ml-2 sm:ml-4">
      <motion.div
        className="cursor-pointer flex flex-row items-center gap-3 md:gap-4"
        onClick={() => router.push("/protected")}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex shrink-0"
        >
          <div className="rounded-xl overflow-hidden bg-white dark:bg-neutral-800 mt-3 md:mt-5 shadow-none">
            <Image
              src="/svg/logo-2.svg"
              alt="Afiliaciones CLM"
              height={100}
              width={100}
              className="w-12 sm:w-14 md:w-28 h-auto object-contain dark:brightness-[0.82] dark:contrast-110 shadow-none"
              priority
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{
            duration: 1,
            delay: 0.4,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <div className="mt-3 md:mt-5">
            <h1
              className="font-serif text-sm md:text-2xl font-bold leading-tight text-left bg-gradient-to-r from-blue-800 via-blue-400 to-blue-800 dark:from-blue-400 dark:via-blue-300 dark:to-blue-500 bg-[length:200%_auto] text-transparent bg-clip-text animate-text-shine"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Sistema de Organización <br /> Territorial Estratégica
            </h1>
            <BrandSlogan size="sm" />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
