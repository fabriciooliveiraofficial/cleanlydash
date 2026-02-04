# 📱 Guia de Transformação Mobile: Cleanlydash

Este documento serve como a referência técnica e estratégica mestre para a conversão da plataforma web Cleanlydash em aplicativos nativos de alta performance para Android e iOS.

---

## 🚀 1. Estratégia Técnica: Capacitor 6 (da Ionic)

Para manter a sincronização perfeita e o reaproveitamento de 100% do código atual (React + Vite + Tailwind), a tecnologia escolhida é o **Capacitor 6**.

### Por que Capacitor?
*   **Código Único**: Não precisamos escrever uma linha de código diferente para o Android ou iOS.
*   **Performance Nativa**: O app roda em uma "WebView" moderna, mas tem acesso total ao hardware (Câmera, GPS, Notificações, Biometria).
*   **Ecossistema Web**: Mantemos o uso do Supabase, Telnyx e toda a lógica de agendamentos que já funciona hoje.

---

## 💰 2. Análise de Custos (2026+)

| Item | Fornecedor | Custo Aproximado | Frequência |
| :--- | :--- | :--- | :--- |
| **Capacitor 6** | Ionic | **R$ 0,00** (Open Source) | - |
| **App Store (iOS)** | Apple | **US$ 99,00** | Anual |
| **Play Store (Android)**| Google | **US$ 25,00** | Única |
| **Build Local** | Você | **R$ 0,00** | - |
| **Capawesome Cloud** | Terceiro | **US$ 9,00** (Opcional) | Mensal |

> [!TIP]
> **Build Local**: Você pode fazer todo o deploy usando seu próprio computador sem pagar mensalidades para plataformas de CI/CD como o Ionic Appflow.

---

## 🔄 3. Sincronização em Tempo Real (Web ↔ Mobile)

O maior desafio é garantir que o Tenant veja o agendamento no celular no exato momento em que ele é feito na Web.

### Arquitetura de Sincronia:
1.  **Supabase Realtime**: O app móvel mantém um canal WebSocket aberto. Qualquer `INSERT` ou `UPDATE` na tabela `bookings` dispara um sinal para o celular em < 100ms.
2.  **Estratégia de "Catch-up"**: Caso o celular fique sem internet, ao reconectar, o app compara o `last_sync_at` local com o banco de dados e baixa apenas os agendamentos que ele perdeu enquanto estava offline.
3.  **Filas de Outbox**: Se o usuário fizer um agendamento no celular sem internet, o dado fica em uma fila local (Persistence) e é enviado automaticamente assim que o sinal voltar.

---

## 📦 4. Guia de Implementação e Deploy

Quando decidirmos iniciar, seguiremos estes passos:

### Passo 1: Preparação do Ambiente
1.  Instalar **Android Studio** (Android) e **Xcode** (iOS - requer Mac).
2.  Rodar `npm install @capacitor/core @capacitor/cli`.
3.  Rodar `npx cap init` para criar a identidade do app (ex: `com.cleanlydash.app`).

### Passo 2: O Ciclo de Desenvolvimento
Cada vez que mudarmos algo na Web e quisermos levar para o App:
```bash
npm run build       # Compila o React
npx cap sync        # Sincroniza os arquivos com os projetos Android/iOS
```

### Passo 3: Deploy Final
1.  **Android**: Dentro do Android Studio, gerar o arquivo `.aab` assinado e fazer upload no **Google Play Console**.
2.  **iOS**: Dentro do Xcode, arquivar o projeto e enviar para o **App Store Connect**.

---

## 🛠️ 5. Recursos Nativos Disponíveis
*   **Push Notifications**: Notificar o cleaner sobre novos jobs ou o tenant sobre pagamentos.
*   **VoIP (Telephony)**: Integrar o Telnyx para receber chamadas diretamente no app com a interface de telefone do sistema.
*   **Deep Links**: Links que abrem o app direto na página do agendamento específico.

---

## 📅 6. Próximos Passos (Roadmap)
1.  Finalizar a estabilização total da plataforma web atual.
2.  Instalar o Capacitor Core e gerar as pontes Android/iOS.
3.  Configurar o Firebase (FCM) para as notificações mobile.
4.  Configurar o Xcode para a publicação na App Store.

---
**Documento gerado pela Antigravity para referência futura.**
