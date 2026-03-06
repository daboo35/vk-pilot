import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Send,
  Clock,
  FilePen,
  Sparkles,
  PenSquare,
  Trash2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { getPosts, deletePost, type Post } from '@/api/storage';
import { useToast } from '@/components/ToastProvider';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  scheduled: 'bg-amber-500/20 text-amber-400',
  published: 'bg-emerald-500/20 text-emerald-400',
  error: 'bg-red-500/20 text-red-400',
};

const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  scheduled: 'Запланирован',
  published: 'Опубликован',
  error: 'Ошибка',
};

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    setPosts(getPosts());
  }, []);

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    drafts: posts.filter(p => p.status === 'draft').length,
  };

  const statCards = [
    { label: 'Всего постов', value: stats.total, icon: FileText, color: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20' },
    { label: 'Опубликовано', value: stats.published, icon: Send, color: 'from-emerald-500 to-green-500', shadow: 'shadow-emerald-500/20' },
    { label: 'Запланировано', value: stats.scheduled, icon: Clock, color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
    { label: 'Черновики', value: stats.drafts, icon: FilePen, color: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-500/20' },
  ];

  const handleDelete = (id: string) => {
    deletePost(id);
    setPosts(getPosts());
    addToast('Пост удалён', 'success');
  };

  const recent = posts.slice(0, 10);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold">
          Панель управления
        </h1>
        <p className="text-white/40 mt-1">Управляйте публикациями ВКонтакте</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={`glass rounded-2xl p-4 md:p-5 animate-slide-up group hover:scale-[1.02] transition-transform`}
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

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <button
          onClick={() => navigate('/create')}
          className="glass rounded-2xl p-5 flex items-center gap-4 hover:bg-white/[0.06] transition-all group text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0077FF] to-[#0055CC] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <PenSquare className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Создать пост</p>
            <p className="text-xs text-white/40">Новая публикация</p>
          </div>
          <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
        </button>

        <button
          onClick={() => navigate('/create', { state: { aiMode: true } })}
          className="glass rounded-2xl p-5 flex items-center gap-4 hover:bg-white/[0.06] transition-all group text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">AI генерация</p>
            <p className="text-xs text-white/40">Создать с помощью AI</p>
          </div>
          <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
        </button>
      </div>

      {/* Recent posts */}
      <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-white/40" />
            <h2 className="text-lg font-semibold">Последние посты</h2>
          </div>
          {posts.length > 10 && (
            <button
              onClick={() => navigate('/scheduled')}
              className="text-xs text-[#0077FF] hover:underline"
            >
              Все посты →
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <FileText className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">Постов пока нет</p>
            <button
              onClick={() => navigate('/create')}
              className="mt-4 px-4 py-2 rounded-xl bg-[#0077FF]/20 text-[#0077FF] text-sm font-medium hover:bg-[#0077FF]/30 transition-colors"
            >
              Создать первый пост
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(post => (
              <div
                key={post.id}
                className="glass rounded-xl p-4 flex items-start gap-3 hover:bg-white/[0.04] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 line-clamp-2">{post.text || '(пустой пост)'}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[post.status]}`}>
                      {statusLabels[post.status]}
                    </span>
                    <span className="text-[10px] text-white/20">
                      {new Date(post.createdAt).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {post.target === 'group' && (
                      <span className="text-[10px] text-white/20">
                        Группа #{post.groupId}
                      </span>
                    )}
                    {post.imageCount && post.imageCount > 0 && (
                      <span className="text-[10px] text-white/20">
                        📷 {post.imageCount}
                      </span>
                    )}
                  </div>
                  {post.error && (
                    <p className="text-xs text-red-400/70 mt-1">⚠ {post.error}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="p-2 rounded-lg text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
