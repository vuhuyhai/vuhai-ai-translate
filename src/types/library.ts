export type DocumentStatus = 'complete' | 'partial' | 'draft'

export type SectionSnapshot = {
  id: string
  title: string
  originalText: string
  translatedText: string
  wordCount: number
  status: 'done' | 'pending' | 'error'
  agentResults?: {
    analystNotes?: string
    translated?: string
    edited?: string
    qaReport?: object
  }
  editHistory?: EditRecord[]
  lastEditedAt?: number
}

export type EditRecord = {
  id: string
  previousText: string
  newText: string
  editedAt: number
  editedBy: 'user' | 'ai'
}

export type ShareSettings = {
  isPublic: boolean
  shareId: string | null
  shareUrl: string | null
  allowRetranslate: boolean
  expiresAt: number | null
  viewCount: number
}

export type TranslatedDocument = {
  id: string
  ownerUid: string
  ownerName: string | null
  ownerEmail: string | null

  title: string
  customTitle: string | null
  topic: string
  audience: string
  provider: 'gemini' | 'claude'
  mode: 'quick' | 'pro'

  status: DocumentStatus
  totalSections: number
  completedSections: number
  totalWords: number
  translatedWords: number

  sections: SectionSnapshot[]
  glossary: Array<{ en: string; vi: string }>

  createdAt: number
  updatedAt: number
  completedAt: number | null

  shareSettings: ShareSettings

  fileMetadata: {
    name: string
    size: number
    pages: number
  }
}
