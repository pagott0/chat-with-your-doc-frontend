// app/upload/upload-form.tsx
'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { DocumentType } from "@/app/helpers/types"
export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const { data: session } = useSession()
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null)
  const [questionValue, setQuestionValue] = useState("")

  const { data: documents } = useQuery<DocumentType[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await fetch("http://localhost:4000/upload", {
        headers: {
          "Authorization": `Bearer ${session?.user?.accessToken}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch documents')
      const data = await res.json()
      console.log(data)
      return data
    },
    enabled: !!session?.user?.accessToken
  })


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
    <div className="flex flex-row w-full h-full">
      <div className="flex flex-col h-screen bg-accent w-1/4 p-4 space-y-4">
        {session?.user?.name && <h1 className="text-2xl font-bold">Hello, {session.user?.name}!</h1> }
        <div className="flex flex-col gap-2">
          {documents?.map((document) => (
            <div onClick={() => setSelectedDocument(document)} key={document.id} className="flex flex-col gap-2 border p-4 rounded-md cursor-pointer hover:bg-accent-foreground/5 transition-transform duration-150">
              <h2>{document.fileName}</h2>
            </div>
          ))}
        </div>
      </div>
      {!selectedDocument ? <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Selecione o documento</Label>
          <Input
            id="file"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
        </div>
        {isUploading && <Progress value={progress} />}
        <Button type="submit" disabled={!file || isUploading}>
          {isUploading ? "Enviando..." : "Fazer upload"}
        </Button>
      </form> : <div className="w-full space-y-4 items-center flex flex-col p-4">
        <h2 className="text-lg font-semibold">{selectedDocument?.fileName}</h2>
        <div className="border border-gray-300 rounded-2xl p-2 w-2/5 flex flex-row">
          <Input 
            value={questionValue}
            onChange={(e) => setQuestionValue(e.target.value)}
            placeholder="Ask anything about your invoice!" 
            className="w-full border-none outline-none shadow-none focus:ring-0 focus:ring-offset-0 focus:border-none focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none focus-visible:shadow-none"/>
          <Button type="submit" disabled={!questionValue}>
            Ok
          </Button>
        </div>
      </div>}
    </div>
  )
}

