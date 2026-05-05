'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Knowledge {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  enabled: boolean;
}

interface KnowledgesStore {
  knowledges: Knowledge[];
}

const generateId = () => `knowledge-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

const emptyKnowledge = (): Knowledge => ({
  id: generateId(),
  title: '',
  content: '',
  tags: [],
  category: '',
  enabled: true
});

export default function Page() {
  const [knowledges, setKnowledges] = useState<Knowledge[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editKnowledge, setEditKnowledge] = useState<Knowledge>(emptyKnowledge());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetch('/api/data/knowledges')
      .then(res => res.json())
      .then((data: KnowledgesStore) => {
        setKnowledges(data.knowledges || []);
        if ((data.knowledges || []).length > 0) {
          setSelectedIndex(0);
          setEditKnowledge(data.knowledges[0]);
        }
      })
      .catch(() => setKnowledges([]));
  }, []);

  const saveKnowledges = useCallback(async (knowledgesToSave: Knowledge[]) => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/data/knowledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledges: knowledgesToSave })
      });
      if (res.ok) {
        setSaveStatus('saved');
        setLastSaved(new Date());
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  }, []);

  const scheduleAutoSave = useCallback((updatedKnowledge: Knowledge) => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    autoSaveTimer.current = setTimeout(() => {
      if (selectedIndex !== null) {
        const updatedKnowledges = [...knowledges];
        updatedKnowledges[selectedIndex] = updatedKnowledge;
        saveKnowledges(updatedKnowledges);
      }
    }, 1500);
  }, [knowledges, selectedIndex, saveKnowledges]);

  const handleFieldChange = (field: keyof Knowledge, value: string | boolean | string[]) => {
    if (selectedIndex === null) return;
    const updated = { ...editKnowledge, [field]: value };
    setEditKnowledge(updated);
    scheduleAutoSave(updated);
  };

  const handleAddKnowledge = () => {
    const newKnowledge = emptyKnowledge();
    newKnowledge.title = `新知识 ${knowledges.length + 1}`;
    const updatedKnowledges = [...knowledges, newKnowledge];
    setKnowledges(updatedKnowledges);
    setSelectedIndex(updatedKnowledges.length - 1);
    setEditKnowledge(newKnowledge);
    saveKnowledges(updatedKnowledges);
  };

  const handleDeleteKnowledge = (index: number) => {
    if (!confirm('确定删除这个知识？')) return;
    const updatedKnowledges = knowledges.filter((_, i) => i !== index);
    setKnowledges(updatedKnowledges);
    if (updatedKnowledges.length === 0) {
      setSelectedIndex(null);
      setEditKnowledge(emptyKnowledge());
    } else if (selectedIndex === index) {
      setSelectedIndex(0);
      setEditKnowledge(updatedKnowledges[0]);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
    saveKnowledges(updatedKnowledges);
  };

  const handleManualSave = () => {
    if (selectedIndex === null) return;
    const updatedKnowledges = [...knowledges];
    updatedKnowledges[selectedIndex] = editKnowledge;
    saveKnowledges(updatedKnowledges);
  };

  const handleSelectKnowledge = (index: number) => {
    if (selectedIndex !== null && knowledges[selectedIndex]) {
      const updatedKnowledges = [...knowledges];
      updatedKnowledges[selectedIndex] = editKnowledge;
      setKnowledges(updatedKnowledges);
    }
    setSelectedIndex(index);
    setEditKnowledge(knowledges[index]);
  };

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (selectedIndex !== null && editKnowledge) {
      const updatedKnowledges = [...knowledges];
      updatedKnowledges[selectedIndex] = editKnowledge;
      setKnowledges(updatedKnowledges);
    }
  }, [editKnowledge]);

  const filteredKnowledges = knowledges.filter(knowledge =>
    knowledge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    knowledge.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    knowledge.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
      fontFamily: '"SF Mono", "Fira Code", "JetBrains Mono", monospace',
      color: '#e0e0e0'
    }}>
      <div style={{ display: 'flex', height: '100vh' }}>
        <aside style={{
          width: '280px',
          background: 'rgba(0,0,0,0.3)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h1 style={{
              fontSize: '16px',
              fontWeight: 700,
              background: 'linear-gradient(90deg, #6b9dff, #c44cff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              知识库管理
            </h1>
            <button
              onClick={handleAddKnowledge}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6b9dff, #c44cff)',
                border: 'none',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              +
            </button>
          </div>

          <div style={{ padding: '12px' }}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索知识..."
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                color: '#d0d0d0',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {filteredKnowledges.map((knowledge, index) => (
              <div
                key={knowledge.id}
                onClick={() => handleSelectKnowledge(index)}
                style={{
                  padding: '12px 16px',
                  marginBottom: '4px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: selectedIndex === index
                    ? 'rgba(107, 157, 255, 0.15)'
                    : 'transparent',
                  border: selectedIndex === index
                    ? '1px solid rgba(107, 157, 255, 0.4)'
                    : '1px solid transparent',
                  transition: 'all 0.2s',
                  opacity: knowledge.enabled ? 1 : 0.5
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: selectedIndex === index ? '#6b9dff' : '#d0d0d0',
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: knowledge.enabled ? '#6b9dff' : '#666'
                  }} />
                  {knowledge.title}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {knowledge.category || '未分类'} | {knowledge.tags.length} 标签
                </div>
              </div>
            ))}
            {filteredKnowledges.length === 0 && (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#666',
                fontSize: '13px'
              }}>
                {searchTerm ? '未找到匹配的知识' : '暂无知识'}<br />
                {!searchTerm && '点击 + 创建'}
              </div>
            )}
          </div>
        </aside>

        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <header style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input
                value={editKnowledge.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="知识标题"
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  outline: 'none',
                  width: '200px'
                }}
              />
              {selectedIndex !== null && (
                <button
                  onClick={() => handleDeleteKnowledge(selectedIndex)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(255,80,80,0.1)',
                    border: '1px solid rgba(255,80,80,0.3)',
                    borderRadius: '6px',
                    color: '#ff6b6b',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  删除
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {saveStatus === 'saved' && (
                <span style={{ fontSize: '12px', color: '#6bffb8' }}>✓ 已保存</span>
              )}
              {saveStatus === 'saving' && (
                <span style={{ fontSize: '12px', color: '#888' }}>保存中...</span>
              )}
              {saveStatus === 'error' && (
                <span style={{ fontSize: '12px', color: '#ff6b6b' }}>保存失败</span>
              )}
              {saveStatus === 'idle' && lastSaved && (
                <span style={{ fontSize: '12px', color: '#666' }}>
                  已保存 {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={handleManualSave}
                disabled={selectedIndex === null}
                style={{
                  padding: '8px 16px',
                  background: selectedIndex !== null
                    ? 'linear-gradient(135deg, #6b9dff, #c44cff)'
                    : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '8px',
                  color: selectedIndex !== null ? '#fff' : '#666',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: selectedIndex !== null ? 'pointer' : 'not-allowed'
                }}
              >
                保存
              </button>
            </div>
          </header>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <FieldGroup label="分类 (category)">
                <input
                  value={editKnowledge.category}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  placeholder="知识分类..."
                  style={inputStyle}
                />
              </FieldGroup>
              <FieldGroup label="启用 (enabled)">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    checked={editKnowledge.enabled}
                    onChange={(e) => handleFieldChange('enabled', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: editKnowledge.enabled ? '#6b9dff' : '#666' }}>
                    {editKnowledge.enabled ? '已启用' : '已禁用'}
                  </span>
                </label>
              </FieldGroup>
            </div>

            <FieldGroup label="标签 (tags)">
              <StringArrayEditor
                items={editKnowledge.tags}
                onChange={(items) => handleFieldChange('tags', items)}
                placeholder="添加标签..."
              />
            </FieldGroup>

            <FieldGroup label="知识内容 (content)">
              <textarea
                value={editKnowledge.content}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                placeholder="知识内容..."
                style={{ ...textareaStyle, minHeight: '400px', fontFamily: 'monospace' }}
              />
            </FieldGroup>
          </div>
        </main>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: 600,
        color: '#888',
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  color: '#d0d0d0',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box'
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '100px',
  padding: '14px 16px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  color: '#d0d0d0',
  fontSize: '13px',
  lineHeight: '1.6',
  resize: 'vertical',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box'
};

function StringArrayEditor({
  items,
  onChange,
  placeholder
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed) {
      onChange([...items, trimmed]);
    }
    setInput('');
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            color: '#d0d0d0',
            fontSize: '13px',
            outline: 'none'
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: '10px 16px',
            background: 'rgba(107, 157, 255, 0.15)',
            border: '1px solid rgba(107, 157, 255, 0.3)',
            borderRadius: '8px',
            color: '#6b9dff',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          添加
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {items.map((item, i) => (
          <span
            key={i}
            style={{
              padding: '4px 10px',
              background: 'rgba(107, 157, 255, 0.12)',
              border: '1px solid rgba(107, 157, 255, 0.25)',
              borderRadius: '12px',
              color: '#6b9dff',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {item}
            <button
              onClick={() => handleRemove(i)}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                padding: 0,
                fontSize: '14px',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}