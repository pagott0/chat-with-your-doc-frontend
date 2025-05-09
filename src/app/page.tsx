

import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  } else {
    redirect("/upload")
  }

 /*  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">Bem-vindo, {session.user?.email}!</h1>
    </main>
  ) */
}
