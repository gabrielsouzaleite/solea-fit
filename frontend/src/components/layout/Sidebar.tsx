import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Users, Package, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import logo from '@/assets/logo-solea.jpeg'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/produtos', label: 'Produtos', icon: Package },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-background sticky top-0">
      <div className="flex items-center px-6 justify-between">
        <img src={logo} alt="Soleá Fit" className="object-contain" />
        {onClose && (
          <button onClick={onClose} className="lg:hidden" aria-label="Fechar menu">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
