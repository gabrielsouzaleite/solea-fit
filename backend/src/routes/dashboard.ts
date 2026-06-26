import { Router, Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

const router = Router()

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const FORMAS_SEM_RECEITA = ['brinde', 'closet_da_dona']

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [itens, produtos, aggrPendente] = await Promise.all([
      prisma.itemVenda.findMany({
        include: { venda: true },
        where: { venda: { status: 'pago' } },
      }),
      prisma.produto.findMany({
        select: {
          custo: true,
          criadoEm: true,
          variacoes: { select: { quantidade: true } },
          itensVenda: { select: { quantidade: true } },
        },
      }),
      prisma.venda.aggregate({
        where: { status: 'pendente' },
        _sum: { valorTotal: true },
      }),
    ])

    let totalVendido = 0
    let totalBrindes = 0
    const comprasMap: Record<string, number> = {}
    const totalCusto = produtos.reduce((acc, p) => {
      const qtdEstoque = p.variacoes.reduce((sum, v) => sum + v.quantidade, 0)
      const qtdVendida = p.itensVenda.reduce((sum, iv) => sum + iv.quantidade, 0)
      const custoOriginal = Number(p.custo) * (qtdEstoque + qtdVendida)
      const mesLabel = MESES[new Date(p.criadoEm).getMonth()]
      comprasMap[mesLabel] = (comprasMap[mesLabel] ?? 0) + custoOriginal
      return acc + custoOriginal
    }, 0)
    const totalPendente = Number(aggrPendente._sum.valorTotal ?? 0)

    const mesMap: Record<string, { mes: string; vendas: number; custo: number; lucro: number }> = {}
    const pagMap: Record<string, number> = {}

    for (const item of itens) {
      const fp = item.venda.formaPagamento
      const custo = Number(item.custoUnit) * item.quantidade

      if (FORMAS_SEM_RECEITA.includes(fp)) {
        totalBrindes += custo
        continue
      }

      const receita = Number(item.precoUnit) * item.quantidade

      totalVendido += receita

      const data = new Date(item.venda.data)
      const mesLabel = MESES[data.getMonth()]
      if (!mesMap[mesLabel]) {
        mesMap[mesLabel] = { mes: mesLabel, vendas: 0, custo: 0, lucro: 0 }
      }
      mesMap[mesLabel].vendas += receita
      mesMap[mesLabel].custo += custo
      mesMap[mesLabel].lucro += receita - custo

      pagMap[fp] = (pagMap[fp] ?? 0) + receita
    }

    const allMeses = new Set([...Object.keys(mesMap), ...Object.keys(comprasMap)])
    const porMes = Array.from(allMeses).map(mes => ({
      mes,
      vendas: mesMap[mes]?.vendas ?? 0,
      custo: mesMap[mes]?.custo ?? 0,
      lucro: mesMap[mes]?.lucro ?? 0,
      compras: comprasMap[mes] ?? 0,
    }))

    res.json({
      totalVendido,
      totalCusto,
      lucro: totalVendido - totalCusto,
      totalPendente,
      totalBrindes,
      porMes,
      porPagamento: Object.entries(pagMap).map(([forma, total]) => ({ forma, total })),
    })
  } catch (err) {
    next(err)
  }
})

export default router
