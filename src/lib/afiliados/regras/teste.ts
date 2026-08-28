import type { PrismaClient } from "@prisma/client"
import { criarItemFilaComDedup } from "@/lib/afiliados/fila"
import { decimalNum } from "@/lib/afiliados"

/**
 * Regras de teste inicial (ticket 07 — .scratch/afiliados-ciclo-oportunidade-escala).
 *
 * Teto de gasto: uniforme, 100% da comissão até US$100, fixo em US$100 acima
 * disso — matematicamente `min(comissão, 100)`. USD sem conversão de moeda
 * (`Campanha.moeda` não é lido aqui — pressuposto operacional: contas de
 * tráfego deste fluxo são faturadas em USD).
 *
 * Gate de checkout: cresce por faixa e nunca reseta (herança cumulativa):
 * ≤US$40 → 0 · US$40–60 → ≥1 · US$60–80 → ≥2 · US$80–100 → ≥2 (herdado).
 * Ausência de checkout suficiente NÃO cria um segundo teto — é anexada como
 * evidência ao ItemFila do teto (nunca bloqueia o gasto até lá).
 */

export function tetoTesteUsd(comissaoValorUsd: number): number {
  return Math.min(comissaoValorUsd, 100)
}

export function checkoutsMinimosParaFaixa(comissaoValorUsd: number): number {
  if (comissaoValorUsd <= 40) return 0
  if (comissaoValorUsd <= 60) return 1
  return 2 // 60–80, 80–100 (herdado) e >100 mantêm o mínimo de 2
}

export type AvaliacaoRegraTeste = {
  tetoUsd: number
  tetoAtingido: boolean
  checkoutsMinimos: number
  checkoutsSuficientes: boolean
  /**
   * Alerta de faixa >US$100 (ticket 07, item 5): cruzar 50–60% do teto de
   * US$100 gasto sem nenhum checkout dispara um item PRÓPRIO, mais cedo que
   * o teto final — não é o mesmo gatilho, nem um segundo teto.
   *
   * Nota: `spec.md` (afiliados-regras-teste-escala) descreve esse alerta
   * como "checkouts entre 50% e 60% do gate", o que é matematicamente
   * inconsistente com um gate inteiro pequeno (ex. 55% de 2 checkouts).
   * A fonte primária (ticket 07, resolução, item 5) é inequívoca: é o
   * **gasto** cruzando 50–60% do teto de US$100 **sem** checkout — a
   * implementação segue a fonte primária.
   */
  alertaFaixaAlta: boolean
}

export function avaliarRegraTeste(input: {
  comissaoValorUsd: number
  gastoAcumuladoUsd: number
  checkoutsCount: number
}): AvaliacaoRegraTeste {
  const tetoUsd = tetoTesteUsd(input.comissaoValorUsd)
  const checkoutsMinimos = checkoutsMinimosParaFaixa(input.comissaoValorUsd)
  const tetoAtingido = input.gastoAcumuladoUsd >= tetoUsd
  const checkoutsSuficientes = input.checkoutsCount >= checkoutsMinimos

  let alertaFaixaAlta = false
  if (input.comissaoValorUsd > 100 && input.checkoutsCount === 0 && tetoUsd > 0) {
    const pct = input.gastoAcumuladoUsd / tetoUsd
    alertaFaixaAlta = pct >= 0.5 && !tetoAtingido
  }

  return { tetoUsd, tetoAtingido, checkoutsMinimos, checkoutsSuficientes, alertaFaixaAlta }
}

/**
 * Avalia a regra de teste para uma Campanha `TESTANDO` e gera `ItemFila`
 * quando aplicável (job/trigger — chamado a cada novo CampanhaSnapshot ou
 * VendaAfiliado relevante). Não-op para campanhas fora de `TESTANDO`.
 */
export async function avaliarRegraTesteCampanha(client: PrismaClient, campanhaId: string): Promise<void> {
  const campanha = await client.campanha.findUnique({
    where: { id: campanhaId },
    select: {
      id: true,
      status: true,
      gastoTotalAcumulado: true,
      produto: { select: { comissaoValor: true } },
      snapshots: { orderBy: { dataSnapshot: "desc" }, take: 1, select: { checkoutsCount: true } },
    },
  })
  if (!campanha || campanha.status !== "TESTANDO") return
  if (campanha.produto.comissaoValor == null) return // sem comissão cadastrada, regra não tem base pra rodar

  const avaliacao = avaliarRegraTeste({
    comissaoValorUsd: decimalNum(campanha.produto.comissaoValor),
    gastoAcumuladoUsd: campanha.gastoTotalAcumulado != null ? decimalNum(campanha.gastoTotalAcumulado) : 0,
    checkoutsCount: campanha.snapshots[0]?.checkoutsCount ?? 0,
  })

  if (avaliacao.tetoAtingido) {
    await criarItemFilaComDedup(client, {
      tipoAlvo: "CAMPANHA",
      alvoId: campanhaId,
      regra: "teste.tetoComissao",
      prioridade: "ALTA",
      resumo: avaliacao.checkoutsSuficientes
        ? `Teto de teste (US$${avaliacao.tetoUsd.toFixed(2)}) atingido, com checkout suficiente — avaliar keep/kill.`
        : `Teto de teste (US$${avaliacao.tetoUsd.toFixed(2)}) atingido SEM checkout suficiente (mínimo ${avaliacao.checkoutsMinimos}) — sinal de baixo desempenho.`,
      evidencia: {
        tetoUsd: avaliacao.tetoUsd,
        checkoutsMinimos: avaliacao.checkoutsMinimos,
        checkoutsSuficientes: avaliacao.checkoutsSuficientes,
      },
    })
  }

  if (avaliacao.alertaFaixaAlta) {
    await criarItemFilaComDedup(client, {
      tipoAlvo: "CAMPANHA",
      alvoId: campanhaId,
      regra: "teste.alertaFaixaAlta",
      prioridade: "MEDIA",
      resumo: `Comissão high-ticket (>US$100): gasto já passou de 50% do teto (US$${avaliacao.tetoUsd.toFixed(2)}) sem nenhum checkout.`,
    })
  }
}
