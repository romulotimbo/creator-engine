export class OfertaTerminalError extends Error {
  constructor() {
    super(
      "Oferta já convertida (EM_EXECUCAO) é terminal — não pode voltar para GARIMPO/ANALISE/APROVADO_TESTE/PAUSADO/DESCARTADO",
    )
    this.name = "OfertaTerminalError"
  }
}

/**
 * `OfertaDecisao.statusDecisao = EM_EXECUCAO` é terminal (ticket 09, D8) —
 * nenhum fluxo move a oferta de volta para GARIMPO/ANALISE/APROVADO_TESTE
 * depois da conversão. `PAUSADO`/`DESCARTADO` só são válidos ANTES de
 * EM_EXECUCAO. O diagnóstico keep/kill pós-conversão vive em
 * `Campanha.status`/`motivoEncerramento`, nunca em `OfertaDecisao`.
 */
export function assertTransicaoOfertaValida(statusAtual: string, statusNovo: string): void {
  if (statusAtual === "EM_EXECUCAO" && statusNovo !== "EM_EXECUCAO") {
    throw new OfertaTerminalError()
  }
}
