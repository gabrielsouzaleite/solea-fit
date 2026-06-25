import { Router, Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

const router = Router()

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const produtos = await prisma.produto.findMany({
      include: { variacoes: true },
      orderBy: { criadoEm: 'desc' },
    })
    res.json(produtos)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nomeFabrica, nome, foto, custo, preco, variacoes } = req.body
    const produto = await prisma.produto.create({
      data: {
        nomeFabrica,
        nome,
        foto,
        custo,
        preco,
        variacoes: {
          create: variacoes ?? [],
        },
      },
      include: { variacoes: true },
    })
    res.status(201).json(produto)
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string }
    const { nomeFabrica, nome, foto, custo, preco, variacoes } = req.body

    await prisma.variacao.deleteMany({ where: { produtoId: id } })

    const produto = await prisma.produto.update({
      where: { id },
      data: {
        nomeFabrica,
        nome,
        foto,
        custo,
        preco,
        variacoes: {
          create: variacoes ?? [],
        },
      },
      include: { variacoes: true },
    })
    res.json(produto)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string }
    await prisma.produto.delete({ where: { id } })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
