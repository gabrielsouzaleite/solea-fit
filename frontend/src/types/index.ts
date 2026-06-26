export interface Variacao {
  id: string
  cor: string
  tamanho: string
  quantidade: number
}

export interface Produto {
  id: string
  nomeFabrica: string
  nome: string
  foto?: string
  custo: number
  preco: number
  variacoes: Variacao[]
}

export interface Cliente {
  id: string
  nome: string
  sexo: 'M' | 'F' | 'Outro'
  contato: string
  dataNascimento?: string
  status: 'ativo' | 'desativado'
}

export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'brinde' | 'closet_da_dona'

export interface ItemVenda {
  produtoId: string
  variacaoId: string
  quantidade: number
  precoUnit: number
  custoUnit: number
}

export interface Venda {
  id: string
  itens: ItemVenda[]
  clienteId: string
  formaPagamento: FormaPagamento
  status: 'pago' | 'pendente'
  data: string
  valorTotal: number
}

// Tipos específicos da resposta da API (inclui relações embutidas)
export interface ItemVendaAPI {
  id: string
  vendaId: string
  produtoId: string
  produto: Produto
  variacaoId: string
  variacao: Variacao
  quantidade: number
  precoUnit: number
  custoUnit: number
}

export interface VendaAPI {
  id: string
  clienteId: string
  cliente: Cliente
  formaPagamento: FormaPagamento
  status: 'pago' | 'pendente'
  data: string
  valorTotal: number
  itens: ItemVendaAPI[]
}

export interface VendasPaginado {
  total: number
  page: number
  limit: number
  data: VendaAPI[]
}

export interface NovaVendaPayload {
  clienteId: string
  formaPagamento: string
  status: 'pago' | 'pendente'
  itens: { produtoId: string; variacaoId: string; quantidade: number; precoUnit: number; custoUnit: number }[]
}

export interface VendaAuditLog {
  id: string
  vendaId: string
  acao: 'editado' | 'deletado'
  dadosAntes: unknown
  dadosDepois: unknown | null
  observacao: string | null
  criadoEm: string
}

export interface DashboardData {
  totalVendido: number
  totalCusto: number
  lucro: number
  totalPendente: number
  totalBrindes: number
  porMes: { mes: string; vendas: number; custo: number; lucro: number; compras: number }[]
  porPagamento: { forma: string; total: number }[]
}
