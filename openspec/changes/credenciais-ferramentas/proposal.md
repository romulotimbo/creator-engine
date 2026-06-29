## Why

O Creator Engine já armazena credenciais criptografadas (AES-256-GCM) por persona em `/personas/[slug]/credenciais`, mas **não há lugar para credenciais compartilhadas** — logins de RunPod, ComfyUI, Dolphin Anty, APIs de IA, proxies globais etc. que servem todas as personas. Hoje o operador mistura isso em notas externas ou repete cadastros por persona, quebrando o princípio de centralização do módulo Ferramentas (CE-01).

Com o fluxo de credenciais por persona estabilizado em produção, é o momento de unificar o modelo: **mesma tabela, mesmo reveal com senha mestra, mesmo audit log**, com escopo diferenciado (persona vs. global/ferramenta).

## What Changes

- Seção **Credenciais globais** na página `/ferramentas` — tabela CRUD + reveal + audit log (mesmo padrão visual/comportamental da persona)
- Reutilizar model `Credencial` existente, formalizando escopos:
  - **Persona:** `global=false`, `personaId` preenchido (sem mudança de UX)
  - **Global/ferramenta:** `global=true`, `personaId=null`, opcionalmente vinculada a um registro `Ferramenta` via `ferramentaId`
- Campo opcional `ferramentaId` em `Credencial` (FK → `Ferramenta`) para associar credencial a uma ferramenta cadastrada (ex.: API key do Midjourney → registro Midjourney)
- Estender API `/api/credenciais`:
  - `GET` com filtro `global=true` ou `ferramentaId`
  - `POST`/`PUT` validando escopo (global não aceita `personaId`; persona não aceita `global=true`)
- Garantir que credenciais globais **não apareçam** na listagem por persona e vice-versa
- Sidebar / navegação: credenciais globais acessíveis dentro de Ferramentas (sem nova rota top-level)

## Capabilities

### New Capabilities

- `credenciais-ferramentas`: UI e API para credenciais globais/compartilhadas no módulo Ferramentas, vínculo opcional com registro `Ferramenta`, reutilizando criptografia e audit log existentes

### Modified Capabilities

- `security-hardening`: Estender requisitos de reveal (senha mestra + TOTP) e audit log para credenciais globais em `/ferramentas`, não apenas por persona

## Impact

- **Schema Prisma:** `Credencial.ferramentaId` (opcional, FK), relação inversa em `Ferramenta`; possível enum `EscopoCredencial` ou convenção documentada via `global` + FKs
- **UI:** `src/app/(dashboard)/ferramentas/` — novo bloco ou aba de credenciais (componente reutilizado/adaptado de `CredenciaisClient`)
- **API:** `src/app/api/credenciais/route.ts`, `[id]/route.ts`, `[id]/reveal/route.ts` — filtros e validação de escopo
- **Persona credenciais:** ajuste de query para excluir `global=true`; sem mudança de fluxo para o operador
- **Deploy:** `prisma db push` no VPS após merge
