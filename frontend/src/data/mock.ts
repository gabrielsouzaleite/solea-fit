import type { Cliente, Produto, Venda } from '@/types'

export const produtosMock: Produto[] = [
  {
    id: 'p1',
    nomeFabrica: 'Top Básico C023',
    nome: 'Top Liso',
    custo: 28,
    preco: 65,
    variacoes: [
      { id: 'v1', cor: 'Preto', tamanho: 'P', quantidade: 8 },
      { id: 'v2', cor: 'Preto', tamanho: 'M', quantidade: 5 },
      { id: 'v3', cor: 'Preto', tamanho: 'G', quantidade: 3 },
      { id: 'v4', cor: 'Branco', tamanho: 'P', quantidade: 6 },
      { id: 'v5', cor: 'Branco', tamanho: 'M', quantidade: 4 },
    ],
  },
  {
    id: 'p2',
    nomeFabrica: 'Conjunto Ribana A112',
    nome: 'Conjunto Ribana',
    custo: 55,
    preco: 130,
    variacoes: [
      { id: 'v6', cor: 'Rosa', tamanho: 'P', quantidade: 4 },
      { id: 'v7', cor: 'Rosa', tamanho: 'M', quantidade: 7 },
      { id: 'v8', cor: 'Verde', tamanho: 'M', quantidade: 2 },
      { id: 'v9', cor: 'Verde', tamanho: 'G', quantidade: 5 },
    ],
  },
  {
    id: 'p3',
    nomeFabrica: 'Short Moletom B045',
    nome: 'Short Moletom',
    custo: 32,
    preco: 75,
    variacoes: [
      { id: 'v10', cor: 'Cinza', tamanho: 'P', quantidade: 10 },
      { id: 'v11', cor: 'Cinza', tamanho: 'M', quantidade: 8 },
      { id: 'v12', cor: 'Cinza', tamanho: 'G', quantidade: 6 },
      { id: 'v13', cor: 'Preto', tamanho: 'M', quantidade: 3 },
    ],
  },
  {
    id: 'p4',
    nomeFabrica: 'Legging Suplex D067',
    nome: 'Legging Suplex',
    custo: 42,
    preco: 95,
    variacoes: [
      { id: 'v14', cor: 'Preto', tamanho: 'P', quantidade: 12 },
      { id: 'v15', cor: 'Preto', tamanho: 'M', quantidade: 9 },
      { id: 'v16', cor: 'Preto', tamanho: 'G', quantidade: 5 },
      { id: 'v17', cor: 'Vinho', tamanho: 'P', quantidade: 4 },
      { id: 'v18', cor: 'Vinho', tamanho: 'M', quantidade: 3 },
    ],
  },
  {
    id: 'p5',
    nomeFabrica: 'Vestido Malha E089',
    nome: 'Vestido Malha',
    custo: 68,
    preco: 155,
    variacoes: [
      { id: 'v19', cor: 'Nude', tamanho: 'P', quantidade: 3 },
      { id: 'v20', cor: 'Nude', tamanho: 'M', quantidade: 5 },
      { id: 'v21', cor: 'Nude', tamanho: 'G', quantidade: 2 },
    ],
  },
]

export const clientesMock: Cliente[] = [
  { id: 'c1', nome: 'Ana Paula Silva', sexo: 'F', contato: '(11) 99999-1111', status: 'ativo' },
  { id: 'c2', nome: 'Beatriz Souza', sexo: 'F', contato: '(11) 98888-2222', status: 'ativo' },
  { id: 'c3', nome: 'Carla Mendes', sexo: 'F', contato: '(11) 97777-3333', status: 'ativo' },
  { id: 'c4', nome: 'Daniela Costa', sexo: 'F', contato: '(21) 96666-4444', status: 'ativo' },
  { id: 'c5', nome: 'Eduardo Ferreira', sexo: 'M', contato: '(21) 95555-5555', status: 'desativado' },
  { id: 'c6', nome: 'Fernanda Lima', sexo: 'F', contato: '(31) 94444-6666', status: 'ativo' },
]

export const vendasMock: Venda[] = [
  {
    id: 'vn1',
    clienteId: 'c1',
    formaPagamento: 'pix',
    data: '2026-05-03',
    valorTotal: 130,
    itens: [{ produtoId: 'p2', variacaoId: 'v7', quantidade: 1, precoUnit: 130, custoUnit: 55 }],
  },
  {
    id: 'vn2',
    clienteId: 'c2',
    formaPagamento: 'cartao_credito',
    data: '2026-05-10',
    valorTotal: 160,
    itens: [
      { produtoId: 'p1', variacaoId: 'v1', quantidade: 1, precoUnit: 65, custoUnit: 28 },
      { produtoId: 'p3', variacaoId: 'v10', quantidade: 1, precoUnit: 75, custoUnit: 32 },
      { produtoId: 'p3', variacaoId: 'v13', quantidade: 1, precoUnit: 75, custoUnit: 32 },
    ],
  },
  {
    id: 'vn3',
    clienteId: 'c3',
    formaPagamento: 'dinheiro',
    data: '2026-05-18',
    valorTotal: 95,
    itens: [{ produtoId: 'p4', variacaoId: 'v14', quantidade: 1, precoUnit: 95, custoUnit: 42 }],
  },
  {
    id: 'vn4',
    clienteId: 'c4',
    formaPagamento: 'pix',
    data: '2026-05-22',
    valorTotal: 310,
    itens: [
      { produtoId: 'p5', variacaoId: 'v20', quantidade: 1, precoUnit: 155, custoUnit: 68 },
      { produtoId: 'p4', variacaoId: 'v15', quantidade: 1, precoUnit: 95, custoUnit: 42 },
      { produtoId: 'p1', variacaoId: 'v4', quantidade: 1, precoUnit: 65, custoUnit: 28 },
    ],
  },
  {
    id: 'vn5',
    clienteId: 'c1',
    formaPagamento: 'cartao_debito',
    data: '2026-06-05',
    valorTotal: 75,
    itens: [{ produtoId: 'p3', variacaoId: 'v11', quantidade: 1, precoUnit: 75, custoUnit: 32 }],
  },
  {
    id: 'vn6',
    clienteId: 'c6',
    formaPagamento: 'pix',
    data: '2026-06-12',
    valorTotal: 195,
    itens: [
      { produtoId: 'p2', variacaoId: 'v6', quantidade: 1, precoUnit: 130, custoUnit: 55 },
      { produtoId: 'p1', variacaoId: 'v2', quantidade: 1, precoUnit: 65, custoUnit: 28 },
    ],
  },
  {
    id: 'vn7',
    clienteId: 'c2',
    formaPagamento: 'pix',
    data: '2026-06-18',
    valorTotal: 155,
    itens: [{ produtoId: 'p5', variacaoId: 'v19', quantidade: 1, precoUnit: 155, custoUnit: 68 }],
  },
  {
    id: 'vn8',
    clienteId: 'c3',
    formaPagamento: 'cartao_credito',
    data: '2026-06-20',
    valorTotal: 260,
    itens: [
      { produtoId: 'p4', variacaoId: 'v17', quantidade: 1, precoUnit: 95, custoUnit: 42 },
      { produtoId: 'p2', variacaoId: 'v8', quantidade: 1, precoUnit: 130, custoUnit: 55 },
      { produtoId: 'p1', variacaoId: 'v5', quantidade: 1, precoUnit: 65, custoUnit: 28 },
    ],
  },
]
