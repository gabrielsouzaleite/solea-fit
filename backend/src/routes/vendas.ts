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
    const { clienteId, formaPagamento, status = 'pago', itens } = req.body as {
      clienteId: string
      formaPagamento: string
      status?: string
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
          status,
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

router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }
    if (!['pago', 'pendente'].includes(status)) {
      res.status(400).json({ error: 'Status inválido.' })
      return
    }
    const venda = await prisma.venda.update({ where: { id }, data: { status } })
    res.json(venda)
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string }
    const { clienteId, formaPagamento, status = 'pago', itens } = req.body as {
      clienteId: string
      formaPagamento: string
      status?: string
      itens: { variacaoId: string; produtoId: string; quantidade: number; precoUnit: number; custoUnit: number }[]
    }

    if (!itens?.length) {
      res.status(400).json({ error: 'A venda deve ter pelo menos um item.' })
      return
    }

    const vendaAtual = await prisma.venda.findUnique({
      where: { id },
      include: { itens: true, cliente: true },
    })
    if (!vendaAtual) {
      res.status(404).json({ error: 'Venda não encontrada.' })
      return
    }

    const dadosAntes = {
      clienteId: vendaAtual.clienteId,
      clienteNome: vendaAtual.cliente.nome,
      formaPagamento: vendaAtual.formaPagamento,
      status: vendaAtual.status,
      valorTotal: Number(vendaAtual.valorTotal),
      itens: vendaAtual.itens.map(i => ({
        produtoId: i.produtoId,
        variacaoId: i.variacaoId,
        quantidade: i.quantidade,
        precoUnit: Number(i.precoUnit),
        custoUnit: Number(i.custoUnit),
      })),
    }

    const vendaAtualizada = await prisma.$transaction(async (tx) => {
      // Reverte estoque dos itens antigos
      for (const item of vendaAtual.itens) {
        await tx.variacao.update({
          where: { id: item.variacaoId },
          data: { quantidade: { increment: item.quantidade } },
        })
      }

      // Valida estoque para os novos itens
      for (const item of itens) {
        const variacao = await tx.variacao.findUnique({ where: { id: item.variacaoId } })
        if (!variacao) throw new Error(`Variação ${item.variacaoId} não encontrada.`)
        if (variacao.quantidade < item.quantidade) {
          throw new Error(
            `Estoque insuficiente para ${variacao.cor} ${variacao.tamanho}: disponível ${variacao.quantidade}, solicitado ${item.quantidade}.`
          )
        }
      }

      const valorTotal = itens.reduce((s, i) => s + i.precoUnit * i.quantidade, 0)

      // Remove itens antigos e cria os novos
      await tx.itemVenda.deleteMany({ where: { vendaId: id } })

      const venda = await tx.venda.update({
        where: { id },
        data: {
          clienteId,
          formaPagamento,
          status,
          valorTotal,
          itens: {
            create: itens.map(i => ({
              produtoId: i.produtoId,
              variacaoId: i.variacaoId,
              quantidade: i.quantidade,
              precoUnit: i.precoUnit,
              custoUnit: i.custoUnit,
            })),
          },
        },
        include: { cliente: true, itens: { include: { produto: true, variacao: true } } },
      })

      // Deduz estoque dos novos itens
      for (const item of itens) {
        await tx.variacao.update({
          where: { id: item.variacaoId },
          data: { quantidade: { decrement: item.quantidade } },
        })
      }

      const dadosDepois = {
        clienteId,
        clienteNome: venda.cliente.nome,
        formaPagamento,
        status,
        valorTotal,
        itens: itens.map(i => ({
          produtoId: i.produtoId,
          variacaoId: i.variacaoId,
          quantidade: i.quantidade,
          precoUnit: i.precoUnit,
          custoUnit: i.custoUnit,
        })),
      }

      await tx.vendaAuditLog.create({
        data: { vendaId: id, acao: 'editado', dadosAntes, dadosDepois },
      })

      return venda
    })

    res.json(vendaAtualizada)
  } catch (err) {
    if (err instanceof Error && err.message.includes('Estoque insuficiente')) {
      res.status(400).json({ error: err.message })
      return
    }
    next(err)
  }
})

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string }
    const { observacao } = req.body as { observacao?: string }

    if (!observacao?.trim()) {
      res.status(400).json({ error: 'Observação é obrigatória para excluir uma venda.' })
      return
    }

    const venda = await prisma.venda.findUnique({
      where: { id },
      include: { itens: true, cliente: true },
    })
    if (!venda) {
      res.status(404).json({ error: 'Venda não encontrada.' })
      return
    }

    const dadosAntes = {
      clienteId: venda.clienteId,
      clienteNome: venda.cliente.nome,
      formaPagamento: venda.formaPagamento,
      status: venda.status,
      valorTotal: Number(venda.valorTotal),
      data: venda.data,
      itens: venda.itens.map(i => ({
        produtoId: i.produtoId,
        variacaoId: i.variacaoId,
        quantidade: i.quantidade,
        precoUnit: Number(i.precoUnit),
        custoUnit: Number(i.custoUnit),
      })),
    }

    await prisma.$transaction(async (tx) => {
      // Reverte estoque
      for (const item of venda.itens) {
        await tx.variacao.update({
          where: { id: item.variacaoId },
          data: { quantidade: { increment: item.quantidade } },
        })
      }

      await tx.vendaAuditLog.create({
        data: { vendaId: id, acao: 'deletado', dadosAntes, observacao: observacao.trim() },
      })

      await tx.itemVenda.deleteMany({ where: { vendaId: id } })
      await tx.venda.delete({ where: { id } })
    })

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.get('/:id/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string }
    const logs = await prisma.vendaAuditLog.findMany({
      where: { vendaId: id },
      orderBy: { criadoEm: 'desc' },
    })
    res.json(logs)
  } catch (err) {
    next(err)
  }
})

export default router
