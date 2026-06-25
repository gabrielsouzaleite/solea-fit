import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Upload, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getProdutos, createProduto, updateProduto, deleteProduto, uploadFoto } from '@/lib/api'
import { parseProdutosCSV, gerarCSVExemplo, type ParseResult } from '@/lib/csvImport'
import type { Produto, Variacao } from '@/types'

const PAGE_SIZE = 10

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function newVariacao(): Variacao {
  return { id: crypto.randomUUID(), cor: '', tamanho: '', quantidade: 0 }
}

function newProduto(): Produto {
  return { id: '', nomeFabrica: '', nome: '', custo: 0, preco: 0, variacoes: [newVariacao()] }
}

function parseDecimal(val: string): number {
  return parseFloat(val.replace(',', '.')) || 0
}

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Produto | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<'nome' | 'nomeFabrica' | 'estoque' | 'cor'>('nome')

  const [custoStr, setCustoStr] = useState('')
  const [precoStr, setPrecoStr] = useState('')

  const [openImport, setOpenImport] = useState(false)
  const [importPreview, setImportPreview] = useState<ParseResult | null>(null)
  const [importando, setImportando] = useState(false)
  const [importProgress, setImportProgress] = useState({ atual: 0, total: 0 })
  const [importDone, setImportDone] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)

  async function carregar() {
    setLoading(true)
    try {
      setProdutos(await getProdutos())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    if (editing) {
      setCustoStr(editing.custo === 0 ? '' : String(editing.custo).replace('.', ','))
      setPrecoStr(editing.preco === 0 ? '' : String(editing.preco).replace('.', ','))
    }
  }, [editing?.id])

  const termo = busca.toLowerCase().trim()
  const filtrados = produtos.filter(p => {
    if (!termo) return true
    return (
      p.nome.toLowerCase().includes(termo) ||
      p.nomeFabrica.toLowerCase().includes(termo) ||
      p.variacoes.some(v => v.cor.toLowerCase().includes(termo))
    )
  }).sort((a, b) => {
    switch (ordenacao) {
      case 'nomeFabrica':
        return a.nomeFabrica.localeCompare(b.nomeFabrica, 'pt-BR')
      case 'estoque': {
        const estoqueA = a.variacoes.reduce((s, v) => s + v.quantidade, 0)
        const estoqueB = b.variacoes.reduce((s, v) => s + v.quantidade, 0)
        return estoqueB - estoqueA
      }
      case 'cor':
        return (a.variacoes[0]?.cor ?? '').localeCompare(b.variacoes[0]?.cor ?? '', 'pt-BR')
      default:
        return a.nome.localeCompare(b.nome, 'pt-BR')
    }
  })

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))
  const paginated = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openNew() {
    setEditing(newProduto())
    setOpen(true)
  }

  function openEdit(p: Produto) {
    setEditing(JSON.parse(JSON.stringify(p)))
    setOpen(true)
  }

  async function deletar(id: string) {
    if (!confirm('Excluir este produto?')) return
    try {
      await deleteProduto(id)
      await carregar()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir produto.')
    }
  }

  async function salvar() {
    if (!editing) return
    setSalvando(true)
    try {
      const { id, ...body } = editing
      if (id) {
        await updateProduto(id, body)
      } else {
        await createProduto(body)
      }
      setOpen(false)
      await carregar()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar produto.')
    } finally {
      setSalvando(false)
    }
  }

  function updateField<K extends keyof Produto>(key: K, value: Produto[K]) {
    setEditing(prev => prev ? { ...prev, [key]: value } : prev)
  }

  function updateVariacao(idx: number, field: keyof Variacao, value: string | number) {
    setEditing(prev => {
      if (!prev) return prev
      const variacoes = prev.variacoes.map((v, i) =>
        i === idx ? { ...v, [field]: field === 'quantidade' ? Number(value) : value } : v
      )
      return { ...prev, variacoes }
    })
  }

  function addVariacao() {
    setEditing(prev => prev ? { ...prev, variacoes: [...prev.variacoes, newVariacao()] } : prev)
  }

  function removeVariacao(idx: number) {
    setEditing(prev => prev ? { ...prev, variacoes: prev.variacoes.filter((_, i) => i !== idx) } : prev)
  }

  function handleCSVChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setImportPreview(parseProdutosCSV(text))
      setImportDone(false)
    }
    reader.readAsText(file, 'utf-8')
  }

  async function executarImportacao() {
    if (!importPreview || importPreview.produtos.length === 0) return
    setImportando(true)
    setImportProgress({ atual: 0, total: importPreview.produtos.length })
    try {
      for (let i = 0; i < importPreview.produtos.length; i++) {
        await createProduto(importPreview.produtos[i])
        setImportProgress({ atual: i + 1, total: importPreview.produtos.length })
      }
      setImportDone(true)
      await carregar()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao importar produtos.')
    } finally {
      setImportando(false)
    }
  }

  function fecharImport() {
    setOpenImport(false)
    setImportPreview(null)
    setImportDone(false)
    setImportProgress({ atual: 0, total: 0 })
    if (csvInputRef.current) csvInputRef.current.value = ''
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFoto(true)
    try {
      const url = await uploadFoto(file)
      updateField('foto', url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar foto.')
    } finally {
      setUploadingFoto(false)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground text-sm">
            {loading ? 'Carregando...' : termo
              ? `${filtrados.length} de ${produtos.length} produtos`
              : `${produtos.length} produtos cadastrados`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setOpenImport(true); setImportPreview(null); setImportDone(false) }}>
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Buscar por nome, fábrica ou cor..."
          value={busca}
          onChange={e => { setBusca(e.target.value); setPage(1) }}
          className="sm:max-w-sm"
        />
        <Select value={ordenacao} onValueChange={v => { setOrdenacao(v as typeof ordenacao); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nome">Nome</SelectItem>
            <SelectItem value="nomeFabrica">Nome de fábrica</SelectItem>
            <SelectItem value="estoque">Estoque</SelectItem>
            <SelectItem value="cor">Cor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Nome de fábrica</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Estoque por variação</TableHead>
              <TableHead className="w-24" />
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
                {paginated.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {p.foto && (
                          <img
                            src={`${import.meta.env.VITE_API_URL}${p.foto}`}
                            alt={p.nome}
                            className="h-10 w-10 object-cover rounded-md flex-shrink-0"
                          />
                        )}
                        {p.nome}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.nomeFabrica}</TableCell>
                    <TableCell>{formatBRL(p.custo)}</TableCell>
                    <TableCell>{formatBRL(p.preco)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.variacoes.map(v => (
                          <Badge key={v.id} variant="outline" className="text-xs">
                            {v.cor} {v.tamanho} · {v.quantidade}un
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deletar(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum produto cadastrado.
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
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Próximo
          </Button>
        </div>
      )}

      <Dialog open={openImport} onOpenChange={v => { if (!v) fecharImport() }}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar produtos via CSV</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border p-4 space-y-2 bg-muted/40">
              <p className="text-sm font-medium">1. Baixe o modelo de CSV</p>
              <p className="text-xs text-muted-foreground">Preencha com seus produtos e salve o arquivo.</p>
              <Button variant="outline" size="sm" onClick={gerarCSVExemplo}>
                <Download className="h-4 w-4" />
                Baixar CSV de exemplo
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>2. Selecione o CSV preenchido</Label>
              <Input ref={csvInputRef} type="file" accept=".csv" onChange={handleCSVChange} className="cursor-pointer" />
            </div>

            {importPreview && !importDone && (
              <div className="space-y-3">
                {importPreview.produtos.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">{importPreview.produtos.length} produto(s) encontrado(s)</p>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Nome de fábrica</TableHead>
                            <TableHead>Custo</TableHead>
                            <TableHead>Preço</TableHead>
                            <TableHead>Variações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.produtos.map((p, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{p.nome}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{p.nomeFabrica}</TableCell>
                              <TableCell>{formatBRL(p.custo)}</TableCell>
                              <TableCell>{formatBRL(p.preco)}</TableCell>
                              <TableCell>{p.variacoes.length}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                {importPreview.erros.length > 0 && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                    <p className="text-sm font-medium text-destructive">Erros encontrados (linhas ignoradas):</p>
                    {importPreview.erros.map((e, i) => (
                      <p key={i} className="text-xs text-destructive">{e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {importando && (
              <p className="text-sm text-muted-foreground">
                Importando {importProgress.atual} de {importProgress.total}...
              </p>
            )}

            {importDone && (
              <p className="text-sm text-green-600 font-medium">
                {importProgress.total} produto(s) importado(s) com sucesso!
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={fecharImport} disabled={importando}>Fechar</Button>
            {importPreview && importPreview.produtos.length > 0 && !importDone && (
              <Button onClick={executarImportacao} disabled={importando}>
                {importando ? `Importando...` : `Importar ${importPreview.produtos.length} produto(s)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome do produto</Label>
                  <Input value={editing.nome} onChange={e => updateField('nome', e.target.value)} placeholder="Ex: Top Liso" />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome de fábrica</Label>
                  <Input value={editing.nomeFabrica} onChange={e => updateField('nomeFabrica', e.target.value)} placeholder="Ex: Top Básico C023" />
                </div>
                <div className="space-y-1.5">
                  <Label>Custo (R$)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={custoStr}
                    onChange={e => setCustoStr(e.target.value)}
                    onBlur={() => updateField('custo', parseDecimal(custoStr))}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Preço de venda (R$)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={precoStr}
                    onChange={e => setPrecoStr(e.target.value)}
                    onBlur={() => updateField('preco', parseDecimal(precoStr))}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Foto do produto</Label>
                {editing.foto && (
                  <div className="mb-2">
                    <img
                      src={`${import.meta.env.VITE_API_URL}${editing.foto}`}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded-md border"
                    />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploadingFoto}
                  onChange={handleFotoChange}
                  className="cursor-pointer"
                />
                {uploadingFoto && <p className="text-sm text-muted-foreground">Enviando foto...</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Variações (cor + tamanho)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addVariacao}>
                    <Plus className="h-3 w-3" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {editing.variacoes.map((v, idx) => (
                    <div key={v.id} className="grid grid-cols-[1fr_1fr_80px_36px] gap-2 items-end">
                      <div className="space-y-1">
                        {idx === 0 && <Label className="text-xs text-muted-foreground">Cor</Label>}
                        <Input value={v.cor} onChange={e => updateVariacao(idx, 'cor', e.target.value)} placeholder="Preto" />
                      </div>
                      <div className="space-y-1">
                        {idx === 0 && <Label className="text-xs text-muted-foreground">Tamanho</Label>}
                        <Input value={v.tamanho} onChange={e => updateVariacao(idx, 'tamanho', e.target.value)} placeholder="M" />
                      </div>
                      <div className="space-y-1">
                        {idx === 0 && <Label className="text-xs text-muted-foreground">Qtd</Label>}
                        <Input type="number" min={0} value={v.quantidade} onChange={e => updateVariacao(idx, 'quantidade', e.target.value)} />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="self-end"
                        onClick={() => removeVariacao(idx)}
                        disabled={editing.variacoes.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={salvando}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
