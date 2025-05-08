// app/upload/upload-form.tsx
'use client'

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { signOut, useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { DocumentType, MessageType } from "@/app/helpers/types"
import { cn } from "@/lib/utils"
import { Loader2, LogOutIcon, SendIcon, UploadIcon } from "lucide-react"

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const { data: session } = useSession()
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null)
  const [questionValue, setQuestionValue] = useState("")
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const { data: documents, refetch: refetchDocuments } = useQuery<DocumentType[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await fetch("http://localhost:4000/upload", {
        headers: {
          "Authorization": `Bearer ${session?.user?.accessToken}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch documents')
      const data = await res.json()
      return data
    },
    enabled: !!session?.user?.accessToken,
    refetchOnWindowFocus: false,
  })

  const { data: selectedDocumentCompleteData, isFetching: isFetchingSelectedDocument } = useQuery<DocumentType & { messages: MessageType[] }>({
    queryKey: ['selectedDocumentCompleteData', selectedDocument?.id],
    queryFn: async () => {
      const res = await fetch(`http://localhost:4000/upload/${selectedDocument?.id}`, {
        headers: {
          "Authorization": `Bearer ${session?.user?.accessToken}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch document')
      const data = await res.json()
      return data
    },
    enabled: !!session?.user?.accessToken && !!selectedDocument?.id
  })

  useEffect(() => {
    scrollToBottom()
  }, [selectedDocumentCompleteData?.messages])

  async function handleSubmitImage(e: React.FormEvent) {
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
      const data: DocumentType = await res.json()
      setSelectedDocument(data)
      await refetchDocuments()
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

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!questionValue || !selectedDocumentCompleteData) return
    setQuestionValue("")
    setIsAwaitingResponse(true)
    //we will use the optimistic ui concept to add the new question to the list of messages before the server response
    const newMessageUser = {
      id: -1,
      content: questionValue,
      role: "user"
    }
    const newMessages = [...selectedDocumentCompleteData?.messages, newMessageUser]
    selectedDocumentCompleteData.messages = newMessages
    const res = await fetch(`http://localhost:4000/upload/${selectedDocument?.id}/message`, {
      method: "POST",
      body: JSON.stringify({ content: questionValue, imageExtractedText: selectedDocumentCompleteData?.extractedText }),
      headers: {
        "Authorization": `Bearer ${session?.user?.accessToken}`,
        "Content-Type": "application/json"
      }
    })
    if (!res.ok) throw new Error("Erro ao enviar mensagem")
    const data = await res.json()
    //instead of refetching the document, we will just update the messages
    const assistantMessage = data.find((message: MessageType & {documentId: number}) => message.role === "assistant")
    const userMessage = data.find((message: MessageType & {documentId: number}) => message.role === "user")
    const newMessagesFinal = [...selectedDocumentCompleteData?.messages.filter((message: MessageType) => message.id !== -1), {
      id: userMessage.id,
      content: userMessage.content,
      role: userMessage.role
    }, {
      id: assistantMessage.id,
      content: assistantMessage.content,
      role: assistantMessage.role
    }]
    selectedDocumentCompleteData.messages = newMessagesFinal
    setIsAwaitingResponse(false)
  }

  return (
    <div className="flex flex-row w-full h-full">
      <div className="flex flex-col h-screen bg-accent w-1/5 p-4 space-y-4">
        {session?.user?.name && <h1 className="text-2xl font-bold">Hello, {session.user?.name}!</h1> }
        <div className="flex flex-col gap-2 max-h-[85vh] overflow-y-auto no-scrollbar">
          <div onMouseDown={() => setSelectedDocument(null)} className="flex flex-row gap-2 items-center justify-between border border-violet-400 p-4 rounded-md cursor-pointer hover:bg-violet-400/20 transition-transform duration-150">
            <span className="text-violet-400 font-semibold">Upload new invoice</span>
              <UploadIcon className="w-4 h-4 text-violet-400" />
          </div>
          {documents?.map((document) => (
            <div onClick={() => {
                setSelectedDocument(document)
            }} key={document.id} className={cn("flex flex-col gap-2 border p-4 rounded-md cursor-pointer hover:bg-violet-400/20 transition-transform duration-150", selectedDocument?.id === document.id && "bg-accent-foreground/5")}>
              <h2>{document.fileName}</h2>
            </div>
          ))}
        </div>
        <div onClick={() => signOut()} className="flex flex-row gap-2 items-center p-4 cursor-pointer w-fit">
          <span className="text-violet-400 font-semibold">Exit</span>
          <LogOutIcon className="w-4 h-4 text-violet-400" />
        </div>
      </div>
      {!selectedDocumentCompleteData ? isFetchingSelectedDocument ? <div className="w-full space-y-4 items-center flex flex-col p-4">
        <div className="flex flex-row gap-2 items-center justify-center h-full w-full">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div> : <form onSubmit={handleSubmitImage} className="w-full space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Select the invoice image</Label>
          <Input
            id="file"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
        </div>
        {isUploading && <Progress value={progress} />}
        <Button type="submit" disabled={!file || isUploading}>
          {isUploading ? "Sending..." : "Upload"}
        </Button>
      </form> : <div className="w-full space-y-4 items-center flex flex-col p-4">
        <h2 className="text-lg font-semibold">{selectedDocument?.fileName.split(".")[0]}</h2>
        {selectedDocumentCompleteData?.messages.length > 0 ? <div className="flex flex-col gap-2 w-[65%] h-[80vh] overflow-y-auto no-scrollbar space-y-6">
          {selectedDocumentCompleteData?.messages.map((message) => (
            <div key={message.id} className={`p-3 rounded-xl ${message.role === 'user' ? 'bg-violet-950/30 self-end max-w-[75%]' : 'bg-violet-700/30 self-start max-w-[75%]'} `}>
              <p>{message.content}</p>
            </div>
          ))}
          {isAwaitingResponse && <div className="p-3 rounded-xl bg-violet-700/30 self-start">
            <p className="animate-pulse animate-infinite">Wait, I&apos;m thinking...</p>
          </div>}
          <div ref={messagesEndRef} />
        </div> : <div className="text-center w-[65%] h-[80vh] flex flex-col items-center justify-center gap-2">
          <span className="text-gray-600 font-semibold">No messages yet, ask me anything about your invoice!</span>
          <span className="text-violet-400">{'"What is the total amount of the invoice?"'}</span>
          <span className="text-violet-400">{'"How about the due date?"'}</span>
          </div>}
        <div className="border border-violet-400 rounded-2xl p-2 w-[65%] flex flex-row">
          <Input 
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmitQuestion(e)
              }
            }}
            value={questionValue}
            onChange={(e) => setQuestionValue(e.target.value)}
            placeholder="Ask anything about your invoice!" 
            className="w-full border-none outline-none shadow-none focus:ring-0 focus:ring-offset-0 focus:border-none focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none focus-visible:shadow-none"/>
          <Button type="submit" disabled={!questionValue} onClick={handleSubmitQuestion} className="bg-violet-400 hover:bg-violet-500 transition-transform duration-150">
            <SendIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>}
    </div>
  )
}

