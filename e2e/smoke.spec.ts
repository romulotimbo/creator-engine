import { test, expect } from "@playwright/test"

/**
 * Smoke E2E — requer Postgres com seed (admin@creator-engine.local / creatorengine123).
 * Rode: docker compose -f docker-compose.dev.yml up -d && npm run db:push && npm run db:seed
 * Depois: E2E_SMOKE=1 npm run test:e2e
 */
test.describe("smoke", () => {
  test.skip(!process.env.E2E_SMOKE, "defina E2E_SMOKE=1 com banco seeded")

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
})
