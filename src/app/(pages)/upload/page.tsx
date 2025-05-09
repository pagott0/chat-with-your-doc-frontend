
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { UploadForm } from "@/components/upload/upload-form"
import { authOptions } from "@/lib/auth"



export default async function UploadPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }
  


  return (
    <main className="flex min-h-screen items-center ">
      <UploadForm />
    </main>
  )
}
