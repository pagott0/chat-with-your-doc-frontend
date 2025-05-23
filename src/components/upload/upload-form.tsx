'use client'

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { signOut, useSession } from "next-auth/react"
import { DocumentType, MessageType } from "@/app/helpers/types"
import { cn } from "@/lib/utils"
import { Download, Loader2, LogOutIcon, SendIcon, UploadIcon, X } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDropzone, DropzoneOptions } from "react-dropzone"

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const { data: session } = useSession()
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null)
  const [questionValue, setQuestionValue] = useState("")
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [documentsList, setDocumentsList] = useState<DocumentType[]>([])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  //tried to use useQuery but I was having a issue with it lagging when I tried to use queryClient.setQueryData
  //decided to use useEffect for simplicity
  useEffect(() => {
    if(!session?.user?.accessToken) return
    const fetchDocuments = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
        headers: {
          "Authorization": `Bearer ${session?.user?.accessToken}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch documents')
      const data = await res.json()
      setDocumentsList(data)
    }
    fetchDocuments()
  }, [session?.user?.accessToken])

  useEffect(() => {
    scrollToBottom()
  }, [selectedDocument?.messages])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg']
    },
    maxFiles: 1,
    multiple: false,
    onDragEnter: () => {},
    onDragOver: () => {},
    onDragLeave: () => {}
  } as DropzoneOptions)

  const removeFile = () => {
    setFile(null)
    setPreview(null)
  }

  async function handleSubmitImage(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    try {
      setIsUploading(true)
      setProgress(20)
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "Authorization": `Bearer ${session?.user?.accessToken}`
        }
      })
      if (!res.ok) {
        setIsUploading(false)
        setTimeout(() => setProgress(0), 2000)
        toast.error("Error uploading document", {
          style: {
            background: "red",
            color: "white"
          }
        })
        throw new Error("Error uploading document")
      }

      setProgress(100)
      toast.success("Document uploaded successfully!", {
        style: {
          background: "lightgreen",
        }
      })
      const data: DocumentType = await res.json()
      setSelectedDocument({
        ...data,
        messages: []
      })
      setDocumentsList([data, ...documentsList])
      setFile(null)
      setPreview(null)
    } catch (err) {
      console.error(err)
      toast.error("Error uploading document", {
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
    if (!questionValue || !selectedDocument) return
    setQuestionValue("")
    setIsAwaitingResponse(true)

    const optimisticMessages = [
      ...selectedDocument.messages,
      {
        id: -1,
        content: questionValue,
        role: "user"
      }
    ]
    setSelectedDocument({
      ...selectedDocument,
      messages: optimisticMessages
    })

    /* queryClient.setQueryData(
      ['selectedDocumentCompleteData', selectedDocument?.id],
      (old: DocumentType & { messages: MessageType[] }) => ({
        ...old,
        messages: optimisticMessages
      })
    ) */

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/${selectedDocument?.id}/message`, {
        method: "POST",
        body: JSON.stringify({ content: questionValue, imageExtractedText: selectedDocument?.extractedText }),
        headers: {
          "Authorization": `Bearer ${session?.user?.accessToken}`,
          "Content-Type": "application/json"
        }
      })
      if (!res.ok) throw new Error("Erro ao enviar mensagem")
      const data = await res.json()

      setSelectedDocument({
        ...selectedDocument,
        messages: [
          ...selectedDocument.messages.filter((m: MessageType) => m.id !== -1),
          ...data
        ]
      })
     

    } catch (error) {
      console.error(error)
      setSelectedDocument({
        ...selectedDocument,
        messages: selectedDocument.messages.filter((m: MessageType) => m.id !== -1)
      })
      /* queryClient.setQueryData(
        ['selectedDocumentCompleteData', selectedDocument?.id],
        (old: DocumentType & { messages: MessageType[] }) => ({
          ...old,
          messages: old.messages.filter((m: MessageType) => m.id !== -1)
        })
      ) */
      toast.error("Erro ao enviar mensagem", {
        style: {
          background: "red",
          color: "white"
        }
      })
    } finally {
      setIsAwaitingResponse(false)
    }
  }

  const handleDownloadDocument = async (documentId: number, documentName: string) => {
    setIsDownloading(true)
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/${documentId}/download`, {
      headers: {
        "Authorization": `Bearer ${session?.user?.accessToken}`
      }
    });
  
    if (!res.ok) {
      setIsDownloading(false)
      toast.error("Error downloading document", {
        style: {
          background: "red",
          color: "white"
        }
      })
      throw new Error("Error downloading document")
    }
  
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
  
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentName}.pdf`;
    document.body.appendChild(link);
    link.click();
  
    link.remove();
    window.URL.revokeObjectURL(url);
    setIsDownloading(false)
    toast.success("Document downloaded successfully!", {
      style: {
        background: "lightgreen",
      }
    })
  };
  
  

  return (
    <div className="flex flex-row w-full h-full">
      <div className="flex flex-col h-screen bg-accent w-1/5 p-4 space-y-4">
        {session?.user?.name && <h1 className="text-2xl font-bold">Hello, {session.user?.name.split(" ")[0]}!</h1> }
        <span className="text-violet-400 font-semibold text-sm">What do you wanna discover about your invoices today?</span>
        <div className="flex flex-col gap-2 max-h-[85vh] overflow-y-auto no-scrollbar">
          <div onMouseDown={() => setSelectedDocument(null)} className="flex flex-row gap-2 items-center justify-between border border-violet-400 p-4 rounded-md cursor-pointer hover:bg-violet-400/20 transition-transform duration-150">
            <span className="text-violet-400 font-semibold">Upload new invoice</span>
              <UploadIcon className="w-4 h-4 text-violet-400" />
          </div>
          {documentsList?.map((document: DocumentType) => (
            <div onMouseDown={() => {
                setSelectedDocument(document)
            }} key={document.id} className={cn("flex flex-col gap-2 border p-4 rounded-md cursor-pointer hover:bg-violet-400/20 transition-transform duration-150", selectedDocument?.id === document.id && "bg-accent-foreground/5")}>
              <h2>{document.fileName.split(".")[0]}</h2>
            </div>
          ))}
        </div>
        <div onClick={() => signOut()} className="flex flex-row gap-2 items-center p-4 cursor-pointer w-fit">
          <span className="text-violet-400 font-semibold">Exit</span>
          <LogOutIcon className="w-4 h-4 text-violet-400" />
        </div>
      </div>
      {!selectedDocument ? false ? (
        <div className="w-full space-y-4 items-center flex flex-col p-4">
          <div className="flex flex-row gap-2 items-center justify-center h-full w-full">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitImage} className="w-full space-y-4 p-8">
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center w-full">
              <div
                {...getRootProps()}
                className={cn(
                  "w-full max-w-2xl h-64 border-2 border-dashed rounded-lg p-6 transition-colors duration-200 ease-in-out",
                  isDragActive ? "border-violet-400 bg-violet-400/10" : "border-gray-300 hover:border-violet-400",
                  preview ? "h-auto" : ""
                )}
              >
                <input {...getInputProps()} />
                {preview ? (
                  <div className="relative w-full">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-64 object-contain rounded-lg"
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile()
                      }}
                      className="absolute top-2 right-2 bg-purple-500 rounded-full hover:bg-purple-600 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center cursor-pointer">
                    <UploadIcon className="w-12 h-12 text-violet-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700">
                      {isDragActive ? (
                        "Drop the image here"
                      ) : (
                        <>
                          Drag and drop your invoice image here, or{" "}
                          <span className="text-violet-400">browse</span>
                        </>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports PNG and JPG
                    </p>
                  </div>
                )}
              </div>
            </div>
            {isUploading && (
              <div className="w-full max-w-2xl mx-auto space-y-2">
                <Progress value={progress} className="h-2 bg-violet-400" />
                <p className="text-sm text-center text-gray-500">
                  Uploading... {progress}%
                </p>
                <p className="text-sm text-center text-gray-500">
                  Wait, this might take a while, we are extracting all the important information from your invoice.
                </p>
              </div>
            )}
            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={!file || isUploading}
                className={cn(
                  "w-full max-w-2xl bg-violet-400 hover:bg-violet-500 transition-transform duration-150",
                  !file && "opacity-50 cursor-not-allowed"
                )}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload Invoice"
                )}
              </Button>
            </div>
          </div>
        </form>
      ) : <div className="w-full space-y-4 items-center flex flex-col p-4">
        <div className="flex flex-row gap-4 items-center justify-between">
          <h2 className="text-lg font-semibold">{selectedDocument?.fileName.split(".")[0]}</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild className="cursor-pointer">
                <Download className={cn("w-5 h-5 text-violet-400 cursor-pointer", isDownloading && 'opacity-50 cursor-not-allowed')} onMouseDown={async () => {
                  if (isDownloading) return
                  await handleDownloadDocument(selectedDocument?.id, selectedDocument?.fileName.split(".")[0])
                }}/>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download PDF with the image, extracted text and questions and answers.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {isDownloading && <Loader2 className="w-4 h-4 animate-spin text-violet-400" />}
        </div>  
        
        
        {selectedDocument?.messages?.length > 0 ? <div className="flex flex-col gap-2 w-[65%] h-[80vh] overflow-y-auto no-scrollbar space-y-6">
          {selectedDocument?.messages.map((message) => (
            <div key={message.id} className={`p-3 rounded-xl ${message.role === 'user' ? 'bg-violet-950/30 self-end max-w-[75%]' : 'bg-violet-700/30 self-start max-w-[75%]'}` }>
              <p>{message.content}</p>
            </div>
          ))}
          {isAwaitingResponse && <div className="p-3 rounded-xl bg-violet-700/30 self-start">
            <p className="animate-pulse animate-infinite">Wait, I&apos;m thinking...</p>
          </div>}
          <div ref={messagesEndRef} />
        </div> : <div className="text-center w-[65%] h-[80vh] flex flex-col items-center justify-center gap-2">
          <span className="text-gray-600 font-semibold">No messages yet, ask me anything about your invoice!</span>
          <span onClick={() => setQuestionValue('"What is the total amount of the invoice?"')} className="text-violet-400 cursor-pointer">{'"What is the total amount of the invoice?"'}</span>
          <span onClick={() => setQuestionValue('"How about the due date?"')} className="text-violet-400 cursor-pointer">{'"How about the due date?"'}</span>
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

