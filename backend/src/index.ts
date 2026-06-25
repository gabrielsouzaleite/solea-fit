import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import 'dotenv/config'

import produtosRouter from './routes/produtos'
import clientesRouter from './routes/clientes'
import vendasRouter from './routes/vendas'
import dashboardRouter from './routes/dashboard'
import uploadRouter from './routes/upload'

const app = express()

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use('/produtos', produtosRouter)
app.use('/clientes', clientesRouter)
app.use('/vendas', vendasRouter)
app.use('/dashboard', dashboardRouter)
app.use('/upload', uploadRouter)

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.message)
  res.status(500).json({ error: err.message })
})

const PORT = process.env.PORT ?? 3333
app.listen(PORT, () => {
  console.log(`API Soleá rodando em http://localhost:${PORT}`)
})
