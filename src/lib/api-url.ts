import { getBasePath } from "@/lib/base-path"

function joinBase(base: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return base ? `${base.replace(/\/$/, "")}${normalized}` : normalized
}

/** Monta URL de API respeitando basePath (/creator-engine em prod). */
export function apiUrl(path: string): string {
  const publicBase = process.env.NEXT_PUBLIC_BASE_PATH
  if (publicBase !== undefined) return joinBase(publicBase, path)

  if (typeof document !== "undefined") {
    const fromDom = document.documentElement.getAttribute("data-base-path")
    if (fromDom !== null) return joinBase(fromDom, path)
  }

  return joinBase(getBasePath(), path)
}
