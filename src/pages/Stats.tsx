import { useState, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  Send,
  Clock,
  AlertTriangle,
  TrendingUp,
  CalendarDays,
  Layers,
  Users,
  User,
} from 'lucide-react';
import { getPosts, type Post } from '@/api/storage';

export default function Stats() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    setPosts(getPosts());
  }, []);

  const total = posts.length;
  const published = posts.filter(p => p.status === 'published').length;
  const scheduled = posts.filter(p => p.status === 'scheduled').length;
  const drafts = posts.filter(p => p.status === 'draft').length;
  const errors = posts.filter(p => p.status === 'error').length;
  const wallPosts = posts.filter(p => p.target === 'wall').length;
  const groupPosts = posts.filter(p => p.target === 'group').length;
  const withImages = posts.filter(p => p.imageCount && p.imageCount > 0).length;

  const statCards = [
    { label: 'Всего постов', value: total, icon: FileText, color: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20' },
    { label: 'Опубликовано', value: published, icon: Send, color: 'from-emerald-500 to-green-500', shadow: 'shadow-emerald-500/20' },
    { label: 'Запланировано', value: scheduled, icon: Clock, color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
    { label: 'Ошибки', value: errors, icon: AlertTriangle, color: 'from-red-500 to-pink-500', shadow: 'shadow-red-500/20' },
  ];

  // Activity by day of week
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const dayStats = dayNames.map((name, i) => {
    const dayNum = i === 6 ? 0 : i + 1; // JS: 0=Sun
    const count = posts.filter(p => new Date(p.createdAt).getDay() === dayNum).length;
    return { name, count };
  });
  const maxDay = Math.max(...dayStats.map(d => d.count), 1);

  // Activity by month (last 6 months)
  const monthStats: { name: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const m = d.getMonth();
    const y = d.getFullYear();
    const count = posts.filter(p => {
      const pd = new Date(p.createdAt);
      return pd.getMonth() === m && pd.getFullYear() === y;
    }).length;
    monthStats.push({
      name: d.toLocaleDateString('ru-RU', { month: 'short' }),
      count,
    });
  }
  const maxMonth = Math.max(...monthStats.map(m => m.count), 1);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-white/20" />
          Статистика
        </h1>
        <p className="text-white/40 mt-1">Обзор вашей активности</p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className="glass rounded-2xl p-4 md:p-5 animate-slide-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 shadow-lg ${card.shadow}`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl md:text-3xl font-bold">{card.value}</p>
            <p className="text-xs text-white/40 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity by day */}
        <div className="glass rounded-2xl p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 mb-5">
            <CalendarDays className="w-4 h-4 text-white/30" />
            <h3 className="text-sm font-semibold">Активность по дням</h3>
          </div>
          <div className="flex items-end gap-2 h-32">
            {dayStats.map(day => (
              <div key={day.name} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                  <div
                    className="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-[#0077FF]/40 to-[#0077FF] transition-all duration-500"
                    style={{ height: `${Math.max((day.count / maxDay) * 100, 4)}%` }}
                  />
                </div>
                <span className="text-[10px] text-white/30">{day.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity by month */}
        <div className="glass rounded-2xl p-5 animate-slide-up" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-white/30" />
            <h3 className="text-sm font-semibold">По месяцам</h3>
          </div>
          <div className="flex items-end gap-3 h-32">
            {monthStats.map(month => (
              <div key={month.name} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                  <div
                    className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-purple-500/40 to-purple-500 transition-all duration-500"
                    style={{ height: `${Math.max((month.count / maxMonth) * 100, 4)}%` }}
                  />
                </div>
                <span className="text-[10px] text-white/30">{month.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distribution */}
        <div className="glass rounded-2xl p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-2 mb-5">
            <Layers className="w-4 h-4 text-white/30" />
            <h3 className="text-sm font-semibold">Распределение</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Опубликовано', value: published, total, color: 'bg-emerald-500' },
              { label: 'Запланировано', value: scheduled, total, color: 'bg-amber-500' },
              { label: 'Черновики', value: drafts, total, color: 'bg-gray-500' },
              { label: 'Ошибки', value: errors, total, color: 'bg-red-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/40">{item.label}</span>
                  <span className="text-xs font-mono text-white/30">{item.value}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-700`}
                    style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="glass rounded-2xl p-5 animate-slide-up" style={{ animationDelay: '350ms' }}>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-white/30" />
            <h3 className="text-sm font-semibold">Метрики</h3>
          </div>
          <div className="space-y-3">
            {[
              { icon: User, label: 'На стену', value: wallPosts, suffix: 'постов' },
              { icon: Users, label: 'В группы', value: groupPosts, suffix: 'постов' },
              { icon: FileText, label: 'С фото', value: withImages, suffix: 'постов' },
              {
                icon: TrendingUp,
                label: 'Успешность',
                value: total > 0 ? Math.round((published / total) * 100) : 0,
                suffix: '%',
              },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-white/30" />
                </div>
                <span className="text-sm text-white/40 flex-1">{item.label}</span>
                <span className="text-sm font-semibold">
                  {item.value}
                  <span className="text-xs text-white/20 ml-1">{item.suffix}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
