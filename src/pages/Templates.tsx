import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  X,
  Save,
} from 'lucide-react';
import {
  getTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  type Template,
} from '@/api/storage';
import { useToast } from '@/components/ToastProvider';

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    setTemplates(getTemplates());
  }, []);

  const refresh = () => setTemplates(getTemplates());

  const handleSubmit = () => {
    if (!name.trim() || !text.trim()) {
      addToast('Заполните название и текст', 'warning');
      return;
    }

    if (editingId) {
      updateTemplate(editingId, { name: name.trim(), text: text.trim() });
      addToast('Шаблон обновлён', 'success');
    } else {
      addTemplate(name.trim(), text.trim());
      addToast('Шаблон создан', 'success');
    }

    resetForm();
    refresh();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setText('');
  };

  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setName(t.name);
    setText(t.text);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteTemplate(id);
    refresh();
    addToast('Шаблон удалён', 'success');
  };

  const handleCopy = async (t: Template) => {
    try {
      await navigator.clipboard.writeText(t.text);
      setCopied(t.id);
      addToast('Скопировано в буфер', 'success');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      addToast('Не удалось скопировать', 'error');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Шаблоны</h1>
          <p className="text-white/40 mt-1">Готовые тексты для постов</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 rounded-xl bg-[#0077FF]/15 text-[#0077FF] text-sm font-medium hover:bg-[#0077FF]/25 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Создать</span>
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div className="glass rounded-2xl p-5 animate-slide-up space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{editingId ? 'Редактирование' : 'Новый шаблон'}</h3>
            <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Название шаблона..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0077FF]/40 transition-colors placeholder:text-white/15"
          />

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            placeholder="Текст шаблона..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-y min-h-[120px] focus:outline-none focus:border-[#0077FF]/40 transition-colors placeholder:text-white/15"
          />

          <div className="flex gap-2 justify-end">
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-xl bg-white/5 text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !text.trim()}
              className="px-4 py-2 rounded-xl bg-[#0077FF] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {editingId ? 'Обновить' : 'Создать'}
            </button>
          </div>
        </div>
      )}

      {/* Templates list */}
      {templates.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center animate-slide-up">
          <FileText className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Шаблонов пока нет</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-[#0077FF]/20 text-[#0077FF] text-sm font-medium hover:bg-[#0077FF]/30 transition-colors"
          >
            Создать первый шаблон
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t, i) => (
            <div
              key={t.id}
              className="glass rounded-xl p-4 animate-slide-up hover:bg-white/[0.04] transition-colors group"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-sm truncate flex-1">{t.name}</h3>
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(t)}
                    className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-all"
                    title="Копировать"
                  >
                    {copied === t.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => startEdit(t)}
                    className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-all"
                    title="Редактировать"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-white/30 line-clamp-4 leading-relaxed whitespace-pre-line">{t.text}</p>
              <p className="text-[10px] text-white/15 mt-2">
                {new Date(t.createdAt).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
