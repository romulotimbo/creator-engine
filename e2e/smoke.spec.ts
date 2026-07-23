import { test, expect } from "@playwright/test"

/**
 * Smoke E2E — requer Postgres com seed (AUTH_DEV_EMAIL=admin@creator-engine.local).
 * Rode: docker compose -f docker-compose.dev.yml up -d && npm run db:push && npm run db:seed
 * Depois: E2E_SMOKE=1 npm run test:e2e
 */
test.describe("smoke", () => {
  test.skip(!process.env.E2E_SMOKE, "defina E2E_SMOKE=1 com banco seeded")
  test.setTimeout(60_000)

  test("ferramenta com custo → credencial global com serviço", async ({ page }) => {
    const toolName = `E2E Tool ${Date.now()}`

    await page.goto("/ferramentas")
    await expect(page.getByRole("heading", { name: "Ferramentas" })).toBeVisible()

    await page.getByRole("button", { name: "+ Nova ferramenta" }).click()
    await page.getByLabel("Nome *").fill(toolName)
    await page.getByLabel("Custo/mês (R$)").fill("29.90")
    await page.getByRole("button", { name: "Salvar" }).last().click()

    await expect(page.getByText(toolName)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("R$ 29,90").first()).toBeVisible()

    await page.getByRole("button", { name: "+ Nova credencial" }).click()
    await page.getByLabel("Serviço / provedor").fill("IPRoyal")
    await page.getByLabel("Chave / usuário").fill("e2e-proxy-user")
    await page.getByLabel("Valor (senha/token)").fill("e2e-secret-value")
    await page.getByRole("button", { name: "Salvar" }).last().click()

    await expect(page.getByRole("cell", { name: "IPRoyal" })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("cell", { name: "e2e-proxy-user" })).toBeVisible()

    // limpeza: remove a ferramenta e a credencial criadas pelo teste
    const ferramentas = await (await page.request.get("/api/ferramentas")).json()
    for (const f of ferramentas.filter((f: { nome: string }) => f.nome === toolName)) {
      await page.request.delete(`/api/ferramentas/${f.id}`)
    }
    const credenciais = await (await page.request.get("/api/credenciais?global=true")).json()
    if (Array.isArray(credenciais)) {
      for (const c of credenciais.filter((c: { chave: string }) => c.chave === "e2e-proxy-user")) {
        await page.request.delete(`/api/credenciais/${c.id}`)
      }
    }
  })

  test("calendário persona com bandeja e agendamento via API", async ({ page }) => {
    await page.goto("/personas/veesemfiltro/calendario")
    await expect(page.getByTestId("calendario-persona-layout")).toBeVisible()
    await expect(page.getByTestId("calendario-grid")).toBeVisible()
    await expect(page.getByTestId("calendario-tray")).toBeVisible()
    await expect(page.getByText(/Sem data \(\d+\)/)).toBeVisible()

    const chip = page.locator('[data-testid^="calendario-chip-"]').first()
    await expect(chip).toBeVisible()
    const chipTestId = await chip.getAttribute("data-testid")
    const postId = chipTestId!.replace("calendario-chip-", "")
    const titulo = await chip.locator("span").last().textContent()

    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + 3)
    targetDate.setHours(12, 0, 0, 0)

    const putRes = await page.request.put(`/api/posts/${postId}`, {
      data: { dataPublicacao: targetDate.toISOString() },
      timeout: 30_000,
    })
    expect(putRes.ok()).toBeTruthy()

    await page.reload()
    const dayKey = [
      targetDate.getFullYear(),
      String(targetDate.getMonth() + 1).padStart(2, "0"),
      String(targetDate.getDate()).padStart(2, "0"),
    ].join("-")
    const dayCell = page.getByTestId(`calendario-day-${dayKey}`)
    await expect(dayCell).toBeVisible()
    if (titulo) await expect(dayCell.getByText(titulo, { exact: false })).toBeVisible()

    await page.request.put(`/api/posts/${postId}`, { data: { dataPublicacao: null }, timeout: 30_000 })
  })

  test("estúdio: fonte (upload) → roteiro → enfileira job → status na fila", async ({ page }) => {
    await page.goto("/estudio")
    await expect(page.getByRole("heading", { name: "Estúdio de Vídeo" })).toBeVisible()

    // registra uma fonte via upload (arquivo fake .mp4 — metadados caem no fallback)
    const upRes = await page.request.post("/api/estudio/fontes", {
      multipart: {
        file: { name: `e2e_${Date.now()}.mp4`, mimeType: "video/mp4", buffer: Buffer.from("fake-mp4-content") },
      },
      timeout: 30_000,
    })
    expect(upRes.ok()).toBeTruthy()
    const fonte = await upRes.json()

    // monta um roteiro mínimo associado à fonte
    const rotRes = await page.request.post("/api/estudio/roteiros", {
      data: {
        nome: `E2E roteiro ${Date.now()}`,
        formato: "VERTICAL_9_16",
        fonteVideoId: fonte.id,
        timeline: {
          tracks: [
            { tipo: "texto", inicio: 0, fim: 3, conteudo: "E2E", estilo: "impacto", animacao: "write-on", posicao: "safe-center" },
          ],
        },
      },
      timeout: 30_000,
    })
    expect(rotRes.ok()).toBeTruthy()
    const roteiro = await rotRes.json()

    // enfileira o render
    const jobRes = await page.request.post("/api/estudio/jobs", {
      data: { roteiroId: roteiro.id },
      timeout: 30_000,
    })
    expect(jobRes.ok()).toBeTruthy()
    const job = await jobRes.json()
    expect(job.status).toBe("FILA")

    // status visível na aba Jobs
    await page.reload()
    await page.getByRole("button", { name: /Jobs \(/ }).click()
    await expect(page.getByText("Na fila").first()).toBeVisible({ timeout: 15_000 })

    // limpeza: roteiro (cascata no job) + fonte
    await page.request.delete(`/api/estudio/roteiros/${roteiro.id}`)
    await page.request.delete(`/api/estudio/fontes/${fonte.id}`)
  })

  test("afiliados: lista ContaTrafego e cria venda manual", async ({ page }) => {
    await page.goto("/afiliados")
    await expect(page.getByRole("heading", { name: "Contas de tráfego" })).toBeVisible()

    const listRes = await page.request.get("/api/afiliados")
    expect(listRes.ok()).toBeTruthy()
    const contas = await listRes.json()
    expect(Array.isArray(contas)).toBeTruthy()

    const slug = `e2e-ads-${Date.now()}`
    const createRes = await page.request.post("/api/afiliados", {
      data: { slug, nome: `E2E Ads ${Date.now()}`, plataforma: "META", status: "ATIVA" },
    })
    expect(createRes.ok()).toBeTruthy()
    const conta = await createRes.json()

    const vendaRes = await page.request.post("/api/vendas-afiliados", {
      data: {
        contaTrafegoId: conta.id,
        data: new Date().toISOString(),
        valorVenda: 100,
        valorComissao: 50,
        plataformaAfil: "BRAIP",
        status: "APROVADA",
      },
    })
    expect(vendaRes.ok()).toBeTruthy()

    await page.goto(`/afiliados/${slug}`)
    await expect(page.getByText(conta.nome)).toBeVisible()

    await page.request.delete(`/api/afiliados/${slug}`)
  })
})
