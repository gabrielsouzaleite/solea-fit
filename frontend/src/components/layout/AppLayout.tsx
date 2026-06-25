import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import logo from '@/assets/logo-solea.jpeg'

export function AppLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex`}
      >
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center h-14 border-b px-4 bg-background lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>
          <img src={logo} alt="Soleá Fit" className="ml-3 h-8 object-contain" />
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
