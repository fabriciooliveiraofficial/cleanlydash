# 🚀 CLEANLYDASH - ARQUITETURA & ROADMAP MESTRE (SYSTEM BLUEPRINT)

> **Documento Vivo:** Referência absoluta para arquitetura, regras de negócio e plano de execução.
> **Última Atualização:** 07/01/2025

---

## 1. VISÃO GERAL DO PROJETO
O **AirGoverness** é um Sistema Operacional (OS) para gestores de Airbnb focado em escala. Ele resolve a complexidade de gerenciar equipes de limpeza (turnovers), CRM de proprietários, faturamento automático e comunicação inteligente via VoIP com coaching de IA em tempo real.

---

## 2. STACK TECNOLÓGICA (MODERN STACK)
*   **Framework:** React 19 (Vite SPA) *[Nota: Migração de Next.js para Vite completa em 07/01]*
*   **Linguagem:** TypeScript (Strict Mode)
*   **Estilização:** Tailwind CSS (Utilitários e Design System)
*   **UI Components:** Shadcn/UI (Radix UI) - Estilo Minimalista/Enterprise
*   **Backend/BaaS:** Supabase (Auth, PostgreSQL, RLS, Storage, Realtime)
*   **IA Engine:** Google Gemini API (Modelos: `gemini-3-pro-preview` para lógica e `gemini-2.5-flash-native-audio` para voz)
*   **Telefonia:** Telnyx API (WebRTC para Softphone, SIP Trunking para números fixos)
*   **Geolocalização:** Photon API (Busca de endereços baseada em OpenStreetMap)
*   **Gráficos:** Recharts (Analytics operacionais)

---

## 3. ARQUITETURA DE DADOS (SCHEMA CORE)
**Multi-Tenancy:** Sistema baseado em `tenant_id`. Cada empresa é um Tenant isolado via RLS (Row Level Security).

### Tabelas Principais
*   `tenants`: Dados da empresa e chaves de API específicas.
*   `profiles`: Usuários vinculados a um tenant (Roles: owner, manager, cleaner).
*   `customers`: CRM de proprietários e imóveis (incluindo lat/lng).
*   `bookings`: Turnovers agendados, vinculados a imóveis e funcionários.
*   `wallet_ledger`: Livro caixa pré-pago (créditos e débitos atômicos).
*   `invoices`: Faturas geradas para cobrança de clientes.
*   `comms_logs`: Registros de chamadas, transcrições e análises de sentimento.

---

## 4. FLUXOS CRÍTICOS (WORKFLOWS)
1.  **Fluxo de Receita (Wallet):**
    *   Cliente adiciona saldo -> Sistema debita R$ 0,15/min de chamada -> Bloqueio automático se saldo < R$ 0,00.
2.  **Fluxo de Despacho:**
    *   Manager vê DispatchTimeline -> Atribui cleaner -> Cleaner recebe via PWA -> Conclui checklist -> Sistema gera Invoice automática.
3.  **Fluxo de Inteligência (Softphone):**
    *   Chamada ativa -> `useLiveCoach` captura áudio -> Gemini analisa -> Exibe "Tips" de negociação no Dialer.

---

## 5. STATUS DE IMPLEMENTAÇÃO
### ✅ Concluído (Fase 1 - Core & Infra)
*   **Infra:** Setup Vite + TypeScript + Tailwind (v3). Correção de dependências e ambiente de dev local.
*   **Auth:** Landing Page e Auth Flow (Login/Register/Verify) com Supabase.
*   **Design:** Correção de layout e aplicação de Design System (Shadcn/UI).
*   **Layout:** Sidebar inteligente (RBAC), Header.
*   **CRM:** Tela de Clientes com Photon API.
*   **Financeiro:** Wallet com Ledger e recarga simulada.
*   **Booking:** Kanban Board e Dispatch Timeline básica.

---

## 6. SUPER ROADMAP (Próximos Passos)

### 🚀 fase 2: Funcionalidades Críticas & Integrações

#### [ ] 2.1. PWA & Offline First
- [ ] Configurar `vite-plugin-pwa` para instalação mobile.
- [ ] Implementar cache de checklists para funcionamento offline (Cleaners).
- [ ] Manifesto do app e ícones.

#### [ ] 2.2. Telefonia Real (Telnyx)
- [ ] Substituir mock atual pela integração real com SDK `@telnyx/webrtc`.
- [ ] Implementar fluxo de autenticação JWT com Supabase Edge Functions (para não expor credenciais).
- [ ] Testar chamadas de voz inbound/outbound.

#### [ ] 2.3. Map View Realtime
- [ ] Integrar Leaflet ou Mapbox (via `react-leaflet`).
- [ ] Exibir Pins de imóveis usando coordenadas do CRM.
- [ ] (Opcional) Rastreamento de cleaners em tempo real.

#### [ ] 2.4. Invoicing & PDF
- [ ] Gerador de PDF (via `jspdf` ou `react-pdf`) para Faturas.
- [ ] Disparo automático de invoice por e-mail após conclusão de limpeza.

#### [ ] 2.5. Notificações & Webhooks
- [ ] Webhooks Supabase para gatilhos de eventos (Novo Booking, Saldo Baixo).
- [ ] Notificações Push (via OneSignal ou nativo).

---

## 7. DIRETRIZES PARA O DESENVOLVIMENTO
1.  **Extensões:** SEMPRE use `.tsx` para componentes e hooks com JSX, e `.ts` para lógica pura.
2.  **Segurança:** Toda query ao Supabase deve respeitar o RLS. Nunca bypassar o `tenant_id`.
3.  **Estética:** Design System "AirGoverness" - Cards `rounded-[2rem]`, sombras suaves, fontes `font-black`. Cores: Indigo (Primary), Emerald (Success), Rose (Danger).
4.  **IA:** Retornos do Gemini devem ser estruturados (JSON Schema).
5.  **Performance:** Evitar re-renders desnecessários no mapa e timelines.