import { Router, Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

const router = Router()

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { nome: 'asc' },
    })
    res.json(clientes)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nome, sexo, contato, dataNascimento } = req.body
    const cliente = await prisma.cliente.create({
      data: { nome, sexo, contato, dataNascimento },
    })
    res.status(201).json(cliente)
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string }
    const { nome, sexo, contato, dataNascimento, status } = req.body
    const cliente = await prisma.cliente.update({
      where: { id },
      data: { nome, sexo, contato, dataNascimento, status },
    })
    res.json(cliente)
  } catch (err) {
    next(err)
  }
})

export default router
