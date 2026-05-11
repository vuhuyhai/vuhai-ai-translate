export type MasterGlossaryEntry = {
  id: string
  ownerUid: string
  termEN: string
  termVI: string
  termVIAlts: string[]
  topic: string
  notes: string
  status: 'approved' | 'suggested' | 'rejected'
  sourceDocumentId: string | null
  sourceDocumentTitle: string | null
  usageCount: number
  createdAt: number
  updatedAt: number
}

export type ActivityEvent = {
  id: string
  ownerUid: string
  eventType:
    | 'translation_started'
    | 'translation_completed'
    | 'translation_partial'
    | 'pdf_exported'
    | 'docx_exported'
    | 'glossary_merged'
    | 'document_deleted'
    | 'document_shared'
  documentId: string | null
  documentTitle: string | null
  stats: {
    sectionsCount?: number
    wordsTranslated?: number
    topic?: string
    provider?: string
    mode?: string
  }
  timestamp: number
}

export type DashboardStats = {
  totalDocuments: number
  completedDocuments: number
  totalWordsTranslated: number
  totalPagesTranslated: number
  masterGlossarySize: number
  quotaUsedToday: number
  quotaLimitToday: number
  streakDays: number
}
