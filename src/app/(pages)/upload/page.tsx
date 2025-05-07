
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { UploadForm } from "@/components/upload/upload-form"



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
