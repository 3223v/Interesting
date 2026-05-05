'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface LoreEntry {
  uid: number;
  key: string[];
  keysecondary: string[];
  comment: string;
  content: string;
}

interface LoreExtensions {
  chub?: {
    id: number | null;
    full_path: string | null;
    expressions: unknown | null;
    alt_expressions: Record<string, unknown>;
    related_lorebooks: unknown[];
  };
}

interface Lorebook {
  name: string;
  description: string;
  is_creation: boolean;
  scan_depth: number;
  token_budget: number;
  recursive_scanning: boolean;
  extensions: LoreExtensions;
  entries: Record<string, LoreEntry>;
}

interface LoresStore {
  lorebooks: Lorebook[];
}

const generateUid = () => Math.floor(Math.random() * 900000) + 100000;

const emptyLorebook = (): Lorebook => ({
  name: '',
  description: '',
  is_creation: false,
  scan_depth: 4,
  token_budget: 1024,
  recursive_scanning: false,
  extensions: {},
  entries: {}
});

const emptyEntry = (uid: number): LoreEntry => ({
  uid,
  key: [],
  keysecondary: [],
  comment: '',
  content: ''
});

export default function Page() {
  const [lorebooks, setLorebooks] = useState<Lorebook[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editLore, setEditLore] = useState<Lorebook>(emptyLorebook());
  const [selectedEntryKey, setSelectedEntryKey] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetch('/api/data/lores')
      .then(res => res.json())
      .then((data: LoresStore) => {
        setLorebooks(data.lorebooks || []);
        if ((data.lorebooks || []).length > 0) {
          setSelectedIndex(0);
          setEditLore(data.lorebooks[0]);
          const firstKey = Object.keys(data.lorebooks[0].entries || {})[0];
          setSelectedEntryKey(firstKey || null);
        }
      })
      .catch(() => setLorebooks([]));
  }, []);

  const saveLores = useCallback(async (loresToSave: Lorebook[]) => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/data/lores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lorebooks: loresToSave })
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

  const scheduleAutoSave = useCallback((updatedLore: Lorebook) => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    autoSaveTimer.current = setTimeout(() => {
      if (selectedIndex !== null) {
        const updatedLores = [...lorebooks];
        updatedLores[selectedIndex] = updatedLore;
        saveLores(updatedLores);
      }
    }, 1500);
  }, [lorebooks, selectedIndex, saveLores]);

  const handleFieldChange = (field: keyof Lorebook, value: string | number | boolean) => {
    if (selectedIndex === null) return;
    const updated = { ...editLore, [field]: value };
    setEditLore(updated);
    scheduleAutoSave(updated);
  };

  const handleAddLorebook = () => {
    const newLore = emptyLorebook();
    newLore.name = `新 Lorebook ${lorebooks.length + 1}`;
    const updatedLores = [...lorebooks, newLore];
    setLorebooks(updatedLores);
    setSelectedIndex(updatedLores.length - 1);
    setEditLore(newLore);
    setSelectedEntryKey(null);
    saveLores(updatedLores);
  };

  const handleDeleteLorebook = (index: number) => {
    if (!confirm('确定删除这个 Lorebook？')) return;
    const updatedLores = lorebooks.filter((_, i) => i !== index);
    setLorebooks(updatedLores);
    if (updatedLores.length === 0) {
      setSelectedIndex(null);
      setEditLore(emptyLorebook());
      setSelectedEntryKey(null);
    } else if (selectedIndex === index) {
      setSelectedIndex(0);
      setEditLore(updatedLores[0]);
      const firstKey = Object.keys(updatedLores[0].entries || {})[0];
      setSelectedEntryKey(firstKey || null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
    saveLores(updatedLores);
  };

  const handleManualSave = () => {
    if (selectedIndex === null) return;
    const updatedLores = [...lorebooks];
    updatedLores[selectedIndex] = editLore;
    saveLores(updatedLores);
  };

  const handleSelectLorebook = (index: number) => {
    if (selectedIndex !== null && lorebooks[selectedIndex]) {
      const updatedLores = [...lorebooks];
      updatedLores[selectedIndex] = editLore;
      setLorebooks(updatedLores);
    }
    setSelectedIndex(index);
    setEditLore(lorebooks[index]);
    const firstKey = Object.keys(lorebooks[index].entries || {})[0];
    setSelectedEntryKey(firstKey || null);
  };

  const handleAddEntry = () => {
    const uid = generateUid();
    const newEntry = emptyEntry(uid);
    const newEntries = { ...editLore.entries, [uid.toString()]: newEntry };
    const updated = { ...editLore, entries: newEntries };
    setEditLore(updated);
    setSelectedEntryKey(uid.toString());
    scheduleAutoSave(updated);
  };

  const handleDeleteEntry = (key: string) => {
    const newEntries = { ...editLore.entries };
    delete newEntries[key];
    const updated = { ...editLore, entries: newEntries };
    setEditLore(updated);
    if (selectedEntryKey === key) {
      const nextKey = Object.keys(newEntries)[0] || null;
      setSelectedEntryKey(nextKey);
    }
    scheduleAutoSave(updated);
  };

  const handleEntryChange = (key: string, field: keyof LoreEntry, value: string | string[]) => {
    const updatedEntry = { ...editLore.entries[key], [field]: value };
    const newEntries = { ...editLore.entries, [key]: updatedEntry };
    const updated = { ...editLore, entries: newEntries };
    setEditLore(updated);
    scheduleAutoSave(updated);
  };

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (selectedIndex !== null && editLore) {
      const updatedLores = [...lorebooks];
      updatedLores[selectedIndex] = editLore;
      setLorebooks(updatedLores);
    }
  }, [editLore]);

  const selectedEntry = selectedEntryKey ? editLore.entries[selectedEntryKey] : null;

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
              background: 'linear-gradient(90deg, #ffb86b, #ff6b6b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Lorebooks
            </h1>
            <button
              onClick={handleAddLorebook}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ffb86b, #ff6b6b)',
                border: 'none',
                color: '#0a0a0f',
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
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {lorebooks.map((lore, index) => (
              <div
                key={index}
                onClick={() => handleSelectLorebook(index)}
                style={{
                  padding: '12px 16px',
                  marginBottom: '4px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: selectedIndex === index
                    ? 'rgba(255, 184, 107, 0.15)'
                    : 'transparent',
                  border: selectedIndex === index
                    ? '1px solid rgba(255, 184, 107, 0.4)'
                    : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: selectedIndex === index ? '#ffb86b' : '#d0d0d0',
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {lore.name || '未命名 Lorebook'}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {Object.keys(lore.entries || {}).length} 个条目
                </div>
              </div>
            ))}
            {lorebooks.length === 0 && (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#666',
                fontSize: '13px'
              }}>
                暂无 Lorebook<br />点击 + 创建
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
                value={editLore.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Lorebook 名称"
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
                  onClick={() => handleDeleteLorebook(selectedIndex)}
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
                    ? 'linear-gradient(135deg, #ffb86b, #ff6b6b)'
                    : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '8px',
                  color: selectedIndex !== null ? '#0a0a0f' : '#666',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: selectedIndex !== null ? 'pointer' : 'not-allowed'
                }}
              >
                保存
              </button>
            </div>
          </header>

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            <div style={{
              width: '240px',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>条目列表</span>
                <button
                  onClick={handleAddEntry}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'rgba(255, 184, 107, 0.2)',
                    border: '1px solid rgba(255, 184, 107, 0.4)',
                    color: '#ffb86b',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  +
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {Object.entries(editLore.entries || {}).map(([key, entry]) => (
                  <div
                    key={key}
                    onClick={() => setSelectedEntryKey(key)}
                    style={{
                      padding: '10px 12px',
                      marginBottom: '4px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: selectedEntryKey === key
                        ? 'rgba(255, 184, 107, 0.15)'
                        : 'transparent',
                      border: selectedEntryKey === key
                        ? '1px solid rgba(255, 184, 107, 0.4)'
                        : '1px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: selectedEntryKey === key ? '#ffb86b' : '#d0d0d0',
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      UID: {entry.uid}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: '#666',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {entry.key.slice(0, 2).join(', ') || '无关键词'}
                    </div>
                  </div>
                ))}
                {Object.keys(editLore.entries || {}).length === 0 && (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '11px'
                  }}>
                    暂无条目<br />点击 + 添加
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {selectedEntry ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      <FieldGroup label="UID">
                        <input
                          value={selectedEntry.uid}
                          disabled
                          style={{ ...inputStyle, opacity: 0.5 }}
                        />
                      </FieldGroup>
                      <FieldGroup label="评论 (comment)">
                        <input
                          value={selectedEntry.comment}
                          onChange={(e) => handleEntryChange(selectedEntryKey!, 'comment', e.target.value)}
                          placeholder="评论..."
                          style={inputStyle}
                        />
                      </FieldGroup>
                    </div>

                    <FieldGroup label="关键词 (key)">
                      <StringArrayEditor
                        items={selectedEntry.key}
                        onChange={(items) => handleEntryChange(selectedEntryKey!, 'key', items)}
                        placeholder="添加关键词..."
                      />
                    </FieldGroup>

                    <FieldGroup label="次级关键词 (keysecondary)">
                      <StringArrayEditor
                        items={selectedEntry.keysecondary}
                        onChange={(items) => handleEntryChange(selectedEntryKey!, 'keysecondary', items)}
                        placeholder="添加次级关键词..."
                      />
                    </FieldGroup>

                    <FieldGroup label="内容 (content)">
                      <textarea
                        value={selectedEntry.content}
                        onChange={(e) => handleEntryChange(selectedEntryKey!, 'content', e.target.value)}
                        placeholder="条目内容..."
                        style={{ ...textareaStyle, minHeight: '300px' }}
                      />
                    </FieldGroup>

                    <button
                      onClick={() => handleDeleteEntry(selectedEntryKey!)}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(255,80,80,0.1)',
                        border: '1px solid rgba(255,80,80,0.3)',
                        borderRadius: '8px',
                        color: '#ff6b6b',
                        fontSize: '12px',
                        cursor: 'pointer',
                        marginTop: '16px'
                      }}
                    >
                      删除此条目
                    </button>
                  </>
                ) : (
                  <div style={{
                    padding: '60px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    选择一个条目进行编辑<br />或点击左侧 + 添加新条目
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <FieldGroup label="扫描深度 (scan_depth)">
              <input
                type="number"
                value={editLore.scan_depth}
                onChange={(e) => handleFieldChange('scan_depth', parseInt(e.target.value) || 0)}
                style={inputStyle}
              />
            </FieldGroup>
            <FieldGroup label="Token 预算 (token_budget)">
              <input
                type="number"
                value={editLore.token_budget}
                onChange={(e) => handleFieldChange('token_budget', parseInt(e.target.value) || 0)}
                style={inputStyle}
              />
            </FieldGroup>
            <FieldGroup label="递归扫描 (recursive_scanning)">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={editLore.recursive_scanning}
                  onChange={(e) => handleFieldChange('recursive_scanning', e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: editLore.recursive_scanning ? '#6bffb8' : '#666' }}>
                  {editLore.recursive_scanning ? '已启用' : '已禁用'}
                </span>
              </label>
            </FieldGroup>
            <FieldGroup label="创建模式 (is_creation)">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={editLore.is_creation}
                  onChange={(e) => handleFieldChange('is_creation', e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: editLore.is_creation ? '#6bffb8' : '#666' }}>
                  {editLore.is_creation ? '已启用' : '已禁用'}
                </span>
              </label>
            </FieldGroup>
          </div>
        </main>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
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
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
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
  boxSizing: 'border-box',
  transition: 'border-color 0.2s'
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
            background: 'rgba(255, 184, 107, 0.15)',
            border: '1px solid rgba(255, 184, 107, 0.3)',
            borderRadius: '8px',
            color: '#ffb86b',
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
              background: 'rgba(255, 184, 107, 0.12)',
              border: '1px solid rgba(255, 184, 107, 0.25)',
              borderRadius: '12px',
              color: '#ffb86b',
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