import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PenSquare,
  Clock,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Панель', end: true },
  { to: '/create', icon: PenSquare, label: 'Пост' },
  { to: '/scheduled', icon: Clock, label: 'План' },
  { to: '/templates', icon: FileText, label: 'Шаблоны' },
  { to: '/stats', icon: BarChart3, label: 'Статы' },
  { to: '/settings', icon: Settings, label: 'Настр.' },
];

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 glass-strong z-40 safe-bottom">
      <div className="flex justify-around py-1.5 px-1">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#0077FF]' : 'text-white/30'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
