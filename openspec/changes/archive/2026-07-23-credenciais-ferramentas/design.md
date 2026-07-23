## Context

O model `Credencial` já existe com campos `personaId`, `global`, `chave`, `valorEnc`, `categoria`, `notas` e audit log via `CredencialLog`. A UI em `/personas/[slug]/credenciais` implementa CRUD, reveal com senha mestra (+ TOTP se ativo) e log de auditoria.

O model `Ferramenta` (CE-01) registra assinaturas e metadados, mas **não expõe credenciais**. O campo `global` em `Credencial` foi modelado para credenciais não vinculadas a persona, porém nunca ganhou UI nem validação formal de escopo.

Padrão do projeto: Server Component + Client modal + `/api/credenciais` + `apiUrl()` + AES-256-GCM + `router.refresh()`.

## Goals / Non-Goals

**Goals:**

- Expor credenciais compartilhadas (escopo global/ferramenta) na página `/ferramentas`
- Reutilizar tabela `Credencial`, criptografia, reveal e audit log — zero duplicação de lógica sensível
- Permitir vínculo opcional credencial → registro `Ferramenta` (`ferramentaId`)
- Garantir isolamento: listagens de persona mostram só credenciais da persona; Ferramentas mostra só globais
- Estender API existente com filtros de escopo, sem nova rota paralela

**Non-Goals:**

- Credenciais por persona dentro de cada card de ferramenta (escopo futuro)
- Compartilhar credencial entre subset de personas (só global ou por persona)
- Import/export de credenciais
- Alterar fluxo de reveal ou rotação de `ENCRYPTION_KEY`

## Decisions

### D1 — Escopo via `global` + FKs (sem enum novo)

**Decisão:** Formalizar três escopos pela combinação de campos existentes:

| Escopo | `global` | `personaId` | `ferramentaId` | Onde listar |
|--------|----------|-------------|----------------|-------------|
| Persona | `false` | set | `null` | `/personas/[slug]/credenciais` |
| Global | `true` | `null` | `null` | `/ferramentas` (credenciais globais) |
| Ferramenta | `true` | `null` | set (opcional) | `/ferramentas` (+ coluna/link para ferramenta) |

**Alternativa rejeitada:** Enum `EscopoCredencial` — redundante com `global` + FKs; migration desnecessária.

### D2 — Adicionar `ferramentaId` opcional em `Credencial`

**Decisão:** FK opcional `ferramentaId → Ferramenta.id` (`onDelete: SetNull`). Relação inversa `Ferramenta.credenciais Credencial[]`.

**Racional:** Operador associa API key ao registro ComfyUI/Midjourney já cadastrado; filtro e exibição por ferramenta na UI.

**Alternativa rejeitada:** Campo texto `ferramentaNome` — duplica dados e quebra integridade.

### D3 — Componente compartilhado `CredenciaisPanel`

**Decisão:** Extrair de `CredenciaisClient` um componente reutilizável `CredenciaisPanel` com props:

```typescript
type CredenciaisPanelProps = {
  escopo: "persona" | "global"
  personaId?: string
  ferramentas?: { id: string; nome: string }[] // dropdown opcional no modal
  credenciais: Cred[]
  logs: Log[]
}
```

- Persona page passa `escopo="persona"` + `personaId`
- Ferramentas page passa `escopo="global"` + lista de ferramentas para select no modal

**Alternativa rejeitada:** Duplicar JSX — divergência de segurança (reveal, audit) inaceitável.

### D4 — API: estender `/api/credenciais` (não criar `/api/ferramentas/credenciais`)

**Decisão:**

| Método | Query/body | Comportamento |
|--------|------------|---------------|
| GET | `?personaId=` | Credenciais da persona (`global=false`) |
| GET | `?global=true` | Credenciais globais (`global=true`) |
| GET | `?ferramentaId=` | Subconjunto vinculado a uma ferramenta |
| POST | `{ global, personaId?, ferramentaId?, ... }` | Valida escopo mutualmente exclusivo |
| PUT | idem | Não permite mudar escopo (persona↔global) |

Validação Zod (superRefine):

- `global=false` → exige `personaId`, proíbe `ferramentaId`
- `global=true` → exige `personaId=null`, `ferramentaId` opcional

**Alternativa rejeitada:** Rota separada — duplicaria encrypt/reveal/audit.

### D5 — UI em Ferramentas: seção abaixo do dashboard

**Decisão:** Manter `/ferramentas` como página única; adicionar seção **"Credenciais globais"** (`Surface` + tabela) abaixo do grid/modal de ferramentas existente, com audit log compacto (últimos 15, mesmo padrão persona).

**Alternativa rejeitada:** Sub-rota `/ferramentas/credenciais` — fragmenta módulo CE-01.

### D6 — Categoria em credenciais globais

**Decisão:** Reutilizar campo `categoria` (string livre com sugestões no select): `runpod`, `comfyui`, `midjourney`, `dolphin`, `proxy`, `api`, `email`, `outro`. No modal global, pré-popular sugestões alinhadas a `CategoriaFerramenta` onde fizer sentido.

## Risks / Trade-offs

- **[Risk] Credencial global listada por engano na persona** → Mitigação: queries estritas (`global=false` + `personaId`); testes de regressão na page persona
- **[Risk] Mudança de escopo via PUT** → Mitigação: API rejeita alteração de `global`/`personaId`/`ferramentaId` após criação
- **[Risk] `ferramentaId` apontando para ferramenta excluída** → Mitigação: `onDelete: SetNull`; credencial permanece global órfã
- **[Trade-off] Credenciais globais sem `ferramentaId`** → Aceitável para logins genéricos (ex.: conta Google compartilhada)

## Migration Plan

1. `prisma db push` — adiciona `ferramentaId` nullable + índice
2. Credenciais existentes com `global=true` e `personaId=null` passam a aparecer em Ferramentas automaticamente
3. Deploy app; smoke test: criar cred global, reveal, verificar audit log; confirmar que persona page não lista global
4. Rollback: remover seção UI; coluna `ferramentaId` nullable não quebra dados

## Open Questions

- _(Nenhuma bloqueante)_ — escopo e UX acordados: globais em Ferramentas, personas inalteradas
