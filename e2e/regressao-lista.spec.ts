import { test, expect } from "@playwright/test"

/**
 * Regressão — "registros somem após criar um novo".
 * Requer Postgres com seed e AUTH_DEV_EMAIL (playwright.config.ts).
 */
test.describe("regressão lista pós-criação", () => {
  test.skip(!process.env.E2E_SMOKE, "defina E2E_SMOKE=1 com banco seeded")
  test.setTimeout(60_000)

  test("criar ferramenta via modal mantém as antigas na lista", async ({ page }) => {
    const toolName = `Regressao ${Date.now()}`

    await page.goto("/ferramentas")
    await expect(page.getByRole("heading", { name: "Ferramentas" })).toBeVisible()

    // captura os nomes exibidos ANTES da criação
    const tabela = page.locator("table").first()
    await expect(tabela.locator("tbody tr")).not.toHaveCount(0)
    const antes = await tabela.locator("tbody tr td:first-child").allInnerTexts()

    await page.getByRole("button", { name: "+ Nova ferramenta" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("textbox").first().fill(toolName)
    await dialog.getByRole("button", { name: "Salvar" }).click()

    // a nova deve aparecer sem reload…
    await expect(page.getByText(toolName)).toBeVisible({ timeout: 15_000 })
    // …e NENHUMA antiga pode ter sumido (bug relatado)
    for (const nome of antes) {
      await expect(tabela.getByText(nome, { exact: true }), `"${nome}" sumiu da lista após criar "${toolName}"`).toBeVisible()
    }

    // limpeza: remove a ferramenta criada pelo teste
    const ferramentas = await (await page.request.get("/api/ferramentas")).json()
    for (const f of ferramentas.filter((f: { nome: string }) => f.nome === toolName)) {
      await page.request.delete(`/api/ferramentas/${f.id}`)
    }
  })
})
