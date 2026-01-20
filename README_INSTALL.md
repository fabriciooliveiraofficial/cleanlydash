// ARQUIVO: README_INSTALL.md

# 🛠️ Guia de Instalação - Bloco 1: Infraestrutura

Siga a ordem abaixo para configurar o ambiente de desenvolvimento:

## 1. Inicialização do Projeto
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir false --import-alias "@/*"
```

## 2. Configuração Shadcn/UI
```bash
npx shadcn-ui@latest init
# Escolha: Default style, Slate color, CSS variables: yes
```

## 3. Dependências Core & Temas
```bash
npm install @supabase/supabase-js @supabase/ssr lucide-react zod react-hook-form next-themes clsx tailwind-merge
```

## 4. Componentes UI Necessários
```bash
npx shadcn-ui@latest add button input card form label toast dropdown-menu
```

## 5. Variáveis de Ambiente (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=seu_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
```