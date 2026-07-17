import { PageHeader } from "@/components/ui/primitives"
import CuradoriaDmPanel from "@/components/curadoria-dms/CuradoriaDmPanel"

export default function CuradoriaDmsPage() {
  return (
    <div>
      <PageHeader
        kicker="Creator Engine"
        title="Curadoria DMs"
        description="Revise rascunhos de resposta do Instagram (@veesemfiltro) antes do envio pelo n8n"
      />
      <CuradoriaDmPanel />
    </div>
  )
}
