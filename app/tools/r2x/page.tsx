'use client';

import { useState, useCallback } from 'react';

interface RoleDemo {
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

interface CardDemo {
  spec: string;
  spec_version: string;
  data: {
    name: string;
    description: string;
    tags: string[];
    creator: string;
    character_version: string;
    mes_example: string;
    extensions: Record<string, unknown>;
    system_prompt: string;
    post_history_instructions: string;
    first_mes: string;
    alternate_greetings: string[];
    personality: string;
    scenario: string;
    creator_notes: string;
    character_book: unknown;
    assets: unknown;
    nickname: unknown;
    creator_notes_multilingual: unknown;
    source: unknown;
    group_only_greetings: unknown[];
    creation_date: unknown;
    modification_date: unknown;
    avatar: string;
  };
}

function extractKnowledgePrivate(card: CardDemo): string[] {
  const facts: string[] = [];
  const d = card.data;

  if (d.name) facts.push(`角色名: ${d.name}`);
  if (d.description) facts.push(`描述: ${d.description.split('\n')[0]}`);
  if (d.personality) facts.push(`性格: ${d.personality}`);
  if (d.scenario) facts.push(`场景: ${d.scenario}`);

  const physicalDesc = d.description.split('\n').filter(line =>
    line.match(/^(Cabello|ojos|Cuerpo|Vestimenta|Personalidad)/i)
  );
  physicalDesc.forEach(line => facts.push(line.trim()));

  return facts.filter(f => f.length > 0 && f.length < 500);
}

function buildSystemPrompt(card: CardDemo): string {
  const parts: string[] = [];
  const d = card.data;

  parts.push(`# 角色信息\n`);
  if (d.name) parts.push(`名称: ${d.name}\n`);
  if (d.description) parts.push(`\n## 描述\n${d.description}\n`);
  if (d.personality) parts.push(`\n## 性格\n${d.personality}\n`);
  if (d.scenario) parts.push(`\n## 场景\n${d.scenario}\n`);

  return parts.join('').trim();
}

function buildUsePrompt(card: CardDemo): string {
  const parts: string[] = [];
  const d = card.data;

  if (d.first_mes) parts.push(d.first_mes);
  if (d.alternate_greetings && d.alternate_greetings.length > 0) {
    parts.push('\n\n## 备用开场\n');
    d.alternate_greetings.forEach((g, i) => {
      parts.push(`${i + 1}. ${g}\n`);
    });
  }
  if (d.post_history_instructions) {
    parts.push(`\n\n## 后续指令\n${d.post_history_instructions}`);
  }

  return parts.join('').trim();
}

function transformToRole(card: CardDemo): RoleDemo {
  const id = `role-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  return {
    id,
    kind: 'role',
    name: card.data.name || '未命名角色',
    description: `${card.data.name || '角色'} - 由 ${card.data.creator || '未知'} 创建`,
    use_prompt: buildUsePrompt(card),
    system_prompt: buildSystemPrompt(card),
    canvas_position: { x: 166.5, y: 103 },
    url: 'https://api.deepseek.com/',
    key: '',
    model: 'deepseek-reasoner',
    temperature: 0.7,
    knowledge_private: extractKnowledgePrivate(card),
    knowledge_public: card.data.tags || [],
    blocked_role_names: [],
    unknown_role_names: [],
    inbox: [],
    redundancy: 0,
    status: 'active',
    enabled: true,
    last_think: '',
    last_error: ''
  };
}

export default function Page() {
  const [inputJson, setInputJson] = useState('');
  const [outputJson, setOutputJson] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'input' | 'output' | null>(null);

  const handleTransform = useCallback(() => {
    setError('');
    setOutputJson('');

    if (!inputJson.trim()) {
      setError('请先粘贴 JSON 数据');
      return;
    }

    try {
      const card: CardDemo = JSON.parse(inputJson);

      if (!card.data) {
        setError('无效的卡片数据格式，缺少 data 字段');
        return;
      }

      const role = transformToRole(card);
      setOutputJson(JSON.stringify(role, null, 2));
    } catch (e) {
      setError(`JSON 解析错误: ${e instanceof Error ? e.message : '未知错误'}`);
    }
  }, [inputJson]);

  const handleCopy = async (target: 'input' | 'output') => {
    const text = target === 'input' ? inputJson : outputJson;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(target);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleClear = () => {
    setInputJson('');
    setOutputJson('');
    setError('');
  };

  const handleSwap = () => {
    if (outputJson) {
      setInputJson(outputJson);
      setOutputJson('');
      setError('');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
      padding: '40px 20px',
      fontFamily: '"SF Mono", "Fira Code", "JetBrains Mono", monospace',
      color: '#e0e0e0'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <header style={{
          textAlign: 'center',
          marginBottom: '48px'
        }}>
          <h1 style={{
            fontSize: '42px',
            fontWeight: 800,
            background: 'linear-gradient(90deg, #ff6b9d, #c44cff, #6b9dff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '12px',
            letterSpacing: '-1px'
          }}>
            JSON 转换器
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>
            角色卡片 → 角色智能体格式转换
          </p>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '24px',
          alignItems: 'start'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#ff6b9d', boxShadow: '0 0 10px #ff6b9d'
                }} />
                <span style={{ fontWeight: 600, color: '#ff6b9d' }}>输入</span>
                <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                  carddemo.json
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleCopy('input')}
                  style={{
                    padding: '6px 12px',
                    background: copied === 'input' ? 'rgba(102,255,102,0.2)' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: copied === 'input' ? '#6f6' : '#888',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {copied === 'input' ? '✓ 已复制' : '复制'}
                </button>
                <button
                  onClick={handleClear}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#888',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  清空
                </button>
              </div>
            </div>
            <textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              placeholder="粘贴 carddemo.json 数据..."
              style={{
                width: '100%',
                minHeight: '500px',
                padding: '20px',
                background: 'transparent',
                border: 'none',
                color: '#d0d0d0',
                fontSize: '13px',
                lineHeight: '1.6',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '200px 0'
          }}>
            <button
              onClick={handleTransform}
              style={{
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #c44cff 0%, #6b9dff 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 20px rgba(196, 76, 255, 0.3)',
                letterSpacing: '0.5px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 25px rgba(196, 76, 255, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(196, 76, 255, 0.3)';
              }}
            >
              转换 →
            </button>

            {outputJson && (
              <button
                onClick={handleSwap}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#888',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#aaa';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.color = '#888';
                }}
              >
                ↩ 输出→输入
              </button>
            )}
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#6bffb8', boxShadow: '0 0 10px #6bffb8'
                }} />
                <span style={{ fontWeight: 600, color: '#6bffb8' }}>输出</span>
                <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                  roledemo.json
                </span>
              </div>
              <button
                onClick={() => handleCopy('output')}
                disabled={!outputJson}
                style={{
                  padding: '6px 12px',
                  background: copied === 'output'
                    ? 'rgba(102,255,102,0.2)'
                    : outputJson ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: copied === 'output' ? '#6f6' : outputJson ? '#888' : '#444',
                  fontSize: '12px',
                  cursor: outputJson ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                {copied === 'output' ? '✓ 已复制' : '复制'}
              </button>
            </div>
            <textarea
              value={outputJson}
              readOnly
              placeholder="转换后的 roledemo.json 数据将显示在这里..."
              style={{
                width: '100%',
                minHeight: '500px',
                padding: '20px',
                background: 'transparent',
                border: 'none',
                color: outputJson ? '#d0d0d0' : '#444',
                fontSize: '13px',
                lineHeight: '1.6',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: '24px',
            padding: '16px 20px',
            background: 'rgba(255, 80, 80, 0.1)',
            border: '1px solid rgba(255, 80, 80, 0.3)',
            borderRadius: '10px',
            color: '#ff6b6b',
            fontSize: '13px'
          }}>
            <strong>错误:</strong> {error}
          </div>
        )}

        <div style={{
          marginTop: '48px',
          padding: '24px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <h3 style={{
            fontSize: '14px',
            color: '#888',
            marginBottom: '16px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            字段映射说明
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <div style={{ color: '#ff6b9d', fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>
                system_prompt
              </div>
              <div style={{ color: '#666', fontSize: '12px', lineHeight: '1.6' }}>
                角色名 + 描述 + 性格 + 场景 + 创作者笔记
              </div>
            </div>
            <div>
              <div style={{ color: '#6bffb8', fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>
                use_prompt
              </div>
              <div style={{ color: '#666', fontSize: '12px', lineHeight: '1.6' }}>
                首次消息 + 备用开场 + 后续指令
              </div>
            </div>
            <div>
              <div style={{ color: '#6b9dff', fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>
                knowledge_private
              </div>
              <div style={{ color: '#666', fontSize: '12px', lineHeight: '1.6' }}>
                提取的描述片段、性格特点、场景信息
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
        textarea::placeholder {
          color: #444;
        }
      `}</style>
    </div>
  );
}