export type GlossaryStatus = 'suggested' | 'approved' | 'rejected'

export type GlossaryEntry = {
  id: string
  termEN: string
  termVI: string
  termVIAlts: string[]
  topic: string
  context: string
  notes: string
  status: GlossaryStatus
  usageCount: number
  createdAt: number
  updatedAt: number
}
