import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Boxes, Calculator, Layers, Settings } from 'lucide-react'
import { api } from '../lib/api'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/modelos', label: 'Modelos', icon: Boxes, end: false },
  { to: '/calculadora', label: 'Calculadora', icon: Calculator, end: false },
  { to: '/configuracion', label: 'Configuración', icon: Settings, end: false }
]

export default function Sidebar() {
  const [version, setVersion] = useState('')
  useEffect(() => {
    api.getAppVersion().then(setVersion).catch(() => {})
  }, [])
  return (
    <aside className="w-60 shrink-0 bg-navy border-r border-lavanda/10 flex flex-col">
      <div className="p-5 border-b border-lavanda/10">
        <div className="flex items-center gap-2">
          <Layers className="w-6 h-6 text-ambar" />
          <span className="font-display text-lg font-bold text-niebla tracking-wide">Bodega 3D</span>
        </div>
        <p className="text-[11px] text-lavanda/40 mt-1 pl-8">Sendero 3D</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-purpura/20 text-ambar font-medium'
                  : 'text-lavanda-light hover:bg-lavanda/5 hover:text-niebla'
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-lavanda/10">
        <p className="text-[10px] text-lavanda/30">{version ? `v${version}` : ''} · datos locales</p>
      </div>
    </aside>
  )
}
