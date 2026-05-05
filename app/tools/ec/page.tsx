'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CardData {
  name: string;
  description: string;
  tags: string[];
  system_prompt: string;
  post_history_instructions: string;
  first_mes: string;
  alternate_greetings: string[];
  personality: string;
  scenario: string;
  creator_notes: string;
}

interface Card {
  spec: string;
  spec_version: string;
  data: CardData;
}

interface CardsStore {
  cards: Card[];
}

const emptyCard = (): Card => ({
  spec: 'chara_card_v3',
  spec_version: '3.0',
  data: {
    name: '',
    description: '',
    tags: [],
    system_prompt: '',
    post_history_instructions: '',
    first_mes: '',
    alternate_greetings: [],
    personality: '',
    scenario: '',
    creator_notes: ''
  }
});

export default function Page() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editCard, setEditCard] = useState<Card>(emptyCard());
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetch('/api/data/cards')
      .then(res => res.json())
      .then((data: CardsStore) => {
        setCards(data.cards || []);
        if ((data.cards || []).length > 0) {
          setSelectedIndex(0);
          setEditCard(data.cards[0]);
        }
      })
      .catch(() => setCards([]));
  }, []);

  const saveCards = useCallback(async (cardsToSave: Card[]) => {
    setSaving(true);
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/data/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: cardsToSave })
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

  const scheduleAutoSave = useCallback((updatedCard: Card) => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    autoSaveTimer.current = setTimeout(() => {
      if (selectedIndex !== null) {
        const updatedCards = [...cards];
        updatedCards[selectedIndex] = updatedCard;
        saveCards(updatedCards);
      }
    }, 1500);
  }, [cards, selectedIndex, saveCards]);

  const handleFieldChange = (field: keyof CardData, value: string | string[]) => {
    if (selectedIndex === null) return;
    const updated = {
      ...editCard,
      data: { ...editCard.data, [field]: value }
    };
    setEditCard(updated);
    scheduleAutoSave(updated);
  };

  const handleAddCard = () => {
    const newCard = emptyCard();
    newCard.data.name = `新角色 ${cards.length + 1}`;
    const updatedCards = [...cards, newCard];
    setCards(updatedCards);
    setSelectedIndex(updatedCards.length - 1);
    setEditCard(newCard);
    saveCards(updatedCards);
  };

  const handleDeleteCard = (index: number) => {
    if (!confirm('确定删除这个角色卡？')) return;
    const updatedCards = cards.filter((_, i) => i !== index);
    setCards(updatedCards);
    if (updatedCards.length === 0) {
      setSelectedIndex(null);
      setEditCard(emptyCard());
    } else if (selectedIndex === index) {
      setSelectedIndex(0);
      setEditCard(updatedCards[0]);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
    saveCards(updatedCards);
  };

  const handleManualSave = () => {
    if (selectedIndex === null) return;
    const updatedCards = [...cards];
    updatedCards[selectedIndex] = editCard;
    saveCards(updatedCards);
  };

  const handleSelectCard = (index: number) => {
    if (selectedIndex !== null && cards[selectedIndex]) {
      const updatedCards = [...cards];
      updatedCards[selectedIndex] = editCard;
      setCards(updatedCards);
    }
    setSelectedIndex(index);
    setEditCard(cards[index]);
  };

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (selectedIndex !== null && editCard) {
      const updatedCards = [...cards];
      updatedCards[selectedIndex] = editCard;
      setCards(updatedCards);
    }
  }, [editCard]);

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
              角色卡片
            </h1>
            <button
              onClick={handleAddCard}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #c44cff, #6b9dff)',
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
            {cards.map((card, index) => (
              <div
                key={index}
                onClick={() => handleSelectCard(index)}
                style={{
                  padding: '12px 16px',
                  marginBottom: '4px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: selectedIndex === index
                    ? 'rgba(196, 76, 255, 0.2)'
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
                  {card.data.name || '未命名角色'}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {card.data.tags?.slice(0, 3).join(', ') || '无标签'}
                </div>
              </div>
            ))}
            {cards.length === 0 && (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#666',
                fontSize: '13px'
              }}>
                暂无角色卡片<br />点击 + 创建
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
                value={editCard.data.name}
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
                  onClick={() => handleDeleteCard(selectedIndex)}
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
                    ? 'linear-gradient(135deg, #c44cff, #6b9dff)'
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
                value={editCard.data.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="角色描述..."
                style={textareaStyle}
              />
            </FieldGroup>

            <FieldGroup label="性格 (personality)">
              <textarea
                value={editCard.data.personality}
                onChange={(e) => handleFieldChange('personality', e.target.value)}
                placeholder="角色性格..."
                style={textareaStyle}
              />
            </FieldGroup>

            <FieldGroup label="场景 (scenario)">
              <textarea
                value={editCard.data.scenario}
                onChange={(e) => handleFieldChange('scenario', e.target.value)}
                placeholder="角色场景..."
                style={textareaStyle}
              />
            </FieldGroup>

            <FieldGroup label="首次消息 (first_mes)">
              <textarea
                value={editCard.data.first_mes}
                onChange={(e) => handleFieldChange('first_mes', e.target.value)}
                placeholder="首次消息..."
                style={{ ...textareaStyle, minHeight: '200px' }}
              />
            </FieldGroup>

            <FieldGroup label="后续指令 (post_history_instructions)">
              <textarea
                value={editCard.data.post_history_instructions}
                onChange={(e) => handleFieldChange('post_history_instructions', e.target.value)}
                placeholder="后续指令..."
                style={textareaStyle}
              />
            </FieldGroup>

            <FieldGroup label="标签 (tags)">
              <TagEditor
                tags={editCard.data.tags}
                onChange={(tags) => handleFieldChange('tags', tags)}
              />
            </FieldGroup>

            <FieldGroup label="备用开场 (alternate_greetings)">
              <StringArrayEditor
                items={editCard.data.alternate_greetings}
                onChange={(items) => handleFieldChange('alternate_greetings', items)}
                placeholder="添加备用开场..."
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
    <div style={{ marginBottom: '24px' }}>
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

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const handleRemove = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
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
          placeholder="输入标签后回车添加"
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
            background: 'rgba(196, 76, 255, 0.2)',
            border: '1px solid rgba(196, 76, 255, 0.4)',
            borderRadius: '8px',
            color: '#c44cff',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          添加
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {tags.map((tag, i) => (
          <span
            key={i}
            style={{
              padding: '4px 10px',
              background: 'rgba(196, 76, 255, 0.15)',
              border: '1px solid rgba(196, 76, 255, 0.3)',
              borderRadius: '12px',
              color: '#c44cff',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {tag}
            <button
              onClick={() => handleRemove(tag)}
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