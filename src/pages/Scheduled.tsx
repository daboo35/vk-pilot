import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Trash2, XCircle, PenSquare, Send, AlertCircle, Filter } from 'lucide-react';
import { getPosts, updatePost, deletePost, type Post } from '@/api/storage';
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

type FilterType = 'all' | 'scheduled' | 'draft' | 'published' | 'error';

export default function Scheduled() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    setPosts(getPosts());
  }, []);

  const filtered = posts
    .filter(p => filter === 'all' || p.status === filter)
    .sort((a, b) => {
      // Scheduled first by date, then by creation date
      if (a.scheduledAt && b.scheduledAt) return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      if (a.scheduledAt) return -1;
      if (b.scheduledAt) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleCancel = (id: string) => {
    updatePost(id, { status: 'draft', scheduledAt: undefined });
    setPosts(getPosts());
    addToast('Публикация отменена', 'info');
  };

  const handleDelete = (id: string) => {
    deletePost(id);
    setPosts(getPosts());
    addToast('Пост удалён', 'success');
  };

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'Все', count: posts.length },
    { key: 'scheduled', label: 'Запланированные', count: posts.filter(p => p.status === 'scheduled').length },
    { key: 'draft', label: 'Черновики', count: posts.filter(p => p.status === 'draft').length },
    { key: 'published', label: 'Опубликованные', count: posts.filter(p => p.status === 'published').length },
    { key: 'error', label: 'Ошибки', count: posts.filter(p => p.status === 'error').length },
  ];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Расписание</h1>
          <p className="text-white/40 mt-1">Все ваши посты</p>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="px-4 py-2 rounded-xl bg-[#0077FF]/15 text-[#0077FF] text-sm font-medium hover:bg-[#0077FF]/25 transition-colors flex items-center gap-2"
        >
          <PenSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Новый пост</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <Filter className="w-4 h-4 text-white/20 shrink-0 mt-2" />
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filter === f.key
                ? 'bg-white/10 text-white'
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className="ml-1.5 text-[10px] opacity-50">{f.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Posts list */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center animate-slide-up">
          <Clock className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">
            {filter === 'all' ? 'Постов пока нет' : 'Нет постов с таким статусом'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((post, i) => (
            <div
              key={post.id}
              className="glass rounded-xl p-4 animate-slide-up hover:bg-white/[0.04] transition-colors"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 line-clamp-2">{post.text || '(пустой пост)'}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[post.status]}`}>
                      {statusLabels[post.status]}
                    </span>
                    <span className="text-[10px] text-white/20">
                      {new Date(post.createdAt).toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    {post.scheduledAt && (
                      <span className="text-[10px] text-amber-400/50 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(post.scheduledAt).toLocaleDateString('ru-RU', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    )}
                    {post.target === 'group' && (
                      <span className="text-[10px] text-white/20">Группа #{post.groupId}</span>
                    )}
                    {post.imageCount && post.imageCount > 0 && (
                      <span className="text-[10px] text-white/20">📷 {post.imageCount}</span>
                    )}
                  </div>
                  {post.error && (
                    <p className="text-xs text-red-400/60 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {post.error}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {post.status === 'scheduled' && (
                    <button
                      onClick={() => handleCancel(post.id)}
                      className="p-2 rounded-lg text-white/20 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                      title="Отменить"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  {post.status === 'draft' && (
                    <button
                      onClick={() => {
                        updatePost(post.id, { status: 'published', publishedAt: new Date().toISOString() });
                        setPosts(getPosts());
                        addToast('Отмечен как опубликованный', 'success');
                      }}
                      className="p-2 rounded-lg text-white/20 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                      title="Отметить опубликованным"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
