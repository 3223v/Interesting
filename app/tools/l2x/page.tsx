'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface LoreEntry {
  id: string;
  key: string;
  content: string;
  enabled: boolean;
  comment: string;
}

interface Lorebook {
  id: string;
  name: string;
  description: string;
  entries: LoreEntry[];
  scan_setting: {
    scan_depth: number;
    max_entry_length: number;
    use_when: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface LorebooksStore {
  lores: Lorebook[];
}

const generateId = () => `lore-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

const emptyLorebook = (): Lorebook => ({
  id: generateId(),
  name: '新Lorebook',
  description: '',
  entries: [],
  scan_setting: {
    scan_depth: 3,
    max_entry_length: 2000,
    use_when: 'always'
  },
  createdAt: new Date().toISOString().split('T')[0],
  updatedAt: new Date().toISOString().split('T')[0]
});

const emptyEntry = (): LoreEntry => ({
  id: generateId(),
  key: '',
  content: '',
  enabled: true,
  comment: ''
});

export default function Page() {
  const [lores, setLores] = useState<Lorebook[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editLore, setEditLore] = useState<Lorebook>(emptyLorebook());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetch('/api/data/lores')
      .then(res => res.json())
      .then((data: LorebooksStore) => {
        setLores(data.lores || []);
        if ((data.lores || []).length > 0) {
          setSelectedIndex(0);
          setEditLore(data.lores[0]);
        }
      })
      .catch(() => setLores([]));
  }, []);

  const saveLores = useCallback(async (loresToSave: Lorebook[]) => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/data/lores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lores: loresToSave })
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
        const updatedLores = [...lores];
        updatedLores[selectedIndex] = { ...updatedLore, updatedAt: new Date().toISOString().split('T')[0] };
        saveLores(updatedLores);
      }
    }, 1500);
  }, [lores, selectedIndex, saveLores]);

  const handleFieldChange = (field: keyof Lorebook, value: string | number) => {
    if (selectedIndex === null) return;
    const updated = { ...editLore, [field]: value };
    setEditLore(updated);
    scheduleAutoSave(updated);
  };

  const handleScanSettingChange = (field: keyof Lorebook['scan_setting'], value: string | number) => {
    if (selectedIndex === null) return;
    const updated = {
      ...editLore,
      scan_setting: { ...editLore.scan_setting, [field]: value }
    };
    setEditLore(updated);
    scheduleAutoSave(updated);
  };

  const handleAddLore = () => {
    const newLore = emptyLorebook();
    newLore.name = `新Lorebook ${lores.length + 1}`;
    const updatedLores = [...lores, newLore];
    setLores(updatedLores);
    setSelectedIndex(updatedLores.length - 1);
    setEditLore(newLore);
    saveLores(updatedLores);
  };

  const handleDeleteLore = (index: number) => {
    if (!confirm('确定删除这个Lorebook？')) return;
    const updatedLores = lores.filter((_, i) => i !== index);
    setLores(updatedLores);
    if (updatedLores.length === 0) {
      setSelectedIndex(null);
      setEditLore(emptyLorebook());
    } else if (selectedIndex === index) {
      setSelectedIndex(0);
      setEditLore(updatedLores[0]);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
    saveLores(updatedLores);
  };

  const handleAddEntry = () => {
    const newEntry = emptyEntry();
    newEntry.key = `entry-${editLore.entries.length + 1}`;
    const updated = { ...editLore, entries: [...editLore.entries, newEntry] };
    setEditLore(updated);
    scheduleAutoSave(updated);
  };

  const handleRemoveEntry = (index: number) => {
    const newEntries = editLore.entries.filter((_, i) => i !== index);
    const updated = { ...editLore, entries: newEntries };
    setEditLore(updated);
    scheduleAutoSave(updated);
  };

  const handleEntryChange = (entryIndex: number, field: keyof LoreEntry, value: string | boolean) => {
    const newEntries = [...editLore.entries];
    newEntries[entryIndex] = { ...newEntries[entryIndex], [field]: value };
    const updated = { ...editLore, entries: newEntries };
    setEditLore(updated);
    scheduleAutoSave(updated);
  };

  const handleManualSave = () => {
    if (selectedIndex === null) return;
    const updatedLores = [...lores];
    updatedLores[selectedIndex] = { ...editLore, updatedAt: new Date().toISOString().split('T')[0] };
    saveLores(updatedLores);
  };

  const handleSelectLore = (index: number) => {
    if (selectedIndex !== null && lores[selectedIndex]) {
      const updatedLores = [...lores];
      updatedLores[selectedIndex] = editLore;
      setLores(updatedLores);
    }
    setSelectedIndex(index);
    setEditLore(lores[index]);
  };

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (selectedIndex !== null && editLore) {
      const updatedLores = [...lores];
      updatedLores[selectedIndex] = editLore;
      setLores(updatedLores);
    }
  }, [editLore]);

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
              background: 'linear-gradient(90deg, #6bffb8, #6b9dff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Lorebook 管理
            </h1>
            <button
              onClick={handleAddLore}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6bffb8, #6b9dff)',
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

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {lores.map((lore, index) => (
              <div
                key={lore.id}
                onClick={() => handleSelectLore(index)}
                style={{
                  padding: '12px 16px',
                  marginBottom: '4px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: selectedIndex === index
                    ? 'rgba(107, 255, 184, 0.15)'
                    : 'transparent',
                  border: selectedIndex === index
                    ? '1px solid rgba(107, 255, 184, 0.4)'
                    : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: selectedIndex === index ? '#6bffb8' : '#d0d0d0',
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {lore.name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {lore.entries.length} 条目
                </div>
              </div>
            ))}
            {lores.length === 0 && (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#666',
                fontSize: '13px'
              }}>
                暂无Lorebook<br />点击 + 创建
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
                placeholder="Lorebook名称"
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
                  onClick={() => handleDeleteLore(selectedIndex)}
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
                    ? 'linear-gradient(135deg, #6bffb8, #6b9dff)'
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
            <FieldGroup label="描述 (description)">
              <textarea
                value={editLore.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="描述..."
                style={textareaStyle}
              />
            </FieldGroup>

            <div style={{
              padding: '20px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.05)',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '12px',
                color: '#888',
                marginBottom: '16px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                扫描设置 (scan_setting)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <FieldGroup label="扫描深度">
                  <input
                    type="number"
                    value={editLore.scan_setting.scan_depth}
                    onChange={(e) => handleScanSettingChange('scan_depth', parseInt(e.target.value) || 3)}
                    style={inputStyle}
                  />
                </FieldGroup>
                <FieldGroup label="最大条目长度">
                  <input
                    type="number"
                    value={editLore.scan_setting.max_entry_length}
                    onChange={(e) => handleScanSettingChange('max_entry_length', parseInt(e.target.value) || 2000)}
                    style={inputStyle}
                  />
                </FieldGroup>
                <FieldGroup label="使用时机">
                  <select
                    value={editLore.scan_setting.use_when}
                    onChange={(e) => handleScanSettingChange('use_when', e.target.value)}
                    style={inputStyle}
                  >
                    <option value="always">always</option>
                    <option value="once">once</option>
                    <option value="never">never</option>
                  </select>
                </FieldGroup>
              </div>
            </div>

            <FieldGroup label={`条目列表 (entries) - ${editLore.entries.length} 个`}>
              <button
                onClick={handleAddEntry}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(107, 255, 184, 0.15)',
                  border: '1px solid rgba(107, 255, 184, 0.3)',
                  borderRadius: '8px',
                  color: '#6bffb8',
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginBottom: '12px'
                }}
              >
                + 添加条目
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {editLore.entries.map((entry, index) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: '16px',
                      background: 'rgba(107, 255, 184, 0.05)',
                      border: '1px solid rgba(107, 255, 184, 0.15)',
                      borderRadius: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          value={entry.key}
                          onChange={(e) => handleEntryChange(index, 'key', e.target.value)}
                          placeholder="条目键名"
                          style={{
                            padding: '8px 12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: '#d0d0d0',
                            fontSize: '12px',
                            width: '150px'
                          }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="checkbox"
                            checked={entry.enabled}
                            onChange={(e) => handleEntryChange(index, 'enabled', e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '12px', color: '#888' }}>启用</span>
                        </label>
                      </div>
                      <button
                        onClick={() => handleRemoveEntry(index)}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(255,80,80,0.1)',
                          border: '1px solid rgba(255,80,80,0.3)',
                          borderRadius: '4px',
                          color: '#ff6b6b',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        删除
                      </button>
                    </div>
                    <textarea
                      value={entry.content}
                      onChange={(e) => handleEntryChange(index, 'content', e.target.value)}
                      placeholder="条目内容..."
                      style={{ ...textareaStyle, minHeight: '80px', fontSize: '12px' }}
                    />
                    <input
                      value={entry.comment}
                      onChange={(e) => handleEntryChange(index, 'comment', e.target.value)}
                      placeholder="备注..."
                      style={{ ...inputStyle, marginTop: '8px', fontSize: '12px' }}
                    />
                  </div>
                ))}
                {editLore.entries.length === 0 && (
                  <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '13px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '10px',
                    border: '1px dashed rgba(255,255,255,0.1)'
                  }}>
                    暂无条目<br />点击上方按钮添加
                  </div>
                )}
              </div>
            </FieldGroup>

            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '10px',
              fontSize: '12px',
              color: '#666'
            }}>
              <div>创建时间: {editLore.createdAt}</div>
              <div>更新时间: {editLore.updatedAt}</div>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        select { appearance: none; }
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
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  color: '#d0d0d0',
  fontSize: '12px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box'
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '80px',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  color: '#d0d0d0',
  fontSize: '12px',
  lineHeight: '1.6',
  resize: 'vertical',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box'
};