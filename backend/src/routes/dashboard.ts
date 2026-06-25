import { Router, Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

const router = Router()

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

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
          variacoes: { select: { quantidade: true } },
        },
      }),
      prisma.venda.aggregate({
        where: { status: 'pendente' },
        _sum: { valorTotal: true },
      }),
    ])

    let totalVendido = 0
    const totalCusto = produtos.reduce((acc, p) => {
      const qtdTotal = p.variacoes.reduce((sum, v) => sum + v.quantidade, 0)
      return acc + Number(p.custo) * qtdTotal
    }, 0)
    const totalPendente = Number(aggrPendente._sum.valorTotal ?? 0)

    const mesMap: Record<string, { mes: string; vendas: number; custo: number; lucro: number }> = {}
    const pagMap: Record<string, number> = {}

    for (const item of itens) {
      const receita = Number(item.precoUnit) * item.quantidade
      const custo = Number(item.custoUnit) * item.quantidade

      totalVendido += receita

      const data = new Date(item.venda.data)
      const mesLabel = MESES[data.getMonth()]
      if (!mesMap[mesLabel]) {
        mesMap[mesLabel] = { mes: mesLabel, vendas: 0, custo: 0, lucro: 0 }
      }
      mesMap[mesLabel].vendas += receita
      mesMap[mesLabel].custo += custo
      mesMap[mesLabel].lucro += receita - custo

      const fp = item.venda.formaPagamento
      pagMap[fp] = (pagMap[fp] ?? 0) + receita
    }

    res.json({
      totalVendido,
      totalCusto,
      lucro: totalVendido - totalCusto,
      totalPendente,
      porMes: Object.values(mesMap),
      porPagamento: Object.entries(pagMap).map(([forma, total]) => ({ forma, total })),
    })
  } catch (err) {
    next(err)
  }
})

export default router
