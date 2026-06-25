import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Vendas } from '@/pages/Vendas'
import { Clientes } from '@/pages/Clientes'
import { Produtos } from '@/pages/Produtos'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="vendas" element={<Vendas />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="produtos" element={<Produtos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
