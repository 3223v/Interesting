'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Rule {
  id: string;
  name: string;
  description: string;
  content: string;
  priority: number;
  enabled: boolean;
}

interface RulesStore {
  rules: Rule[];
}

const generateId = () => `rule-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

const emptyRule = (): Rule => ({
  id: generateId(),
  name: '',
  description: '',
  content: '',
  priority: 100,
  enabled: true
});

export default function Page() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editRule, setEditRule] = useState<Rule>(emptyRule());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetch('/api/data/rules')
      .then(res => res.json())
      .then((data: RulesStore) => {
        setRules(data.rules || []);
        if ((data.rules || []).length > 0) {
          setSelectedIndex(0);
          setEditRule(data.rules[0]);
        }
      })
      .catch(() => setRules([]));
  }, []);

  const saveRules = useCallback(async (rulesToSave: Rule[]) => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/data/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: rulesToSave })
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

  const scheduleAutoSave = useCallback((updatedRule: Rule) => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    autoSaveTimer.current = setTimeout(() => {
      if (selectedIndex !== null) {
        const updatedRules = [...rules];
        updatedRules[selectedIndex] = updatedRule;
        saveRules(updatedRules);
      }
    }, 1500);
  }, [rules, selectedIndex, saveRules]);

  const handleFieldChange = <K extends keyof Rule>(field: K, value: Rule[K]) => {
    if (selectedIndex === null) return;
    const updated = { ...editRule, [field]: value };
    setEditRule(updated);
    scheduleAutoSave(updated);
  };

  const handleAddRule = () => {
    const newRule = emptyRule();
    newRule.name = `新规则 ${rules.length + 1}`;
    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    setSelectedIndex(updatedRules.length - 1);
    setEditRule(newRule);
    saveRules(updatedRules);
  };

  const handleDeleteRule = (index: number) => {
    if (!confirm('确定删除这个规则？')) return;
    const updatedRules = rules.filter((_, i) => i !== index);
    setRules(updatedRules);
    if (updatedRules.length === 0) {
      setSelectedIndex(null);
      setEditRule(emptyRule());
    } else if (selectedIndex === index) {
      setSelectedIndex(0);
      setEditRule(updatedRules[0]);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
    saveRules(updatedRules);
  };

  const handleManualSave = () => {
    if (selectedIndex === null) return;
    const updatedRules = [...rules];
    updatedRules[selectedIndex] = editRule;
    saveRules(updatedRules);
  };

  const handleSelectRule = (index: number) => {
    if (selectedIndex !== null && rules[selectedIndex]) {
      const updatedRules = [...rules];
      updatedRules[selectedIndex] = editRule;
      setRules(updatedRules);
    }
    setSelectedIndex(index);
    setEditRule(rules[index]);
  };

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (selectedIndex !== null && editRule) {
      const updatedRules = [...rules];
      updatedRules[selectedIndex] = editRule;
      setRules(updatedRules);
    }
  }, [editRule]);

  const filteredRules = rules.filter(rule =>
    rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.description.toLowerCase().includes(searchTerm.toLowerCase())
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
              background: 'linear-gradient(90deg, #6bffb8, #6b9dff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              规则管理
            </h1>
            <button
              onClick={handleAddRule}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6bffb8, #6b9dff)',
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

          <div style={{ padding: '12px' }}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索规则..."
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
            {filteredRules.map((rule, index) => (
              <div
                key={rule.id}
                onClick={() => handleSelectRule(index)}
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
                  transition: 'all 0.2s',
                  opacity: rule.enabled ? 1 : 0.5
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: selectedIndex === index ? '#6bffb8' : '#d0d0d0',
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
                    background: rule.enabled ? '#6bffb8' : '#666'
                  }} />
                  {rule.name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  优先级: {rule.priority}
                </div>
              </div>
            ))}
            {filteredRules.length === 0 && (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#666',
                fontSize: '13px'
              }}>
                {searchTerm ? '未找到匹配的规则' : '暂无规则'}<br />
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
                value={editRule.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="规则名称"
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
                  onClick={() => handleDeleteRule(selectedIndex)}
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

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <FieldGroup label="优先级 (priority)">
                <input
                  type="number"
                  value={editRule.priority}
                  onChange={(e) => handleFieldChange('priority', parseInt(e.target.value) || 100)}
                  style={inputStyle}
                />
              </FieldGroup>
              <FieldGroup label="启用 (enabled)">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    checked={editRule.enabled}
                    onChange={(e) => handleFieldChange('enabled', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: editRule.enabled ? '#6bffb8' : '#666' }}>
                    {editRule.enabled ? '已启用' : '已禁用'}
                  </span>
                </label>
              </FieldGroup>
            </div>

            <FieldGroup label="描述 (description)">
              <input
                value={editRule.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="规则描述..."
                style={inputStyle}
              />
            </FieldGroup>

            <FieldGroup label="规则内容 (content)">
              <textarea
                value={editRule.content}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                placeholder="规则内容..."
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