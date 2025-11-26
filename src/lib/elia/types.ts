export interface EliaFilters {
  colore?: string
  materiale?: string
  stile?: string
  prezzo_min?: number
  prezzo_max?: number
  tipo?: string
  dimensione?: string
  marca?: string
}

export interface EliaIntent {
  category: string
  subcategory?: string
  keywords: string[]
  filters: EliaFilters
  intent: 'ricerca' | 'confronto' | 'consiglio'
  confidence: number
}

export interface ProductResult {
  id: string
  sku?: string
  name: string
  description: string
  price: number
  stock: number
  image_url?: string
  brand?: string
  category: string[]
  relevance_score: number
  attributes: Record<string, any>
}

export interface StreamEvent {
  type: 'thinking' | 'intent' | 'products' | 'message' | 'done' | 'error'
  data?: any
  step?: string
  message?: string
  timestamp?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  products?: ProductResult[]
  suggestions?: string[]
  timestamp: Date
}
