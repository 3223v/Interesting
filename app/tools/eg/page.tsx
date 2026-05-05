'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Simulation {
  batch_size: number;
  current_batch_index: number;
  max_round_history: number;
  mode: string;
  round_goal: string;
}

interface Workflow {
  pending_plan: unknown;
  pending_judgement: unknown;
}

interface GroundRole {
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

interface Rule {
  id: string;
  name: string;
  description: string;
  content: string;
  priority: number;
  enabled: boolean;
}

interface Knowledge {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  enabled: boolean;
}

interface GroundData {
  id: string;
  name: string;
  description: string;
  default_url: string;
  default_key: string;
  default_model: string;
  knowledge: string[];
  rule: string[];
  role: GroundRole[];
  round: unknown[];
  simulation: Simulation;
  workflow: Workflow;
  createdAt: string;
  updatedAt: string;
}

interface GroundsStore {
  grounds: GroundData[];
}

const generateId = () => `ground-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

const emptyGround = (): GroundData => ({
  id: generateId(),
  name: '新工作空间',
  description: '',
  default_url: '',
  default_key: '',
  default_model: 'deepseek-reasoner',
  knowledge: [],
  rule: [],
  role: [],
  round: [],
  simulation: {
    batch_size: 10,
    current_batch_index: 0,
    max_round_history: 50,
    mode: 'auto',
    round_goal: ''
  },
  workflow: {
    pending_plan: null,
    pending_judgement: null
  },
  createdAt: new Date().toISOString().split('T')[0],
  updatedAt: new Date().toISOString().split('T')[0]
});

export default function Page() {
  const [grounds, setGrounds] = useState<GroundData[]>([]);
  const [availableRoles, setAvailableRoles] = useState<GroundRole[]>([]);
  const [availableRules, setAvailableRules] = useState<Rule[]>([]);
  const [availableKnowledges, setAvailableKnowledges] = useState<Knowledge[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editGround, setEditGround] = useState<GroundData>(emptyGround());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showRuleSelector, setShowRuleSelector] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showKnowledgeSelector, setShowKnowledgeSelector] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetch('/api/data/grounds')
      .then(res => res.json())
      .then((data: GroundsStore) => {
        setGrounds(data.grounds || []);
        if ((data.grounds || []).length > 0) {
          setSelectedIndex(0);
          setEditGround(data.grounds[0]);
        }
      })
      .catch(() => setGrounds([]));

    fetch('/api/data/roles')
      .then(res => res.json())
      .then((data: { roles: GroundRole[] }) => {
        setAvailableRoles(data.roles || []);
      })
      .catch(() => setAvailableRoles([]));

    fetch('/api/data/rules')
      .then(res => res.json())
      .then((data: { rules: Rule[] }) => {
        setAvailableRules(data.rules || []);
      })
      .catch(() => setAvailableRules([]));

    fetch('/api/data/knowledges')
      .then(res => res.json())
      .then((data: { knowledges: Knowledge[] }) => {
        setAvailableKnowledges(data.knowledges || []);
      })
      .catch(() => setAvailableKnowledges([]));
  }, []);

  const saveGrounds = useCallback(async (groundsToSave: GroundData[]) => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/data/grounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grounds: groundsToSave })
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

  const scheduleAutoSave = useCallback((updatedGround: GroundData) => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    autoSaveTimer.current = setTimeout(() => {
      if (selectedIndex !== null) {
        const updatedGrounds = [...grounds];
        updatedGrounds[selectedIndex] = { ...updatedGround, updatedAt: new Date().toISOString().split('T')[0] };
        saveGrounds(updatedGrounds);
      }
    }, 1500);
  }, [grounds, selectedIndex, saveGrounds]);

  const handleFieldChange = (field: keyof GroundData, value: string | number | string[]) => {
    if (selectedIndex === null) return;
    const updated = { ...editGround, [field]: value };
    setEditGround(updated);
    scheduleAutoSave(updated);
  };

  const handleAddGround = () => {
    const newGround = emptyGround();
    const updatedGrounds = [...grounds, newGround];
    setGrounds(updatedGrounds);
    setSelectedIndex(updatedGrounds.length - 1);
    setEditGround(newGround);
    saveGrounds(updatedGrounds);
  };

  const handleImportRole = (role: GroundRole) => {
    if (editGround.role.some(r => r.id === role.id)) {
      alert('该角色已存在于工作空间中');
      return;
    }
    const newRole = { ...role, id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` };
    const updated = { ...editGround, role: [...editGround.role, newRole] };
    setEditGround(updated);
    scheduleAutoSave(updated);
    setShowRoleSelector(false);
  };

  const handleRemoveRole = (index: number) => {
    const newRoles = editGround.role.filter((_, i) => i !== index);
    const updated = { ...editGround, role: newRoles };
    setEditGround(updated);
    scheduleAutoSave(updated);
  };

  const handleAddRule = (rule: Rule) => {
    if (editGround.rule.includes(rule.id)) {
      alert('该规则已添加到工作空间中');
      return;
    }
    const updated = { ...editGround, rule: [...editGround.rule, rule.id] };
    setEditGround(updated);
    scheduleAutoSave(updated);
  };

  const handleRemoveRule = (ruleId: string) => {
    const newRules = editGround.rule.filter(id => id !== ruleId);
    const updated = { ...editGround, rule: newRules };
    setEditGround(updated);
    scheduleAutoSave(updated);
  };

  const handleAddKnowledge = (knowledge: Knowledge) => {
    if (editGround.knowledge.includes(knowledge.id)) {
      alert('该知识已添加到工作空间中');
      return;
    }
    const updated = { ...editGround, knowledge: [...editGround.knowledge, knowledge.id] };
    setEditGround(updated);
    scheduleAutoSave(updated);
  };

  const handleRemoveKnowledge = (knowledgeId: string) => {
    const newKnowledges = editGround.knowledge.filter(id => id !== knowledgeId);
    const updated = { ...editGround, knowledge: newKnowledges };
    setEditGround(updated);
    scheduleAutoSave(updated);
  };

  const handleDeleteGround = (index: number) => {
    if (!confirm('确定删除这个工作空间？')) return;
    const updatedGrounds = grounds.filter((_, i) => i !== index);
    setGrounds(updatedGrounds);
    if (updatedGrounds.length === 0) {
      setSelectedIndex(null);
      setEditGround(emptyGround());
    } else if (selectedIndex === index) {
      setSelectedIndex(0);
      setEditGround(updatedGrounds[0]);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
    saveGrounds(updatedGrounds);
  };

  const handleManualSave = () => {
    if (selectedIndex === null) return;
    const updatedGrounds = [...grounds];
    updatedGrounds[selectedIndex] = { ...editGround, updatedAt: new Date().toISOString().split('T')[0] };
    saveGrounds(updatedGrounds);
  };

  const handleSelectGround = (index: number) => {
    if (selectedIndex !== null && grounds[selectedIndex]) {
      const updatedGrounds = [...grounds];
      updatedGrounds[selectedIndex] = editGround;
      setGrounds(updatedGrounds);
    }
    setSelectedIndex(index);
    setEditGround(grounds[index]);
  };

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (selectedIndex !== null && editGround) {
      const updatedGrounds = [...grounds];
      updatedGrounds[selectedIndex] = editGround;
      setGrounds(updatedGrounds);
    }
  }, [editGround]);

  const getRuleById = (id: string) => availableRules.find(r => r.id === id);
  const getKnowledgeById = (id: string) => availableKnowledges.find(k => k.id === id);

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
              background: 'linear-gradient(90deg, #ff6b9d, #c44cff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              工作空间
            </h1>
            <button
              onClick={handleAddGround}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ff6b9d, #c44cff)',
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

          <div style={{
            padding: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(107, 157, 255, 0.05)'
          }}>
            <button
              onClick={() => setShowKnowledgeSelector(true)}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'rgba(107, 157, 255, 0.15)',
                border: '1px solid rgba(107, 157, 255, 0.3)',
                borderRadius: '8px',
                color: '#6b9dff',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>添加知识</span>
              <span style={{ fontSize: '14px' }}>+</span>
            </button>
          </div>

          <div style={{
            padding: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(107, 255, 184, 0.05)'
          }}>
            <button
              onClick={() => setShowRuleSelector(true)}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'rgba(107, 255, 184, 0.15)',
                border: '1px solid rgba(107, 255, 184, 0.3)',
                borderRadius: '8px',
                color: '#6bffb8',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>添加规则</span>
              <span style={{ fontSize: '14px' }}>+</span>
            </button>
          </div>

          <div style={{
            padding: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(196, 76, 255, 0.05)'
          }}>
            <button
              onClick={() => setShowRoleSelector(true)}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'rgba(196, 76, 255, 0.15)',
                border: '1px solid rgba(196, 76, 255, 0.3)',
                borderRadius: '8px',
                color: '#c44cff',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>添加角色</span>
              <span style={{ fontSize: '14px' }}>+</span>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {grounds.map((ground, index) => (
              <div
                key={index}
                onClick={() => handleSelectGround(index)}
                style={{
                  padding: '12px 16px',
                  marginBottom: '4px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: selectedIndex === index
                    ? 'rgba(196, 76, 255, 0.15)'
                    : 'transparent',
                  border: selectedIndex === index
                    ? '1px solid rgba(196, 76, 255, 0.4)'
                    : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: selectedIndex === index ? '#c44cff' : '#d0d0d0',
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {ground.name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {ground.role?.length || 0} 角色 | {ground.rule?.length || 0} 规则 | {ground.knowledge?.length || 0} 知识
                </div>
              </div>
            ))}
            {grounds.length === 0 && (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#666',
                fontSize: '13px'
              }}>
                暂无工作空间<br />点击 + 创建
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
                value={editGround.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="工作空间名称"
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
                  onClick={() => handleDeleteGround(selectedIndex)}
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
                    ? 'linear-gradient(135deg, #ff6b9d, #c44cff)'
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <FieldGroup label="默认模型 (default_model)">
                <select
                  value={editGround.default_model}
                  onChange={(e) => handleFieldChange('default_model', e.target.value)}
                  style={inputStyle}
                >
                  <option value="deepseek-reasoner">deepseek-reasoner</option>
                  <option value="deepseek-chat">deepseek-chat</option>
                  <option value="gpt-4">gpt-4</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                </select>
              </FieldGroup>
              <FieldGroup label="描述 (description)">
                <input
                  value={editGround.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="描述..."
                  style={inputStyle}
                />
              </FieldGroup>
            </div>

            <FieldGroup label="默认 API 地址 (default_url)">
              <input
                value={editGround.default_url}
                onChange={(e) => handleFieldChange('default_url', e.target.value)}
                placeholder="https://api.deepseek.com/"
                style={inputStyle}
              />
            </FieldGroup>

            <FieldGroup label="默认 API 密钥 (default_key)">
              <input
                value={editGround.default_key}
                onChange={(e) => handleFieldChange('default_key', e.target.value)}
                placeholder="sk-..."
                type="password"
                style={inputStyle}
              />
            </FieldGroup>

            <FieldGroup label={`知识库 (knowledge) - ${editGround.knowledge?.length || 0} 个`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {editGround.knowledge?.map((knowledgeId) => {
                  const knowledge = getKnowledgeById(knowledgeId);
                  return (
                    <div
                      key={knowledgeId}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(107, 157, 255, 0.08)',
                        border: '1px solid rgba(107, 157, 255, 0.2)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#d0d0d0', marginBottom: '2px' }}>
                          {knowledge?.title || knowledgeId}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {knowledge?.category || '未分类'} | {knowledge?.tags.length || 0} 标签
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveKnowledge(knowledgeId)}
                        style={{
                          padding: '6px 10px',
                          background: 'rgba(255,80,80,0.1)',
                          border: '1px solid rgba(255,80,80,0.3)',
                          borderRadius: '6px',
                          color: '#ff6b6b',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        移除
                      </button>
                    </div>
                  );
                })}
                {(!editGround.knowledge || editGround.knowledge.length === 0) && (
                  <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '13px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '10px',
                    border: '1px dashed rgba(255,255,255,0.1)'
                  }}>
                    暂无知识<br />点击左侧"添加知识"按钮添加
                  </div>
                )}
              </div>
            </FieldGroup>

            <FieldGroup label={`规则 (rule) - ${editGround.rule?.length || 0} 个`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {editGround.rule?.map((ruleId) => {
                  const rule = getRuleById(ruleId);
                  return (
                    <div
                      key={ruleId}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(107, 255, 184, 0.08)',
                        border: '1px solid rgba(107, 255, 184, 0.2)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#d0d0d0', marginBottom: '2px' }}>
                          {rule?.name || ruleId}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {rule?.description || '无描述'} | 优先级: {rule?.priority || 100}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveRule(ruleId)}
                        style={{
                          padding: '6px 10px',
                          background: 'rgba(255,80,80,0.1)',
                          border: '1px solid rgba(255,80,80,0.3)',
                          borderRadius: '6px',
                          color: '#ff6b6b',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        移除
                      </button>
                    </div>
                  );
                })}
                {(!editGround.rule || editGround.rule.length === 0) && (
                  <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '13px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '10px',
                    border: '1px dashed rgba(255,255,255,0.1)'
                  }}>
                    暂无规则<br />点击左侧"添加规则"按钮添加
                  </div>
                )}
              </div>
            </FieldGroup>

            <FieldGroup label={`角色 (role) - ${editGround.role?.length || 0} 个`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {editGround.role?.map((role, index) => (
                  <div
                    key={role.id}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(196, 76, 255, 0.08)',
                      border: '1px solid rgba(196, 76, 255, 0.2)',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#d0d0d0', marginBottom: '2px' }}>
                        {role.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {role.model} | {role.status}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveRole(index)}
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(255,80,80,0.1)',
                        border: '1px solid rgba(255,80,80,0.3)',
                        borderRadius: '6px',
                        color: '#ff6b6b',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      移除
                    </button>
                  </div>
                ))}
                {(!editGround.role || editGround.role.length === 0) && (
                  <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '13px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '10px',
                    border: '1px dashed rgba(255,255,255,0.1)'
                  }}>
                    暂无角色<br />点击左侧"添加角色"按钮添加
                  </div>
                )}
              </div>
            </FieldGroup>

            <div style={{
              padding: '20px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.05)',
              marginTop: '24px'
            }}>
              <h3 style={{
                fontSize: '12px',
                color: '#888',
                marginBottom: '16px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                模拟设置 (simulation)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <FieldGroup label="批次大小">
                  <input
                    type="number"
                    value={editGround.simulation.batch_size}
                    disabled
                    style={{ ...inputStyle, opacity: 0.5 }}
                  />
                </FieldGroup>
                <FieldGroup label="当前批次">
                  <input
                    type="number"
                    value={editGround.simulation.current_batch_index}
                    disabled
                    style={{ ...inputStyle, opacity: 0.5 }}
                  />
                </FieldGroup>
                <FieldGroup label="最大回合历史">
                  <input
                    type="number"
                    value={editGround.simulation.max_round_history}
                    disabled
                    style={{ ...inputStyle, opacity: 0.5 }}
                  />
                </FieldGroup>
                <FieldGroup label="模式">
                  <select
                    value={editGround.simulation.mode}
                    disabled
                    style={{ ...inputStyle, opacity: 0.5 }}
                  >
                    <option value="auto">auto</option>
                    <option value="manual">manual</option>
                  </select>
                </FieldGroup>
              </div>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '10px',
              fontSize: '12px',
              color: '#666'
            }}>
              <div>创建时间: {editGround.createdAt}</div>
              <div>更新时间: {editGround.updatedAt}</div>
            </div>
          </div>
        </main>
      </div>

      {showKnowledgeSelector && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowKnowledgeSelector(false)}>
          <div 
            style={{
              width: '600px',
              maxHeight: '70vh',
              background: '#1a1a2e',
              borderRadius: '16px',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#6b9dff' }}>选择知识</h2>
              <button
                onClick={() => setShowKnowledgeSelector(false)}
                style={{
                  width: '28px',
                  height: '28px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto', maxHeight: 'calc(70vh - 80px)' }}>
              {availableKnowledges.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                  暂无知识，请先在知识库管理中创建
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {availableKnowledges.map((knowledge) => (
                    <div
                      key={knowledge.id}
                      style={{
                        padding: '14px 16px',
                        background: editGround.knowledge.includes(knowledge.id)
                          ? 'rgba(107, 157, 255, 0.15)'
                          : 'rgba(255,255,255,0.03)',
                        border: editGround.knowledge.includes(knowledge.id)
                          ? '1px solid rgba(107, 157, 255, 0.3)'
                          : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#d0d0d0' }}>
                          {knowledge.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {knowledge.category || '未分类'} | {knowledge.tags.length} 标签
                        </div>
                      </div>
                      {editGround.knowledge.includes(knowledge.id) ? (
                        <span style={{ fontSize: '12px', color: '#6b9dff', padding: '4px 12px', background: 'rgba(107, 157, 255, 0.15)', borderRadius: '12px' }}>
                          已添加
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddKnowledge(knowledge)}
                          style={{
                            padding: '6px 14px',
                            background: 'rgba(107, 157, 255, 0.15)',
                            border: '1px solid rgba(107, 157, 255, 0.3)',
                            borderRadius: '8px',
                            color: '#6b9dff',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          添加
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRuleSelector && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowRuleSelector(false)}>
          <div 
            style={{
              width: '600px',
              maxHeight: '70vh',
              background: '#1a1a2e',
              borderRadius: '16px',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#6bffb8' }}>选择规则</h2>
              <button
                onClick={() => setShowRuleSelector(false)}
                style={{
                  width: '28px',
                  height: '28px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto', maxHeight: 'calc(70vh - 80px)' }}>
              {availableRules.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                  暂无规则，请先在规则管理中创建
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {availableRules.map((rule) => (
                    <div
                      key={rule.id}
                      style={{
                        padding: '14px 16px',
                        background: editGround.rule.includes(rule.id)
                          ? 'rgba(107, 255, 184, 0.15)'
                          : 'rgba(255,255,255,0.03)',
                        border: editGround.rule.includes(rule.id)
                          ? '1px solid rgba(107, 255, 184, 0.3)'
                          : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#d0d0d0' }}>
                          {rule.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {rule.description || '无描述'} | 优先级: {rule.priority}
                        </div>
                      </div>
                      {editGround.rule.includes(rule.id) ? (
                        <span style={{ fontSize: '12px', color: '#6bffb8', padding: '4px 12px', background: 'rgba(107, 255, 184, 0.15)', borderRadius: '12px' }}>
                          已添加
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddRule(rule)}
                          style={{
                            padding: '6px 14px',
                            background: 'rgba(107, 255, 184, 0.15)',
                            border: '1px solid rgba(107, 255, 184, 0.3)',
                            borderRadius: '8px',
                            color: '#6bffb8',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          添加
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRoleSelector && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowRoleSelector(false)}>
          <div 
            style={{
              width: '600px',
              maxHeight: '70vh',
              background: '#1a1a2e',
              borderRadius: '16px',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#c44cff' }}>选择角色</h2>
              <button
                onClick={() => setShowRoleSelector(false)}
                style={{
                  width: '28px',
                  height: '28px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto', maxHeight: 'calc(70vh - 80px)' }}>
              {availableRoles.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                  暂无角色，请先在角色管理中创建
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {availableRoles.map((role) => {
                    const isAdded = editGround.role.some(r => r.id === role.id);
                    return (
                      <div
                        key={role.id}
                        style={{
                          padding: '14px 16px',
                          background: isAdded
                            ? 'rgba(196, 76, 255, 0.15)'
                            : 'rgba(255,255,255,0.03)',
                          border: isAdded
                            ? '1px solid rgba(196, 76, 255, 0.3)'
                            : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#d0d0d0' }}>
                            {role.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            {role.model} | {role.status}
                          </div>
                        </div>
                        {isAdded ? (
                          <span style={{ fontSize: '12px', color: '#c44cff', padding: '4px 12px', background: 'rgba(196, 76, 255, 0.15)', borderRadius: '12px' }}>
                            已添加
                          </span>
                        ) : (
                          <button
                            onClick={() => handleImportRole(role)}
                            style={{
                              padding: '6px 14px',
                              background: 'rgba(196, 76, 255, 0.15)',
                              border: '1px solid rgba(196, 76, 255, 0.3)',
                              borderRadius: '8px',
                              color: '#c44cff',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            添加
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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