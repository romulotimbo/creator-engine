const login = (process.env.DATAFORSEO_LOGIN || "").replace(/^["']|["']$/g, "").trim()
const pass  = (process.env.DATAFORSEO_PASSWORD || "").replace(/^["']|["']$/g, "").trim()
if (!login || !pass) { console.log("FALTA: DATAFORSEO_LOGIN/PASSWORD nao encontrados no ambiente"); process.exit(1) }
console.log(`credencial carregada: login com ${login.length} chars, senha com ${pass.length} chars`)
const auth = "Basic " + Buffer.from(`${login}:${pass}`).toString("base64")
async function get(path) {
  const r = await fetch("https://api.dataforseo.com/v3" + path, { headers: { Authorization: auth } })
  const j = await r.json().catch(() => null)
  return { http: r.status, body: j }
}
const u = await get("/appendix/user_data")
console.log("\n=== /appendix/user_data ===")
console.log("HTTP", u.http, "| status_code", u.body?.status_code, "|", u.body?.status_message)
const d = u.body?.tasks?.[0]?.result?.[0]
if (d) {
  console.log("SALDO:", d.money?.balance, d.money?.currency ?? "USD")
  const m = d.rates?.limits?.minute
  console.log("limites/min -> total:", m?.total,
    "| google_ads.search_volume.live:", m?.keywords_data?.google_ads?.search_volume?.live,
    "| trends.explore.live:", m?.keywords_data?.explore?.live,
    "| appendix.user_data:", m?.appendix?.user_data)
  console.log("gasto total ate hoje:", d.money?.total, "| hoje:", d.money?.today)
  console.log("price plan:", d.price_plan, "| timezone:", d.timezone)
}
console.log("\n=== /keywords_data/google_ads/status ===")
const s = await get("/keywords_data/google_ads/status")
console.log("HTTP", s.http, "| status_code", s.body?.status_code, "|", s.body?.status_message)
console.log("custo desta task:", s.body?.tasks?.[0]?.cost)
console.log(JSON.stringify(s.body?.tasks?.[0]?.result?.[0] ?? {}, null, 1))
