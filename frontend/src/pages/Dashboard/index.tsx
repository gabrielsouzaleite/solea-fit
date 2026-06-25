import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, DollarSign, ShoppingBag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboard } from '@/lib/api'
import type { DashboardData } from '@/types'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const emptyData: DashboardData = {
  totalVendido: 0,
  totalCusto: 0,
  lucro: 0,
  porMes: [],
  porPagamento: [],
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData>(emptyData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const { totalVendido, totalCusto, lucro, porMes, porPagamento } = data

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {loading && <p className="text-muted-foreground text-sm">Carregando...</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Vendido"
          value={formatBRL(totalVendido)}
          icon={<ShoppingBag className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title="Total de Custo"
          value={formatBRL(totalCusto)}
          icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title="Lucro"
          value={formatBRL(lucro)}
          icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
          highlight
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas e Lucro por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {porMes.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda registrada.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={porMes}>
                  <defs>
                    <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${v}`} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="vendas" name="Vendas" stroke="#0ea5e9" fill="url(#gVendas)" strokeWidth={2} />
                  <Area type="monotone" dataKey="lucro" name="Lucro" stroke="#10b981" fill="url(#gLucro)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas por Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            {porPagamento.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda registrada.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={porPagamento}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="forma" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${v}`} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="total" name="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  highlight,
}: {
  title: string
  value: string
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? 'border-green-200 bg-green-50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${highlight ? 'text-green-700' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
