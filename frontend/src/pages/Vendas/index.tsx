import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { getVendas, createVenda, updateVendaStatus, getProdutos, getClientes } from '@/lib/api'
import type { VendaAPI, Produto, Cliente, FormaPagamento } from '@/types'

const PAGE_SIZE = 10

const FORMA_LABEL: Record<FormaPagamento, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao_debito: 'Débito',
  cartao_credito: 'Crédito',
  brinde: 'Brinde',
  closet_da_dona: 'Closet da Dona',
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

type ItemRascunho = { produtoId: string; variacaoId: string; quantidade: number }

export function Vendas() {
  const [vendas, setVendas] = useState<VendaAPI[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Filtros
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroForma, setFiltroForma] = useState('todos')
  const [filtroDataDe, setFiltroDataDe] = useState('')
  const [filtroDataAte, setFiltroDataAte] = useState('')

  // Dados para o modal
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  // Modal nova venda
  const [open, setOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [step, setStep] = useState<'itens' | 'pagamento' | 'confirmar'>('itens')
  const [itens, setItens] = useState<ItemRascunho[]>([])
  const [clienteId, setClienteId] = useState('')
  const [forma, setForma] = useState<FormaPagamento>('pix')
  const [statusVenda, setStatusVenda] = useState<'pago' | 'pendente'>('pago')
  const [busca, setBusca] = useState('')
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
      }
      if (filtroForma !== 'todos') params.formaPagamento = filtroForma
      if (filtroDataDe) params.dataInicio = filtroDataDe
      if (filtroDataAte) params.dataFim = filtroDataAte

      const res = await getVendas(params)

      // Filtro de cliente por nome é feito no cliente (API filtra por ID)
      const filtrado = filtroCliente
        ? res.data.filter(v => v.cliente.nome.toLowerCase().includes(filtroCliente.toLowerCase()))
        : res.data

      setVendas(filtrado)
      setTotal(filtroCliente ? filtrado.length : res.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, filtroForma, filtroDataDe, filtroDataAte, filtroCliente])

  useEffect(() => { carregar() }, [carregar])

  // Carrega produtos e clientes apenas quando o modal for aberto
  async function abrirModal() {
    setItens([])
    setClienteId('')
    setForma('pix')
    setStatusVenda('pago')
    setBusca('')
    setProdutoSelecionado(null)
    setStep('itens')
    setOpen(true)
    try {
      const [prods, clis] = await Promise.all([getProdutos(), getClientes()])
      setProdutos(prods)
      setClientes(clis.filter(c => c.status === 'ativo'))
    } catch (e) {
      console.error(e)
    }
  }

  function addItem(produtoId: string, variacaoId: string) {
    setItens(prev => {
      const existe = prev.find(i => i.produtoId === produtoId && i.variacaoId === variacaoId)
      if (existe) return prev.map(i => i.produtoId === produtoId && i.variacaoId === variacaoId ? { ...i, quantidade: i.quantidade + 1 } : i)
      return [...prev, { produtoId, variacaoId, quantidade: 1 }]
    })
  }

  function updateQtd(produtoId: string, variacaoId: string, delta: number) {
    setItens(prev =>
      prev.flatMap(i => {
        if (i.produtoId !== produtoId || i.variacaoId !== variacaoId) return [i]
        const novaQtd = i.quantidade + delta
        return novaQtd <= 0 ? [] : [{ ...i, quantidade: novaQtd }]
      })
    )
  }

  async function confirmarVenda() {
    setSalvando(true)
    try {
      await createVenda({
        clienteId,
        formaPagamento: forma,
        status: statusVenda,
        itens: itens.map(i => {
          const p = produtos.find(p => p.id === i.produtoId)!
          return {
            produtoId: i.produtoId,
            variacaoId: i.variacaoId,
            quantidade: i.quantidade,
            precoUnit: p.preco,
            custoUnit: p.custo,
          }
        }),
      })
      setOpen(false)
      setPage(1)
      await carregar()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao registrar venda.')
    } finally {
      setSalvando(false)
    }
  }

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.nomeFabrica.toLowerCase().includes(busca.toLowerCase())
  )

  const totalRascunho = itens.reduce((s, i) => {
    const p = produtos.find(p => p.id === i.produtoId)
    return s + (p?.preco ?? 0) * i.quantidade
  }, 0)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="p-4 md:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendas</h1>
          <p className="text-muted-foreground text-sm">
            {loading ? 'Carregando...' : `${total} vendas registradas`}
          </p>
        </div>
        <Button onClick={abrirModal}>
          <Plus className="h-4 w-4" />
          Nova venda
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Cliente</Label>
          <Input
            className="h-8 w-full sm:w-44 text-sm"
            placeholder="Buscar cliente..."
            value={filtroCliente}
            onChange={e => { setFiltroCliente(e.target.value); setPage(1) }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Pagamento</Label>
          <Select value={filtroForma} onValueChange={v => { setFiltroForma(v); setPage(1) }}>
            <SelectTrigger className="h-8 w-full sm:w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pix">Pix</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
              <SelectItem value="cartao_debito">Débito</SelectItem>
              <SelectItem value="cartao_credito">Crédito</SelectItem>
              <SelectItem value="brinde">Brinde</SelectItem>
              <SelectItem value="closet_da_dona">Closet da Dona</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" className="h-8 text-sm" value={filtroDataDe} onChange={e => { setFiltroDataDe(e.target.value); setPage(1) }} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" className="h-8 text-sm" value={filtroDataAte} onChange={e => { setFiltroDataAte(e.target.value); setPage(1) }} />
        </div>
        {(filtroCliente || filtroForma !== 'todos' || filtroDataDe || filtroDataAte) && (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => {
            setFiltroCliente(''); setFiltroForma('todos'); setFiltroDataDe(''); setFiltroDataAte(''); setPage(1)
          }}>
            Limpar
          </Button>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produtos</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <>
                {vendas.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm">{formatDate(v.data)}</TableCell>
                    <TableCell className="font-medium">{v.cliente.nome}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {v.itens.map((item, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {item.produto.nome} {item.variacao.cor} {item.variacao.tamanho} ×{item.quantidade}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{FORMA_LABEL[v.formaPagamento]}</Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={async () => {
                          const novoStatus = v.status === 'pago' ? 'pendente' : 'pago'
                          try {
                            await updateVendaStatus(v.id, novoStatus)
                            await carregar()
                          } catch (e) {
                            alert(e instanceof Error ? e.message : 'Erro ao atualizar status.')
                          }
                        }}
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium cursor-pointer transition-colors ${v.status === 'pago' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200'}`}
                      >
                        {v.status === 'pago' ? 'Pago' : 'Pendente'}
                      </button>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatBRL(v.valorTotal)}</TableCell>
                  </TableRow>
                ))}
                {vendas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma venda encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próximo</Button>
        </div>
      )}

      {/* Modal Nova Venda */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova venda</DialogTitle>
            <div className="flex gap-2 pt-2">
              {(['itens', 'pagamento', 'confirmar'] as const).map((s, idx) => (
                <div key={s} className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {idx + 1}. {s === 'itens' ? 'Produtos' : s === 'pagamento' ? 'Pagamento' : 'Confirmar'}
                  </span>
                  {idx < 2 && <span className="text-muted-foreground">›</span>}
                </div>
              ))}
            </div>
          </DialogHeader>

          {step === 'itens' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar produto</Label>
                <Input
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setProdutoSelecionado(null) }}
                  placeholder="Nome do produto..."
                />
                {busca && !produtoSelecionado && (
                  <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                    {produtosFiltrados.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onClick={() => { setProdutoSelecionado(p); setBusca(p.nome) }}
                      >
                        <span className="font-medium">{p.nome}</span>
                        <span className="text-muted-foreground ml-2">({p.nomeFabrica})</span>
                        <span className="float-right">{formatBRL(p.preco)}</span>
                      </button>
                    ))}
                    {produtosFiltrados.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum produto encontrado.</p>
                    )}
                  </div>
                )}
              </div>

              {produtoSelecionado && (
                <div className="space-y-2">
                  <Label>Variações de <strong>{produtoSelecionado.nome}</strong></Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {produtoSelecionado.variacoes.map(v => {
                      const itemAtual = itens.find(i => i.produtoId === produtoSelecionado.id && i.variacaoId === v.id)
                      return (
                        <div key={v.id} className="flex items-center justify-between border rounded-md p-2">
                          <div className="text-sm">
                            <span className="font-medium">{v.cor} {v.tamanho}</span>
                            <span className="text-muted-foreground ml-2">({v.quantidade} em estoque)</span>
                          </div>
                          {itemAtual ? (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQtd(produtoSelecionado.id, v.id, -1)}>
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                              <span className="text-sm w-4 text-center">{itemAtual.quantidade}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={itemAtual.quantidade >= v.quantidade} onClick={() => updateQtd(produtoSelecionado.id, v.id, 1)}>
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={v.quantidade === 0} onClick={() => addItem(produtoSelecionado.id, v.id)}>
                              {v.quantidade === 0 ? 'Sem estoque' : 'Adicionar'}
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {itens.length > 0 && (
                <div className="space-y-2">
                  <Label>Itens da venda</Label>
                  <div className="border rounded-md divide-y">
                    {itens.map((item, idx) => {
                      const p = produtos.find(p => p.id === item.produtoId)
                      const v = p?.variacoes.find(v => v.id === item.variacaoId)
                      return (
                        <div key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span>{p?.nome} — {v?.cor} {v?.tamanho} ×{item.quantidade}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatBRL((p?.preco ?? 0) * item.quantidade)}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setItens(prev => prev.filter((_, i) => i !== idx))}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                    <div className="flex justify-between px-3 py-2 font-semibold text-sm bg-muted/30">
                      <span>Total</span>
                      <span>{formatBRL(totalRascunho)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'pagamento' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Select value={forma} onValueChange={v => setForma(v as FormaPagamento)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="brinde">Brinde</SelectItem>
                    <SelectItem value="closet_da_dona">Closet da Dona</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status do pagamento</Label>
                <Select value={statusVenda} onValueChange={v => setStatusVenda(v as 'pago' | 'pendente')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 'confirmar' && (
            <div className="space-y-4">
              <div className="border rounded-md p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium">{clientes.find(c => c.id === clienteId)?.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pagamento</span>
                  <span className="font-medium">{FORMA_LABEL[forma]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className={statusVenda === 'pago' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'} variant="outline">
                    {statusVenda === 'pago' ? 'Pago' : 'Pendente'}
                  </Badge>
                </div>
                <div className="border-t pt-2 space-y-1">
                  {itens.map((item, idx) => {
                    const p = produtos.find(p => p.id === item.produtoId)
                    const v = p?.variacoes.find(v => v.id === item.variacaoId)
                    return (
                      <div key={idx} className="flex justify-between">
                        <span>{p?.nome} {v?.cor} {v?.tamanho} ×{item.quantidade}</span>
                        <span>{formatBRL((p?.preco ?? 0) * item.quantidade)}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total</span>
                  <span>{formatBRL(totalRascunho)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {step !== 'itens' && (
              <Button variant="outline" onClick={() => setStep(s => s === 'confirmar' ? 'pagamento' : 'itens')} disabled={salvando}>
                Voltar
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)} disabled={salvando}>Cancelar</Button>
            {step === 'itens' && (
              <Button disabled={itens.length === 0} onClick={() => setStep('pagamento')}>Próximo</Button>
            )}
            {step === 'pagamento' && (
              <Button disabled={!clienteId} onClick={() => setStep('confirmar')}>Revisar</Button>
            )}
            {step === 'confirmar' && (
              <Button onClick={confirmarVenda} disabled={salvando}>
                {salvando ? 'Registrando...' : 'Confirmar venda'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
