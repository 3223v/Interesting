'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface RoleData {
  id: string;
  kind: string;
  name: string;
  description: string;
  use_prompt: string;
  system_prompt: string;
  canvas_position: { x: number; y: number };
  url: string;
  key: string;
  model: string;
  temperature: number;
  knowledge_private: string[];
  knowledge_public: string[];
  blocked_role_names: string[];
  unknown_role_names: string[];
  inbox: unknown[];
  redundancy: number;
  status: string;
  enabled: boolean;
  last_think: string;
  last_error: string;
}

interface RolesStore {
  roles: RoleData[];
}

const generateId = () => `role-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

const emptyRole = (): RoleData => ({
  id: generateId(),
  kind: 'role',
  name: '',
  description: '',
  use_prompt: '',
  system_prompt: '',
  canvas_position: { x: 166.5, y: 103 },
  url: 'https://api.deepseek.com/',
  key: '',
  model: 'deepseek-reasoner',
  temperature: 0.7,
  knowledge_private: [],
  knowledge_public: [],
  blocked_role_names: [],
  unknown_role_names: [],
  inbox: [],
  redundancy: 0,
  status: 'active',
  enabled: true,
  last_think: '',
  last_error: ''
});

export default function Page() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<RoleData>(emptyRole());
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetch('/api/data/roles')
      .then(res => res.json())
      .then((data: RolesStore) => {
        setRoles(data.roles || []);
        if ((data.roles || []).length > 0) {
          setSelectedIndex(0);
          setEditRole(data.roles[0]);
        }
      })
      .catch(() => setRoles([]));
  }, []);

  const saveRoles = useCallback(async (rolesToSave: RoleData[]) => {
    setSaving(true);
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/data/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: rolesToSave })
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
    } finally {
      setSaving(false);
    }
  }, []);

  const scheduleAutoSave = useCallback((updatedRole: RoleData) => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    autoSaveTimer.current = setTimeout(() => {
      if (selectedIndex !== null) {
        const updatedRoles = [...roles];
        updatedRoles[selectedIndex] = updatedRole;
        saveRoles(updatedRoles);
      }
    }, 1500);
  }, [roles, selectedIndex, saveRoles]);

  const handleFieldChange = (field: keyof RoleData, value: string | number | boolean | string[]) => {
    if (selectedIndex === null) return;
    const updated = {
      ...editRole,
      [field]: value
    };
    setEditRole(updated);
    scheduleAutoSave(updated);
  };

  const handleAddRole = () => {
    const newRole = emptyRole();
    newRole.name = `新角色 ${roles.length + 1}`;
    const updatedRoles = [...roles, newRole];
    setRoles(updatedRoles);
    setSelectedIndex(updatedRoles.length - 1);
    setEditRole(newRole);
    saveRoles(updatedRoles);
  };

  const handleDeleteRole = (index: number) => {
    if (!confirm('确定删除这个角色？')) return;
    const updatedRoles = roles.filter((_, i) => i !== index);
    setRoles(updatedRoles);
    if (updatedRoles.length === 0) {
      setSelectedIndex(null);
      setEditRole(emptyRole());
    } else if (selectedIndex === index) {
      setSelectedIndex(0);
      setEditRole(updatedRoles[0]);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
    saveRoles(updatedRoles);
  };

  const handleManualSave = () => {
    if (selectedIndex === null) return;
    const updatedRoles = [...roles];
    updatedRoles[selectedIndex] = editRole;
    saveRoles(updatedRoles);
  };

  const handleSelectRole = (index: number) => {
    if (selectedIndex !== null && roles[selectedIndex]) {
      const updatedRoles = [...roles];
      updatedRoles[selectedIndex] = editRole;
      setRoles(updatedRoles);
    }
    setSelectedIndex(index);
    setEditRole(roles[index]);
  };

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (selectedIndex !== null && editRole) {
      const updatedRoles = [...roles];
      updatedRoles[selectedIndex] = editRole;
      setRoles(updatedRoles);
    }
  }, [editRole]);

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
              角色智能体
            </h1>
            <button
              onClick={handleAddRole}
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
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {roles.map((role, index) => (
              <div
                key={index}
                onClick={() => handleSelectRole(index)}
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
                  {role.name || '未命名角色'}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {role.model || 'deepseek-reasoner'}
                </div>
              </div>
            ))}
            {roles.length === 0 && (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#666',
                fontSize: '13px'
              }}>
                暂无角色智能体<br />点击 + 创建
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
                value={editRole.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="角色名称"
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
                  onClick={() => handleDeleteRole(selectedIndex)}
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
                disabled={selectedIndex === null || saving}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <FieldGroup label="模型 (model)">
                <select
                  value={editRole.model}
                  onChange={(e) => handleFieldChange('model', e.target.value)}
                  style={inputStyle}
                >
                  <option value="deepseek-reasoner">deepseek-reasoner</option>
                  <option value="deepseek-chat">deepseek-chat</option>
                  <option value="gpt-4">gpt-4</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                </select>
              </FieldGroup>
              <FieldGroup label="温度 (temperature)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={editRole.temperature}
                  onChange={(e) => handleFieldChange('temperature', parseFloat(e.target.value))}
                  style={inputStyle}
                />
              </FieldGroup>
            </div>

            <FieldGroup label="API 地址 (url)">
              <input
                value={editRole.url}
                onChange={(e) => handleFieldChange('url', e.target.value)}
                placeholder="https://api.deepseek.com/"
                style={inputStyle}
              />
            </FieldGroup>

            <FieldGroup label="API 密钥 (key)">
              <input
                value={editRole.key}
                onChange={(e) => handleFieldChange('key', e.target.value)}
                placeholder="sk-..."
                type="password"
                style={inputStyle}
              />
            </FieldGroup>

            <FieldGroup label="描述 (description)">
              <textarea
                value={editRole.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="角色描述..."
                style={textareaStyle}
              />
            </FieldGroup>

            <FieldGroup label="系统提示词 (system_prompt)">
              <textarea
                value={editRole.system_prompt}
                onChange={(e) => handleFieldChange('system_prompt', e.target.value)}
                placeholder="系统提示词..."
                style={{ ...textareaStyle, minHeight: '150px' }}
              />
            </FieldGroup>

            <FieldGroup label="使用提示词 (use_prompt)">
              <textarea
                value={editRole.use_prompt}
                onChange={(e) => handleFieldChange('use_prompt', e.target.value)}
                placeholder="使用提示词..."
                style={{ ...textareaStyle, minHeight: '150px' }}
              />
            </FieldGroup>

            <FieldGroup label="私有知识 (knowledge_private)">
              <StringArrayEditor
                items={editRole.knowledge_private}
                onChange={(items) => handleFieldChange('knowledge_private', items)}
                placeholder="添加私有知识..."
              />
            </FieldGroup>

            <FieldGroup label="公共知识 (knowledge_public)">
              <StringArrayEditor
                items={editRole.knowledge_public}
                onChange={(items) => handleFieldChange('knowledge_public', items)}
                placeholder="添加公共知识..."
              />
            </FieldGroup>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FieldGroup label="状态 (status)">
                <select
                  value={editRole.status}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  style={inputStyle}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </FieldGroup>
              <FieldGroup label="启用 (enabled)">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    checked={editRole.enabled}
                    onChange={(e) => handleFieldChange('enabled', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: editRole.enabled ? '#6bffb8' : '#666' }}>
                    {editRole.enabled ? '已启用' : '已禁用'}
                  </span>
                </label>
              </FieldGroup>
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
            background: 'rgba(107, 255, 184, 0.15)',
            border: '1px solid rgba(107, 255, 184, 0.3)',
            borderRadius: '8px',
            color: '#6bffb8',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          添加
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              padding: '10px 14px',
              background: 'rgba(107, 255, 184, 0.05)',
              border: '1px solid rgba(107, 255, 184, 0.15)',
              borderRadius: '8px',
              color: '#d0d0d0',
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item}
            </span>
            <button
              onClick={() => handleRemove(i)}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                padding: '0 0 0 12px',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}