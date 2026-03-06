import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Send,
  Clock,
  Save,
  ImagePlus,
  X,
  Sparkles,
  Wand2,
  Hash,
  FileText,
  Upload,
  Loader2,
  Users,
  User,
  AlertCircle,
  Server,
  Image,
} from 'lucide-react';
import { addPost, getTemplates, getAiKey, type Template } from '@/api/storage';
import { postToWall, uploadPhoto, isRunningInVK, type VKPhotoUploadResult } from '@/api/vk-bridge';
import { generatePost, improveText, generateHashtags } from '@/api/ai';
import { validateGroupId, validateImageFile, sanitizeText } from '@/utils/security';
import { useToast } from '@/components/ToastProvider';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

export default function CreatePost() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState('');
  const [target, setTarget] = useState<'wall' | 'group'>('wall');
  const [groupId, setGroupId] = useState('');
  const [multiGroupMode, setMultiGroupMode] = useState(false);
  const [groupIds, setGroupIds] = useState('');
  const [useSchedule, setUseSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiTopic, setAiTopic] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [vkRunningInVK, setVkRunningInVK] = useState(false);

  // Check VK Bridge on mount
  useEffect(() => {
    setTemplates(getTemplates());
    const state = location.state as { aiMode?: boolean } | null;
    if (state?.aiMode) setShowAiPanel(true);
    setVkRunningInVK(isRunningInVK());
  }, [location.state]);

  const addImages = useCallback((files: FileList | File[]) => {
    const remaining = 10 - images.length;
    if (remaining <= 0) {
      addToast('Максимум 10 изображений', 'warning');
      return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    const newImages: ImageFile[] = [];

    for (const file of toAdd) {
      const validation = validateImageFile(file);
      if (!validation.ok) {
        addToast(validation.error || 'Ошибка файла', 'error');
        continue;
      }
      newImages.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        file,
        preview: URL.createObjectURL(file),
      });
    }
    setImages(prev => [...prev, ...newImages]);
  }, [images.length, addToast]);

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addImages(e.dataTransfer.files);
  };

  const handleSaveDraft = () => {
    if (!text.trim()) {
      addToast('Введите текст поста', 'warning');
      return;
    }
    
    const targetGroupId = multiGroupMode ? groupIds : groupId;
    
    addPost({
      text: sanitizeText(text),
      target,
      groupId: target === 'group' ? targetGroupId : undefined,
      scheduledAt: useSchedule ? scheduleDate : undefined,
      status: 'draft',
      imageCount: images.length,
    });
    addToast('Черновик сохранён', 'success');
    navigate('/');
  };

  const handlePublish = async () => {
    if (!text.trim()) {
      addToast('Введите текст поста', 'warning');
      return;
    }

    // Validate groups
    const targetGroupId = multiGroupMode ? groupIds : groupId;
    if (target === 'group' && !targetGroupId.trim()) {
      addToast('Введите ID группы(групп)', 'error');
      return;
    }

    // Parse and validate group IDs
    let groupList: string[] = [];
    if (target === 'group') {
      groupList = targetGroupId.split(',').map(id => id.trim()).filter(id => id.length > 0);
      if (groupList.length === 0) {
        addToast('Введите хотя бы один ID группы', 'error');
        return;
      }
      const invalidGroups = groupList.filter(id => !validateGroupId(id));
      if (invalidGroups.length > 0) {
        addToast(`Некорректные ID групп: ${invalidGroups.join(', ')}. Только цифры.`, 'error');
        return;
      }
    }

    // Check if running inside VK
    if (!vkRunningInVK) {
      addToast('Приложение запущено вне VK. Откройте через VK для публикации.', 'error');
      return;
    }

    if (useSchedule) {
      addToast('Отложенная публикация недоступна через VK Bridge', 'warning');
      return;
    }

    setPublishing(true);
    setUploadStatus('Подготовка...');

    try {
      let attachments: string | undefined;

      // Upload images if any
      if (images.length > 0) {
        const uploadedPhotos: string[] = [];

        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          setUploadStatus(`Загрузка фото ${i + 1}/${images.length}...`);

          const uploadResult: VKPhotoUploadResult | null = await uploadPhoto(img.file);

          if (!uploadResult) {
            addToast(`Ошибка загрузки фото ${i + 1}`, 'error');
            setPublishing(false);
            setUploadStatus('');
            return;
          }

          uploadedPhotos.push(uploadResult.photo);
        }

        setUploadStatus('Фото загружены! Публикация поста...');
      }

      // Publish post
      const currentGroupId = groupList.length > 0 ? groupList[0] : undefined;

      setUploadStatus('Публикация...');

      const result = await postToWall(
        sanitizeText(text),
        attachments,
        currentGroupId
      );

      if (result) {
        addPost({
          text: sanitizeText(text),
          target,
          groupId: target === 'group' ? targetGroupId : undefined,
          scheduledAt: useSchedule ? scheduleDate : undefined,
          status: 'published',
          publishedAt: new Date().toISOString(),
          imageCount: images.length,
        });

        const msg = `Пост опубликован${images.length > 0 ? ` с ${images.length} фото` : ''}! 🎉`;
        addToast(msg, 'success');
        navigate('/');
      } else {
        addPost({
          text: sanitizeText(text),
          target,
          groupId: target === 'group' ? targetGroupId : undefined,
          scheduledAt: useSchedule ? scheduleDate : undefined,
          status: 'error',
          error: 'Ошибка публикации через VK Bridge',
          imageCount: images.length,
        });
        addToast('Ошибка публикации', 'error');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Неизвестная ошибка';
      addToast(`Ошибка при публикации: ${msg}`, 'error');
    } finally {
      setPublishing(false);
      setUploadStatus('');
    }
  };

  // AI actions
  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) {
      addToast('Введите тему для генерации', 'warning');
      return;
    }
    setAiLoading('generate');
    const result = await generatePost(aiTopic, getAiKey());
    if (result.ok) {
      setText(result.content);
      if (result.demo) addToast('Демо-режим AI (добавьте ключ OpenAI)', 'info');
      else addToast('Пост сгенерирован!', 'success');
    }
    setAiLoading(null);
  };

  const handleAiImprove = async () => {
    if (!text.trim()) {
      addToast('Сначала введите текст', 'warning');
      return;
    }
    setAiLoading('improve');
    const result = await improveText(text, getAiKey());
    if (result.ok) {
      setText(result.content);
      if (result.demo) addToast('Улучшено в демо-режиме', 'info');
      else addToast('Текст улучшен!', 'success');
    }
    setAiLoading(null);
  };

  const handleAiHashtags = async () => {
    if (!text.trim()) {
      addToast('Сначала введите текст', 'warning');
      return;
    }
    setAiLoading('hashtags');
    const result = await generateHashtags(text, getAiKey());
    if (result.ok) {
      setText(prev => prev + '\n\n' + result.content);
      addToast(result.demo ? 'Хэштеги добавлены (демо)' : 'Хэштеги добавлены!', 'success');
    }
    setAiLoading(null);
  };

  const applyTemplate = (t: Template) => {
    setText(t.text);
    setShowTemplates(false);
    addToast(`Шаблон "${t.name}" применён`, 'success');
  };

  const minDate = new Date(Date.now() + 120000).toISOString().slice(0, 16);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold">Создать пост</h1>
        <p className="text-white/40 mt-1">Новая публикация ВКонтакте</p>
      </div>

      {/* VK Bridge status banner */}
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm animate-fade-in ${
          vkRunningInVK
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}
      >
        {vkRunningInVK ? (
          <>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              VK Bridge подключён — публикация через VK Mini Apps
            </span>
          </>
        ) : (
          <>
            <Server className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-medium">Приложение запущено вне VK</p>
              <p className="text-xs text-red-400/70 mt-0.5">
                Откройте приложение внутри VK для публикации постов
              </p>
            </div>
          </>
        )}
      </div>

      {/* Upload progress overlay */}
      {publishing && uploadStatus && (
        <div className="glass rounded-2xl p-5 animate-fade-in border border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              <Image className="w-3 h-3 text-blue-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-300">{uploadStatus}</p>
              <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Text area */}
          <div className="glass rounded-2xl p-5 animate-slide-up space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white/60">Текст поста</label>
              <span className={`text-xs font-mono ${text.length > 16384 ? 'text-red-400' : 'text-white/20'}`}>
                {text.length} / 16 384
              </span>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={10}
              maxLength={16384}
              placeholder="Напишите что-нибудь интересное..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-y min-h-[200px] focus:outline-none focus:border-[#0077FF]/40 transition-colors placeholder:text-white/15"
            />
          </div>

          {/* Images */}
          <div className="glass rounded-2xl p-5 animate-slide-up space-y-3" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white/60 flex items-center gap-2">
                <ImagePlus className="w-4 h-4" />
                Изображения
              </label>
              <span className="text-xs text-white/20">{images.length} / 10</span>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-[#0077FF] bg-[#0077FF]/10'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
              }`}
            >
              <Upload className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-sm text-white/30">Перетащите или нажмите для загрузки</p>
              <p className="text-xs text-white/15 mt-1">JPG, PNG, GIF, WebP • Макс. 10 МБ • До 10 фото</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                if (e.target.files) addImages(e.target.files);
                e.target.value = '';
              }}
            />

            {/* Preview grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden group border border-white/5">
                    <img
                      src={img.preview}
                      alt={`Фото ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                      <span className="text-[10px] font-mono text-white/70">{idx + 1}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[9px] text-white/60 text-center font-mono">
                        {(img.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Images info */}
            {images.length > 0 && (
              <div className="flex items-center justify-between text-xs text-white/20">
                <span>
                  Общий размер: {(images.reduce((s, i) => s + i.file.size, 0) / (1024 * 1024)).toFixed(1)} МБ
                </span>
                <button
                  onClick={() => {
                    images.forEach(i => URL.revokeObjectURL(i.preview));
                    setImages([]);
                  }}
                  className="text-red-400/50 hover:text-red-400 transition-colors"
                >
                  Удалить все
                </button>
              </div>
            )}
          </div>

          {/* Target */}
          <div className="glass rounded-2xl p-5 animate-slide-up space-y-3" style={{ animationDelay: '100ms' }}>
            <label className="text-sm font-medium text-white/60">Куда публикуем</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTarget('wall')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  target === 'wall'
                    ? 'bg-[#0077FF]/15 text-[#0077FF] border border-[#0077FF]/30'
                    : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/[0.07]'
                }`}
              >
                <User className="w-4 h-4" />
                Моя стена
              </button>
              <button
                onClick={() => setTarget('group')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  target === 'group'
                    ? 'bg-[#0077FF]/15 text-[#0077FF] border border-[#0077FF]/30'
                    : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/[0.07]'
                }`}
              >
                <Users className="w-4 h-4" />
                Группа
              </button>
            </div>

            {target === 'group' && (
              <div className="space-y-3 animate-fade-in">
                {/* Mode toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMultiGroupMode(false)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      !multiGroupMode
                        ? 'bg-[#0077FF]/15 text-[#0077FF] border border-[#0077FF]/30'
                        : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/[0.07]'
                    }`}
                  >
                    Одна группа
                  </button>
                  <button
                    onClick={() => setMultiGroupMode(true)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      multiGroupMode
                        ? 'bg-[#0077FF]/15 text-[#0077FF] border border-[#0077FF]/30'
                        : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/[0.07]'
                    }`}
                  >
                    Несколько групп
                  </button>
                </div>

                {!multiGroupMode ? (
                  <div className="space-y-2">
                    <input
                      value={groupId}
                      onChange={e => setGroupId(e.target.value.replace(/\D/g, ''))}
                      placeholder="ID группы (только цифры)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#0077FF]/40 transition-colors placeholder:text-white/20"
                    />
                    {groupId && !validateGroupId(groupId) && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Только цифры
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={groupIds}
                      onChange={e => setGroupIds(e.target.value.replace(/[^\d,]/g, ''))}
                      placeholder="ID групп через запятую (123456,789012,3456789)"
                      rows={3}
                      maxLength={500}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono resize-y min-h-[80px] focus:outline-none focus:border-[#0077FF]/40 transition-colors placeholder:text-white/20"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/20">{groupIds.split(',').filter(id => id.trim()).length} групп</span>
                      {groupIds && (
                        <button
                          onClick={() => setGroupIds('')}
                          className="text-red-400/50 hover:text-red-400 transition-colors"
                        >
                          Очистить
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="glass rounded-2xl p-5 animate-slide-up space-y-3" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white/60 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Отложенная публикация
              </label>
              <button
                onClick={() => setUseSchedule(!useSchedule)}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  useSchedule ? 'bg-[#0077FF]' : 'bg-white/10'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                  useSchedule ? 'left-5' : 'left-1'
                }`} />
              </button>
            </div>

            {useSchedule && (
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                min={minDate}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0077FF]/40 transition-colors animate-fade-in"
              />
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="glass rounded-2xl p-5 animate-slide-up space-y-3" style={{ animationDelay: '100ms' }}>
            <button
              onClick={handlePublish}
              disabled={publishing || !text.trim()}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#0077FF] to-[#0055CC] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadStatus || 'Публикация...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {useSchedule ? 'Запланировать' : 'Опубликовать'}
                  {images.length > 0 && (
                    <span className="ml-1 text-xs opacity-60">
                      + {images.length} фото
                    </span>
                  )}
                </>
              )}
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={!text.trim()}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Сохранить черновик
            </button>
          </div>

          {/* AI Panel */}
          <div className="glass rounded-2xl p-5 animate-slide-up space-y-3" style={{ animationDelay: '150ms' }}>
            <button
              onClick={() => setShowAiPanel(!showAiPanel)}
              className="w-full flex items-center gap-2 text-sm font-semibold"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="flex-1 text-left">AI Ассистент</span>
              <span className={`text-xs text-white/20 transition-transform ${showAiPanel ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {showAiPanel && (
              <div className="space-y-3 animate-fade-in pt-2 border-t border-white/5">
                <div className="space-y-2">
                  <input
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    placeholder="Тема для генерации..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500/40 transition-colors placeholder:text-white/15"
                  />
                  <button
                    onClick={handleAiGenerate}
                    disabled={aiLoading === 'generate' || !aiTopic.trim()}
                    className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/20 text-xs font-medium text-purple-300 hover:from-purple-500/30 hover:to-pink-500/30 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    {aiLoading === 'generate' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Сгенерировать пост
                  </button>
                </div>

                <button
                  onClick={handleAiImprove}
                  disabled={aiLoading === 'improve' || !text.trim()}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.07] transition-all disabled:opacity-30 flex items-center justify-center gap-1.5"
                >
                  {aiLoading === 'improve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  Улучшить текст
                </button>

                <button
                  onClick={handleAiHashtags}
                  disabled={aiLoading === 'hashtags' || !text.trim()}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.07] transition-all disabled:opacity-30 flex items-center justify-center gap-1.5"
                >
                  {aiLoading === 'hashtags' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Hash className="w-3 h-3" />}
                  Добавить хэштеги
                </button>

                {!getAiKey() && (
                  <p className="text-[10px] text-white/20 text-center">
                    ✨ Демо-режим. Добавьте ключ OpenAI в настройках.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Templates */}
          <div className="glass rounded-2xl p-5 animate-slide-up space-y-3" style={{ animationDelay: '200ms' }}>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center gap-2 text-sm font-semibold"
            >
              <FileText className="w-4 h-4 text-white/40" />
              <span className="flex-1 text-left">Шаблоны</span>
              <span className="text-xs text-white/20">{templates.length}</span>
            </button>

            {showTemplates && (
              <div className="space-y-2 animate-fade-in pt-2 border-t border-white/5 max-h-60 overflow-y-auto">
                {templates.length === 0 ? (
                  <p className="text-xs text-white/20 text-center py-3">
                    Нет шаблонов. Создайте в разделе «Шаблоны».
                  </p>
                ) : (
                  templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/[0.08] transition-colors"
                    >
                      <p className="text-xs font-medium truncate">{t.name}</p>
                      <p className="text-[10px] text-white/20 truncate mt-0.5">{t.text}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* VK Bridge info */}
          <div className="glass rounded-2xl p-4 animate-slide-up space-y-2" style={{ animationDelay: '250ms' }}>
            <div className="flex items-center gap-2 text-xs text-white/30">
              <Server className="w-3.5 h-3.5" />
              <span>Статус VK Bridge</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                vkRunningInVK ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-white/20'
              }`} />
              <span className={`text-xs ${
                vkRunningInVK ? 'text-emerald-400' : 'text-white/20'
              }`}>
                {vkRunningInVK ? 'Подключён' : 'Не подключён'}
              </span>
            </div>
            {!vkRunningInVK && (
              <p className="text-[10px] text-white/15 leading-relaxed mt-1">
                Откройте приложение внутри VK для публикации постов
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
