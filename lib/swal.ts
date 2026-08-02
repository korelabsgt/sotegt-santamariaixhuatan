import SwalBase from "sweetalert2";
import type { SweetAlertIcon, SweetAlertOptions, SweetAlertResult } from "sweetalert2";

export function getSwalTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function withTheme(options: SweetAlertOptions = {}): SweetAlertOptions {
  return {
    theme: getSwalTheme(),
    ...options,
  };
}

type FireArgs =
  | [SweetAlertOptions?]
  | [string?, string?, SweetAlertIcon?];

const nativeFire = SwalBase.fire.bind(SwalBase);

function fire(...args: FireArgs): Promise<SweetAlertResult> {
  if (args.length === 0) {
    return nativeFire(withTheme());
  }

  if (args.length === 1 && typeof args[0] === "object") {
    return nativeFire(withTheme(args[0] as SweetAlertOptions));
  }

  const [title, text, icon] = args as [string?, string?, SweetAlertIcon?];
  return nativeFire(withTheme({ title, text, icon }));
}

const AppSwal = Object.assign(SwalBase, { fire }) as typeof SwalBase;

export default AppSwal;
