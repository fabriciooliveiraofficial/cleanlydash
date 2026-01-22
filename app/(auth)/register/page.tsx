// ARQUIVO: app/(auth)/register/page.tsx
import { Metadata } from "next"
import Link from "next/link"
import { Plane } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserAuthForm } from "@/components/auth/user-auth-form"

export const metadata: Metadata = {
  title: "Cadastro | Cleanlydash",
  description: "Crie sua conta corporativa no Cleanlydash.",
}

export default function RegisterPage() {
  return (
    <div className="container relative flex h-screen flex-col items-center justify-center lg:px-0 bg-slate-50/50">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
        <div className="flex flex-col space-y-2 text-center items-center">
          <div className="rounded-2xl bg-indigo-600 p-2 text-white shadow-lg shadow-indigo-100 mb-2">
            <Plane size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cleanlydash
          </h1>
          <p className="text-sm text-slate-500">
            Tudo o que sua operação de limpeza precisa
          </p>
        </div>
        <Card className="border-slate-200/60 shadow-xl shadow-slate-200/40">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Criar Nova Empresa</CardTitle>
            <CardDescription>
              Comece a gerenciar seus turnovers profissionalmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserAuthForm type="register" />
          </CardContent>
        </Card>
        <p className="px-8 text-center text-sm text-slate-500">
          Já possui conta?{" "}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 underline-offset-4 hover:underline"
          >
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}