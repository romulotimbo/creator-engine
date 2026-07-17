/** Subpath da app (vazio em dev local com BASE_PATH=""). */
export function getBasePath(): string {
  const env = process.env.BASE_PATH
  if (env === "") return ""
  return env ?? "/creator-engine"
}
