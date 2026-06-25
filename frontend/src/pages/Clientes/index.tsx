import { useState, useEffect } from 'react'
import { Plus, Pencil, UserX, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getClientes, createCliente, updateCliente } from '@/lib/api'
import type { Cliente } from '@/types'

function formatarData(d?: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function novoCliente(): Omit<Cliente, 'id' | 'status'> {
  return { nome: '', sexo: 'F', contato: '', dataNascimento: '' }
}

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)

  async function carregar() {
    setLoading(true)
    try {
      setClientes(await getClientes())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function openNew() {
    setEditing({ id: '', ...novoCliente(), status: 'ativo' })
    setOpen(true)
  }

  function openEdit(c: Cliente) {
    setEditing({ ...c })
    setOpen(true)
  }

  async function salvar() {
    if (!editing) return
    setSalvando(true)
    try {
      const payload = { nome: editing.nome, sexo: editing.sexo, contato: editing.contato, dataNascimento: editing.dataNascimento || undefined }
      if (editing.id) {
        await updateCliente(editing.id, payload)
      } else {
        await createCliente(payload)
      }
      setOpen(false)
      await carregar()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar cliente.')
    } finally {
      setSalvando(false)
    }
  }

  async function toggleStatus(c: Cliente) {
    try {
      await updateCliente(c.id, { status: c.status === 'ativo' ? 'desativado' : 'ativo' })
      await carregar()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao atualizar status.')
    }
  }

  function update<K extends keyof Cliente>(key: K, value: Cliente[K]) {
    setEditing(prev => prev ? { ...prev, [key]: value } : prev)
  }

  const ativos = clientes.filter(c => c.status === 'ativo').length
  const desativados = clientes.filter(c => c.status === 'desativado').length

  return (
    <div className="p-4 md:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm">
            {loading ? 'Carregando...' : `${ativos} ativos · ${desativados} desativados`}
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Sexo</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Nascimento</TableHead>
              <TableHead>Status</TableHead>
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
                {clientes.map(c => (
                  <TableRow key={c.id} className={c.status === 'desativado' ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.sexo === 'M' ? 'Masculino' : c.sexo === 'F' ? 'Feminino' : 'Outro'}</TableCell>
                    <TableCell>{c.contato}</TableCell>
                    <TableCell className="text-sm">{formatarData(c.dataNascimento)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'ativo' ? 'success' : 'outline'}>
                        {c.status === 'ativo' ? 'Ativo' : 'Desativado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleStatus(c)}>
                          {c.status === 'ativo'
                            ? <UserX className="h-4 w-4 text-destructive" />
                            : <UserCheck className="h-4 w-4 text-green-600" />
                          }
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {clientes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum cliente cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome completo</Label>
                <Input value={editing.nome} onChange={e => update('nome', e.target.value)} placeholder="Ex: Ana Paula Silva" />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <Select value={editing.sexo} onValueChange={v => update('sexo', v as Cliente['sexo'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contato (WhatsApp)</Label>
                <Input value={editing.contato} onChange={e => update('contato', e.target.value)} placeholder="(11) 99999-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Data de nascimento</Label>
                <Input
                  type="date"
                  value={editing.dataNascimento ?? ''}
                  onChange={e => update('dataNascimento', e.target.value)}
                />
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
