"use client"

import { useState } from "react"
import { PageHeader, Button } from "@/components/ui/primitives"
import { AfiliadosMainNav } from "@/components/afiliados/afiliados-main-nav"
import { CapitalAllocationWidget } from "@/components/afiliados/capital-allocation-widget"
import { RadarTabela, RadarOfertaItem } from "@/components/afiliados/radar-tabela"
import { ModalImportarCsv } from "@/components/afiliados/modal-importar-csv"
import { ModalOfertaForm } from "@/components/afiliados/modal-oferta-form"
import { ModalMigrarCampanha } from "@/components/afiliados/modal-migrar-campanha"
import { apiUrl } from "@/lib/api-url"
import { Upload, Plus } from "lucide-react"

export function RadarClient({ initialOfertas }: { initialOfertas: RadarOfertaItem[] }) {
  const [ofertas, setOfertas] = useState<RadarOfertaItem[]>(initialOfertas)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingOferta, setEditingOferta] = useState<RadarOfertaItem | null>(null)
  const [migratingOferta, setMigratingOferta] = useState<RadarOfertaItem | null>(null)

  async function reloadOfertas() {
    try {
      const res = await fetch(apiUrl("/api/afiliados/radar"))
      if (res.ok) {
        const data = await res.json()
        setOfertas(data)
      }
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta oferta do Radar?")) return

    try {
      const res = await fetch(apiUrl(`/api/afiliados/radar/${id}`), { method: "DELETE" })
      if (res.ok) {
        reloadOfertas()
      }
    } catch {}
  }

  // Cálculos para o widget de alocação de capital
  const totalOfertas = ofertas.length
  const ofertasEmAnalise = ofertas.filter((o) => ["GARIMPO", "ANALISE", "APROVADO_TESTE"].includes(o.statusDecisao)).length
  const budgetTotalAlocado = ofertas.reduce((acc, o) => acc + (o.budgetTesteAlocado || 0), 0)
  const scoreMedio = totalOfertas > 0 ? ofertas.reduce((acc, o) => acc + o.scoreCalculado, 0) / totalOfertas : 0
  const ofertasIncompletas = ofertas.filter((o) => o.completudeDados !== "COMPLETO").length

  return (
    <div>
      <PageHeader
        kicker="Afiliados"
        title="Radar & Decisão de Ofertas"
        description="Garimpe, compare métricas de leilão do Google Ads e EPC de redes para decidir a próxima campanha."
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" onClick={() => setShowImportModal(true)} style={{ fontSize: 13 }}>
              <Upload size={16} style={{ marginRight: 6 }} /> Importar CSV
            </Button>
            <Button
              onClick={() => {
                setEditingOferta(null)
                setShowFormModal(true)
              }}
              style={{ fontSize: 13 }}
            >
              <Plus size={16} style={{ marginRight: 6 }} /> Nova Oferta
            </Button>
          </div>
        }
      />

      <AfiliadosMainNav />

      <CapitalAllocationWidget
        totalOfertas={totalOfertas}
        ofertasEmAnalise={ofertasEmAnalise}
        budgetTotalAlocado={budgetTotalAlocado}
        scoreMedio={scoreMedio}
        ofertasIncompletas={ofertasIncompletas}
      />

      <RadarTabela
        ofertas={ofertas}
        onEdit={(oferta) => {
          setEditingOferta(oferta)
          setShowFormModal(true)
        }}
        onDelete={handleDelete}
        onMigrar={(oferta) => {
          setMigratingOferta(oferta)
        }}
      />

      {showImportModal && (
        <ModalImportarCsv
          onSuccess={() => {
            setShowImportModal(false)
            reloadOfertas()
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showFormModal && (
        <ModalOfertaForm
          initialData={editingOferta}
          onSuccess={() => {
            setShowFormModal(false)
            setEditingOferta(null)
            reloadOfertas()
          }}
          onClose={() => {
            setShowFormModal(false)
            setEditingOferta(null)
          }}
        />
      )}

      {migratingOferta && (
        <ModalMigrarCampanha
          ofertaId={migratingOferta.id}
          ofertaNome={migratingOferta.nome}
          comissaoValor={migratingOferta.comissaoValor}
          onSuccess={() => {
            setMigratingOferta(null)
            reloadOfertas()
          }}
          onClose={() => setMigratingOferta(null)}
        />
      )}
    </div>
  )
}
