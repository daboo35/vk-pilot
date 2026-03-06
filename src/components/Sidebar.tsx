import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PenSquare,
  Clock,
  FileText,
  BarChart3,
  Settings,
  Rocket,
} from 'lucide-react';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Панель', end: true },
  { to: '/create', icon: PenSquare, label: 'Создать пост' },
  { to: '/scheduled', icon: Clock, label: 'Расписание' },
  { to: '/templates', icon: FileText, label: 'Шаблоны' },
  { to: '/stats', icon: BarChart3, label: 'Статистика' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 glass-strong z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0077FF] to-[#0055CC] flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold font-[Manrope] tracking-tight">VK Pilot</h1>
          <p className="text-[10px] text-white/30 uppercase tracking-widest">Автопостинг</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#0077FF]/15 text-[#3399FF] shadow-lg shadow-blue-500/5'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/5">
        <p className="text-[10px] text-white/20 text-center">VK Pilot v1.0</p>
      </div>
    </aside>
  );
}
