export type DocumentType = {
  id: number
  fileName: string
  extractedText: string
  messages: MessageType[]
}

export type MessageType = {
  id: number
  content: string
  role: string
}
