import { test, expect } from "@playwright/test"

/**
 * Smoke E2E — requer Postgres com seed (admin@creator-engine.local / creatorengine123).
 * Rode: docker compose -f docker-compose.dev.yml up -d && npm run db:push && npm run db:seed
 * Depois: E2E_SMOKE=1 npm run test:e2e
 */
test.describe("smoke", () => {
  test.skip(!process.env.E2E_SMOKE, "defina E2E_SMOKE=1 com banco seeded")
  test.setTimeout(60_000)

  test("login → ferramenta com custo → credencial global com serviço", async ({ page }) => {
    const toolName = `E2E Tool ${Date.now()}`

    await page.goto("/login")
    await page.locator("#email").fill("admin@creator-engine.local")
    await page.locator("#password").fill("creatorengine123")
    await page.locator('button[type="submit"]').click()

    await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 30_000 })

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

    await expect(page.getByText("IPRoyal")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("e2e-proxy-user")).toBeVisible()
  })

  test("login → calendário persona com bandeja e agendamento via API", async ({ page }) => {
    await page.goto("/login")
    await page.locator("#email").fill("admin@creator-engine.local")
    await page.locator("#password").fill("creatorengine123")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 30_000 })

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
})
