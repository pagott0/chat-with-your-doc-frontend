// app/upload/upload-form.tsx
'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const { data: session } = useSession()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    try {
      setIsUploading(true)
      setProgress(20)
      
      const res = await fetch("http://localhost:4000/upload", {
        method: "POST",
        body: formData,
        headers: {
          "Authorization": `Bearer ${session?.user?.accessToken}`
        }
      })

      if (!res.ok) throw new Error("Erro no upload")

      setProgress(100)
      toast.success("Upload feito com sucesso!", {
        style: {
          background: "lightgreen",
        }
      })
    } catch (err) {
      console.error(err)
      toast.error("Erro ao realizar upload", {
        style: {
          background: "red",
          color: "white"
        }
      })
    } finally {
      setIsUploading(false)
      setTimeout(() => setProgress(0), 2000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">Selecione o documento</Label>
        <Input
          id="file"
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>
      {isUploading && <Progress value={progress} />}
      <Button type="submit" disabled={!file || isUploading}>
        {isUploading ? "Enviando..." : "Fazer upload"}
      </Button>
    </form>
  )
}

