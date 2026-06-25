import { Router, Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

const router = Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clienteId, formaPagamento, dataInicio, dataFim, page = '1', limit = '10' } = req.query

    const where: Record<string, unknown> = {}
    if (clienteId) where.clienteId = String(clienteId)
    if (formaPagamento) where.formaPagamento = String(formaPagamento)
    if (dataInicio || dataFim) {
      where.data = {
        ...(dataInicio ? { gte: new Date(String(dataInicio)) } : {}),
        ...(dataFim ? { lte: new Date(String(dataFim) + 'T23:59:59') } : {}),
      }
    }

    const pageNum = Math.max(1, parseInt(String(page)))
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))))

    const [total, vendas] = await prisma.$transaction([
      prisma.venda.count({ where }),
      prisma.venda.findMany({
        where,
        include: {
          cliente: true,
          itens: {
            include: {
              produto: true,
              variacao: true,
            },
          },
        },
        orderBy: { data: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ])

    res.json({ total, page: pageNum, limit: limitNum, data: vendas })
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clienteId, formaPagamento, itens } = req.body as {
      clienteId: string
      formaPagamento: string
      itens: { variacaoId: string; produtoId: string; quantidade: number; precoUnit: number; custoUnit: number }[]
    }

    if (!itens?.length) {
      res.status(400).json({ error: 'A venda deve ter pelo menos um item.' })
      return
    }

    const venda = await prisma.$transaction(async (tx) => {
      // Verificar estoque de cada variação
      for (const item of itens) {
        const variacao = await tx.variacao.findUnique({ where: { id: item.variacaoId } })
        if (!variacao) {
          throw new Error(`Variação ${item.variacaoId} não encontrada.`)
        }
        if (variacao.quantidade < item.quantidade) {
          throw new Error(
            `Estoque insuficiente para ${variacao.cor} ${variacao.tamanho}: disponível ${variacao.quantidade}, solicitado ${item.quantidade}.`
          )
        }
      }

      const valorTotal = itens.reduce((s, i) => s + i.precoUnit * i.quantidade, 0)

      const novaVenda = await tx.venda.create({
        data: {
          clienteId,
          formaPagamento,
          valorTotal,
          itens: {
            create: itens.map((i) => ({
              produtoId: i.produtoId,
              variacaoId: i.variacaoId,
              quantidade: i.quantidade,
              precoUnit: i.precoUnit,
              custoUnit: i.custoUnit,
            })),
          },
        },
        include: {
          cliente: true,
          itens: { include: { produto: true, variacao: true } },
        },
      })

      // Baixa de estoque
      for (const item of itens) {
        await tx.variacao.update({
          where: { id: item.variacaoId },
          data: { quantidade: { decrement: item.quantidade } },
        })
      }

      return novaVenda
    })

    res.status(201).json(venda)
  } catch (err) {
    if (err instanceof Error && err.message.includes('Estoque insuficiente')) {
      res.status(400).json({ error: err.message })
      return
    }
    next(err)
  }
})

export default router
