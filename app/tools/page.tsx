'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GroundRole {
  id: string;
  name: string;
  model: string;
  status: string;
  enabled: boolean;
}

interface Simulation {
  batch_size: number;
  mode: string;
}

interface GroundData {
  id: string;
  name: string;
  description: string;
  default_model: string;
  knowledge: string[];
  rule: string[];
  role: GroundRole[];
  simulation: Simulation;
  createdAt: string;
  updatedAt: string;
}

interface GroundsStore {
  grounds: GroundData[];
}

const toolList = [
  { path: '/tools/edit', name: '角色卡片', desc: '编辑角色卡片', color: '#c44cff', bg: 'rgba(196, 76, 255, 0.1)' },
  { path: '/tools/ec', name: '角色卡管理', desc: '管理角色卡片', color: '#ff6b9d', bg: 'rgba(255, 107, 157, 0.1)' },
  { path: '/tools/er', name: '角色编辑', desc: '编辑角色配置', color: '#c44cff', bg: 'rgba(196, 76, 255, 0.1)' },
  { path: '/tools/el', name: 'Lorebook', desc: '编辑Lorebook', color: '#6bffb8', bg: 'rgba(107, 255, 184, 0.1)' },
  { path: '/tools/eg', name: '工作空间', desc: '管理工作空间', color: '#6b9dff', bg: 'rgba(107, 157, 255, 0.1)' },
  { path: '/tools/eu', name: '规则管理', desc: '管理规则', color: '#6bffb8', bg: 'rgba(107, 255, 184, 0.1)' },
  { path: '/tools/ek', name: '知识库', desc: '管理知识库', color: '#6b9dff', bg: 'rgba(107, 157, 255, 0.1)' },
  { path: '/tools/r2x', name: '数据映射', desc: 'JSON数据映射工具', color: '#ffb86b', bg: 'rgba(255, 184, 107, 0.1)' },
];

export default function ToolsIndex() {
  const [grounds, setGrounds] = useState<GroundData[]>([]);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [selectedGround, setSelectedGround] = useState<GroundData | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/data/grounds')
      .then(res => res.json())
      .then((data: GroundsStore) => {
        setGrounds(data.grounds || []);
        if ((data.grounds || []).length > 0) {
          setSelectedGround(data.grounds[0]);
        }
      })
      .catch(() => setGrounds([]));
  }, []);

  const handleCopyGrounds = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(grounds, null, 2));
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleCopyGround = async (ground: GroundData) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(ground, null, 2));
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
      fontFamily: '"SF Mono", "Fira Code", "JetBrains Mono", monospace',
      color: '#e0e0e0',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <header style={{
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              background: 'linear-gradient(90deg, #ff6b9d, #c44cff, #6b9dff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px'
            }}>
              工具中心
            </h1>
            <p style={{ fontSize: '14px', color: '#888' }}>
              数据管理工具集
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleCopyGrounds}
              style={{
                padding: '10px 20px',
                background: copyStatus === 'copied' ? 'rgba(107, 255, 184, 0.2)' : 'rgba(107, 157, 255, 0.15)',
                border: '1px solid rgba(107, 157, 255, 0.3)',
                borderRadius: '10px',
                color: copyStatus === 'copied' ? '#6bffb8' : '#6b9dff',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {copyStatus === 'copied' ? '✓ 已复制' : '复制所有工作空间'}
            </button>
          </div>
        </header>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#888',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            工作空间 ({grounds.length})
          </h2>

          {grounds.length === 0 ? (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
              <div style={{ color: '#666', fontSize: '14px' }}>暂无工作空间</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
              {grounds.map((ground, index) => (
                <div
                  key={ground.id}
                  onClick={() => setSelectedGround(ground)}
                  style={{
                    padding: '20px',
                    background: selectedGround?.id === ground.id
                      ? 'rgba(107, 157, 255, 0.12)'
                      : 'rgba(255,255,255,0.02)',
                    border: selectedGround?.id === ground.id
                      ? '1px solid rgba(107, 157, 255, 0.4)'
                      : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#fff',
                        marginBottom: '4px'
                      }}>
                        {ground.name}
                      </h3>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {ground.default_model} | {ground.simulation.mode}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyGround(ground);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(107, 157, 255, 0.1)',
                        border: '1px solid rgba(107, 157, 255, 0.2)',
                        borderRadius: '6px',
                        color: '#6b9dff',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      复制
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                    <span style={{ color: '#c44cff' }}>
                      📦 {ground.role?.length || 0} 角色
                    </span>
                    <span style={{ color: '#6bffb8' }}>
                      📋 {ground.rule?.length || 0} 规则
                    </span>
                    <span style={{ color: '#6b9dff' }}>
                      📚 {ground.knowledge?.length || 0} 知识
                    </span>
                  </div>

                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '11px',
                    color: '#555',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>创建: {ground.createdAt}</span>
                    <span>更新: {ground.updatedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedGround && (
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#888',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              选中的工作空间详情
            </h2>
            <div style={{
              padding: '24px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <pre style={{
                fontSize: '12px',
                color: '#888',
                overflow: 'auto',
                maxHeight: '400px',
                whiteSpace: 'pre-wrap'
              }}>
                {JSON.stringify(selectedGround, null, 2)}
              </pre>
            </div>
          </section>
        )}

        <section>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#888',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            工具导航
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {toolList.map((tool) => (
              <button
                key={tool.path}
                onClick={() => router.push(tool.path)}
                style={{
                  padding: '20px',
                  background: tool.bg,
                  border: `1px solid ${tool.color}30`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${tool.color}60`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${tool.color}30`;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: tool.color,
                  marginBottom: '6px'
                }}>
                  {tool.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#888'
                }}>
                  {tool.desc}
                </div>
              </button>
            ))}
          </div>
        </section>
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