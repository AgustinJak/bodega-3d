export interface Category {
  id: string
  name: string
  color: string | null
  sortOrder: number
  modelCount?: number
}

export interface Tag {
  id: string
  name: string
  modelCount?: number
}

export interface ModelImage {
  id: string
  modelId: string
  fileName: string
  filePath: string
  sortOrder: number
  createdAt?: string
}

export interface ModelListItem {
  id: string
  name: string
  description: string | null
  fileType: string
  fileName: string
  thumbnailPath: string | null
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  printCount: number
  printTimeSeconds: number | null
  filamentGrams: number | null
  costData: string | null
  updatedAt: string
  imageCount: number
  tagNames: string | null
}

export interface ModelDetail extends ModelListItem {
  filePath: string
  fileSize: number
  notes: string | null
  createdAt: string
  images: ModelImage[]
  tags: string[]
}

export interface Stats {
  models: number
  categories: number
  tags: number
  totalPrints: number
  queuePending: number
}

export interface CostSettings {
  precioKg: number
  precioKwh: number
  consumoW: number
  desgasteHoras: number
  precioRepuestos: number
  margenError: number
}

export interface CostInputs {
  horas: number
  minutos: number
  gramos: number
  insumos: number
}

export interface CostResult {
  precioMaterial: number
  precioLuz: number
  desgasteMaquina: number
  margenErrorVal: number
  subtotalSinInsumos: number
  totalSinInsumos: number
  totalACobrar: number
  precioML: number
}
