export type TicketCategory = 'bug' | 'quality' | 'feature' | 'other'
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'

export type TicketMessage = {
  id: string
  content: string
  authorUid: string
  authorName: string
  isAdmin: boolean
  createdAt: string
}
