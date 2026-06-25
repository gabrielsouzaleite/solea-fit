import Papa from 'papaparse'
import type { Produto } from '@/types'

const CSV_EXEMPLO = `nome,nomeFabrica,custo,preco,cor,tamanho,quantidade
Top Liso,Top Básico C023,25.00,59.90,Preto,P,10
Top Liso,Top Básico C023,25.00,59.90,Preto,M,8
Top Liso,Top Básico C023,25.00,59.90,Branco,M,5
Legging Canelada,Legging C045,40.00,89.90,Rosa,G,12
Legging Canelada,Legging C045,40.00,89.90,Cinza,GG,6
`

export function gerarCSVExemplo(): void {
  const blob = new Blob([CSV_EXEMPLO], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo-produtos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

interface CSVRow {
  nome: string
  nomeFabrica: string
  custo: string
  preco: string
  cor: string
  tamanho: string
  quantidade: string
}

export interface ParseResult {
  produtos: Omit<Produto, 'id'>[]
  erros: string[]
}

export function parseProdutosCSV(csvText: string): ParseResult {
  const { data, errors } = Papa.parse<CSVRow>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  })

  const erros: string[] = errors.map(e => `Linha ${(e.row ?? 0) + 2}: ${e.message}`)
  const map = new Map<string, Omit<Produto, 'id'>>()

  data.forEach((row, idx) => {
    const linha = idx + 2

    const nome = row.nome?.trim()
    const nomeFabrica = row.nomeFabrica?.trim()
    const cor = row.cor?.trim()
    const tamanho = row.tamanho?.trim()
    const custo = parseFloat(row.custo)
    const preco = parseFloat(row.preco)
    const quantidade = parseInt(row.quantidade, 10)

    if (!nome || !nomeFabrica) {
      erros.push(`Linha ${linha}: "nome" e "nomeFabrica" são obrigatórios.`)
      return
    }
    if (!cor || !tamanho) {
      erros.push(`Linha ${linha}: "cor" e "tamanho" são obrigatórios.`)
      return
    }
    if (isNaN(custo) || custo < 0) {
      erros.push(`Linha ${linha}: "custo" inválido ("${row.custo}").`)
      return
    }
    if (isNaN(preco) || preco < 0) {
      erros.push(`Linha ${linha}: "preco" inválido ("${row.preco}").`)
      return
    }
    if (isNaN(quantidade) || quantidade < 0) {
      erros.push(`Linha ${linha}: "quantidade" inválida ("${row.quantidade}").`)
      return
    }

    if (!map.has(nomeFabrica)) {
      map.set(nomeFabrica, { nome, nomeFabrica, custo, preco, variacoes: [] })
    }

    const produto = map.get(nomeFabrica)!
    produto.variacoes.push({ id: crypto.randomUUID(), cor, tamanho, quantidade })
  })

  return { produtos: Array.from(map.values()), erros }
}
