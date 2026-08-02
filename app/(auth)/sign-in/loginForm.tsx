"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { signInAction } from "@/app/actions/usuarios";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Typewriter } from "react-simple-typewriter";
import { Button } from "@/components/ui/button";
import { BrandSlogan } from "@/components/ui/BrandSlogan";
import Swal from "sweetalert2";

function PendingSignInButton({ isPending }: { isPending: boolean }) {
  return (
    <Button
      type="submit"
      disabled={isPending}
      className="text-2xl py-8 flex-1 bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white"
    >
      {isPending ? "Iniciando..." : "Iniciar Sesión"}
    </Button>
  );
}

export function LoginForm() {
  const [verPassword, setVerPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  function traducirError(mensaje: string) {
    const mensajeLower = mensaje.toLowerCase();
    if (mensajeLower.includes("fetch") || mensajeLower.includes("conn") || mensajeLower.includes("network")) {
      return "Revisa tu conexión a Internet, si el problema persiste contacta soporte técnico.";
    }
    const errores: Record<string, string> = {
      "email rate limit exceeded": "Demasiados intentos. Espere unos minutos.",
      "user already registered": "El usuario ya está registrado.",
      "invalid login credentials": "Credenciales incorrectas.",
      "signup requires a valid password": "Contraseña inválida.",
      "user not found": "Usuario no encontrado.",
      "Usuario o contraseña incorrectos": "Usuario o contraseña incorrectos.",
    };
    return errores[mensajeLower] || mensaje;
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const handleFormAction = async (formData: FormData) => {
    const finalEmail = `${email.trim()}@app.com`;

    setClientError(null);
    formData.set("email", finalEmail);
    formData.set("password", password);

    startTransition(async () => {
      try {
        const result = await signInAction(formData);

        if (result && result.error) {
          Swal.fire({
            title: "Error al iniciar sesión",
            text: traducirError(result.error),
            icon: "error",
          });
        }
      } catch (err: any) {
        const mensaje = err?.message || String(err);
        if (mensaje.includes("NEXT_REDIRECT")) {
          throw err;
        }
        Swal.fire({
          title: "Error al iniciar sesión",
          text: traducirError(mensaje),
          icon: "error",
        });
      }
    });
  };

  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="cursor-pointer flex flex-row items-center gap-1 md:gap-3"
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
          <div className="rounded-xl overflow-hidden bg-white dark:bg-neutral-800 my-5 shadow-none">
            <Image
              src="/svg/logo-2.svg"
              alt="Afiliaciones CLM"
              height={100}
              width={100}
              className="w-20 md:w-36 h-auto object-contain dark:brightness-[0.82] dark:contrast-110 shadow-none"
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
            ease: [0.16, 1, 0.3, 1] 
          }}
        >
          <div className="my-5">
            <h1
              className="font-serif text-2xl md:text-4xl font-bold leading-tight text-left bg-gradient-to-r from-blue-800 via-blue-400 to-blue-800 dark:from-blue-400 dark:via-blue-300 dark:to-blue-500 bg-[length:200%_auto] text-transparent bg-clip-text animate-text-shine"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Sistema de Organización <br /> Territorial Estratégica
            </h1>
            <BrandSlogan size="lg" />
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="flex flex-col items-center mb-8 w-full text-center"
      >
        <h2 className="text-2xl md:text-4xl font-bold leading-tight bg-gradient-to-r from-blue-800 via-blue-400 to-blue-800 dark:from-blue-400 dark:via-blue-300 dark:to-blue-500 bg-[length:200%_auto] text-transparent bg-clip-text animate-text-shine">
          Santa María Ixhuatán
        </h2>

      </motion.div>


      <form
        ref={formRef}
        action={handleFormAction}
        className="w-full md:max-w-2xl flex flex-col gap-8 text-2xl bg-white dark:bg-neutral-900 md:rounded-xl px-5 py-5 border border-gray-300 dark:border-neutral-700 shadow-sm dark:shadow-black/20"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full px-4 flex flex-col gap-4"
        >
          <div className="flex justify-center w-full">
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 md:text-3xl">
              <Typewriter
                words={["Iniciar sesión"]}
                loop={1}
                cursor
                cursorStyle=""
                typeSpeed={70}
                deleteSpeed={50}
                delaySpeed={1000}
              />
            </h1>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-col gap-6"
        >
          <div>
            <Label
              htmlFor="email"
              className="text-2xl text-blue-600 dark:text-blue-400 mb-2 block"
            >
              Usuario
            </Label>
            <Input
              name="email"
              type="text"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value.replace(/@.*$/, ""));
                setClientError(null);
              }}
              placeholder="Ingrese su usuario"
              required
              className="text-2xl py-8 px-4 bg-white dark:bg-neutral-950 border-gray-300 dark:border-neutral-700 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <Label
              htmlFor="password"
              className="text-2xl text-blue-600 dark:text-blue-400 mb-2 block"
            >
              Contraseña
            </Label>
            <div className="relative">
              <Input
                type={verPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu Contraseña"
                required
                className="text-2xl py-8 px-4 pr-12 bg-white dark:bg-neutral-950 border-gray-300 dark:border-neutral-700 text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setVerPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-neutral-400"
                aria-label="Mostrar u ocultar contraseña"
              >
                {verPassword ? <EyeOff size={24} /> : <Eye size={24} />}
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="flex items-center gap-4"
        >
          <div className="w-[120px] h-[120px] ">
            <Image
              src="/gif/afiliados/gif0.gif"
              alt="Iniciar sesión"
              width={120}
              height={120}
              className="w-full h-full object-contain"
            />
          </div>
          <PendingSignInButton isPending={isPending} />
        </motion.div>
      </form>
    </div>
  );
}
