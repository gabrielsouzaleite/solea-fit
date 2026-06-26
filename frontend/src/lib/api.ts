import type {
  Cliente,
  DashboardData,
  NovaVendaPayload,
  Produto,
  VendaAPI,
  VendaAuditLog,
  VendasPaginado,
} from '@/types'

const BASE = import.meta.env.VITE_API_URL as string

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `Erro ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// Prisma retorna Decimal como string — normaliza para number
function normalizeProduto(p: Record<string, unknown>): Produto {
  return {
    ...(p as unknown as Produto),
    custo: Number(p.custo),
    preco: Number(p.preco),
    variacoes: ((p.variacoes as Record<string, unknown>[]) ?? []).map(v => ({
      ...(v as unknown as import('@/types').Variacao),
    })),
  }
}

function normalizeVenda(v: Record<string, unknown>): VendaAPI {
  return {
    ...(v as unknown as VendaAPI),
    valorTotal: Number(v.valorTotal),
    itens: ((v.itens as Record<string, unknown>[]) ?? []).map(i => ({
      ...(i as unknown as import('@/types').ItemVendaAPI),
      precoUnit: Number(i.precoUnit),
      custoUnit: Number(i.custoUnit),
      produto: i.produto ? normalizeProduto(i.produto as Record<string, unknown>) : (i.produto as Produto),
    })),
  }
}

// --- Upload ---

export async function uploadFoto(file: File): Promise<string> {
  const form = new FormData()
  form.append('foto', file)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('Erro no upload da foto')
  const { url } = await res.json() as { url: string }
  return url
}

// --- Produtos ---

export async function getProdutos(): Promise<Produto[]> {
  const data = await apiFetch<Record<string, unknown>[]>('/produtos')
  return data.map(normalizeProduto)
}

export async function createProduto(body: Omit<Produto, 'id'>): Promise<Produto> {
  const data = await apiFetch<Record<string, unknown>>('/produtos', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return normalizeProduto(data)
}

export async function updateProduto(id: string, body: Omit<Produto, 'id'>): Promise<Produto> {
  const data = await apiFetch<Record<string, unknown>>(`/produtos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return normalizeProduto(data)
}

export async function deleteProduto(id: string): Promise<void> {
  await apiFetch<void>(`/produtos/${id}`, { method: 'DELETE' })
}

// --- Clientes ---

export async function getClientes(): Promise<Cliente[]> {
  return apiFetch<Cliente[]>('/clientes')
}

export async function createCliente(body: Omit<Cliente, 'id' | 'status'>): Promise<Cliente> {
  return apiFetch<Cliente>('/clientes', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateCliente(id: string, body: Partial<Cliente>): Promise<Cliente> {
  return apiFetch<Cliente>(`/clientes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// --- Vendas ---

export async function getVendas(params?: Record<string, string>): Promise<VendasPaginado> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const raw = await apiFetch<{ total: number; page: number; limit: number; data: Record<string, unknown>[] }>(`/vendas${qs}`)
  return {
    ...raw,
    data: raw.data.map(normalizeVenda),
  }
}

export async function createVenda(body: NovaVendaPayload): Promise<VendaAPI> {
  const data = await apiFetch<Record<string, unknown>>('/vendas', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return normalizeVenda(data)
}

export async function updateVendaStatus(id: string, status: 'pago' | 'pendente'): Promise<void> {
  await apiFetch<void>(`/vendas/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function updateVenda(id: string, body: NovaVendaPayload): Promise<VendaAPI> {
  const data = await apiFetch<Record<string, unknown>>(`/vendas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return normalizeVenda(data)
}

export async function deleteVenda(id: string, observacao: string): Promise<void> {
  await apiFetch<void>(`/vendas/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ observacao }),
  })
}

export async function getVendaLogs(id: string): Promise<VendaAuditLog[]> {
  return apiFetch<VendaAuditLog[]>(`/vendas/${id}/logs`)
}

// --- Dashboard ---

export async function getDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/dashboard')
}
