'use client';

import { useState } from 'react';

type CopyStatus = 'idle' | 'copied' | 'error';
type TranslateStatus = 'idle' | 'translating' | 'success' | 'error';

function restoreOriginalKeys(original: unknown, translated: unknown): unknown {
  if (typeof original !== typeof translated) {
    return translated;
  }
  
  if (typeof original === 'string' || typeof original === 'number' || 
      typeof original === 'boolean' || original === null) {
    return translated;
  }

  if (Array.isArray(original)) {
    const arr = translated as unknown[];
    return original.map((_, index) => restoreOriginalKeys(original[index], arr[index]));
  }

  if (typeof original === 'object' && typeof translated === 'object' && translated !== null) {
    const result: Record<string, unknown> = {};
    const originalEntries = Object.entries(original as Record<string, unknown>);
    const translatedObj = translated as Record<string, unknown>;
    const translatedKeys = Object.keys(translatedObj);
    
    originalEntries.forEach(([originalKey, originalValue], index) => {
      const translatedValue = translatedKeys[index] !== undefined ? translatedObj[translatedKeys[index]] : originalValue;
      result[originalKey] = restoreOriginalKeys(originalValue, translatedValue);
    });
    
    return result;
  }

  return translated;
}

export default function E2CPage() {
  const [inputJson, setInputJson] = useState('');
  const [outputJson, setOutputJson] = useState('');
  const [originalFormatted, setOriginalFormatted] = useState('');
  const [translatedFormatted, setTranslatedFormatted] = useState('');
  const [copyStatus, setCopyStatus] = useState<{ original: CopyStatus; translated: CopyStatus }>({
    original: 'idle',
    translated: 'idle',
  });
  const [translateStatus, setTranslateStatus] = useState<TranslateStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fromLang, setFromLang] = useState('en');
  const [toLang, setToLang] = useState('zh');

  const langOptions = [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'es', label: 'Español' },
    { value: 'ru', label: 'Русский' },
    { value: 'ar', label: 'العربية' },
  ];

  const handleTranslate = async () => {
    setErrorMessage('');
    setTranslateStatus('translating');

    try {
      const parsed = JSON.parse(inputJson);
      const originalStr = JSON.stringify(parsed, null, 2);
      setOriginalFormatted(originalStr);

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputJson, from: fromLang, to: toLang }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const data = await response.json();
      
      const translatedParsed = JSON.parse(data.translatedText);
      const restored = restoreOriginalKeys(parsed, translatedParsed);
      
      const translatedStr = JSON.stringify(restored, null, 2);
      setOutputJson(translatedStr);
      setTranslatedFormatted(translatedStr);
      setTranslateStatus('success');
    } catch (error) {
      setTranslateStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Invalid JSON or translation failed');
    }
  };

  const handleCopy = async (type: 'original' | 'translated') => {
    try {
      const textToCopy = type === 'original' ? originalFormatted : outputJson;
      if (!textToCopy) return;
      await navigator.clipboard.writeText(textToCopy);
      setCopyStatus(prev => ({ ...prev, [type]: 'copied' }));
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [type]: 'idle' }));
      }, 2000);
    } catch {
      setCopyStatus(prev => ({ ...prev, [type]: 'error' }));
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [type]: 'idle' }));
      }, 2000);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(inputJson);
      setInputJson(JSON.stringify(parsed, null, 2));
    } catch {
      setErrorMessage('Invalid JSON');
    }
  };

  const handleClear = () => {
    setInputJson('');
    setOutputJson('');
    setOriginalFormatted('');
    setTranslatedFormatted('');
    setErrorMessage('');
    setTranslateStatus('idle');
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
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '600',
              background: 'linear-gradient(90deg, #6b9dff, #9d4edd)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px'
            }}>
              JSON 翻译工具
            </h1>
            <p style={{ color: '#888', fontSize: '14px' }}>
              将 JSON 数据的 value 翻译成中文，保留原始 key
            </p>
          </div>
          <button
            onClick={handleClear}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#e0e0e0',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.3s'
            }}
          >
            清空
          </button>
        </header>

        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <select
            value={fromLang}
            onChange={(e) => setFromLang(e.target.value)}
            style={{
              padding: '10px 32px 10px 16px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#e0e0e0',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '120px',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              backgroundSize: '16px'
            }}
          >
            {langOptions.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          <span style={{ fontSize: '20px', color: '#666' }}>→</span>

          <select
            value={toLang}
            onChange={(e) => setToLang(e.target.value)}
            style={{
              padding: '10px 32px 10px 16px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#e0e0e0',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '120px',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              backgroundSize: '16px'
            }}
          >
            {langOptions.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleTranslate}
            disabled={!inputJson.trim() || translateStatus === 'translating'}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #6b9dff, #9d4edd)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: inputJson.trim() && translateStatus !== 'translating' ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s',
              opacity: inputJson.trim() && translateStatus !== 'translating' ? 1 : 0.5
            }}
          >
            {translateStatus === 'translating' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #fff',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}></span>
                翻译中...
              </span>
            ) : (
              '开始翻译'
            )}
          </button>

          <button
            onClick={handleFormat}
            disabled={!inputJson.trim()}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#e0e0e0',
              cursor: inputJson.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              transition: 'all 0.3s',
              opacity: inputJson.trim() ? 1 : 0.5
            }}
          >
            格式化 JSON
          </button>
        </div>

        {errorMessage && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(255, 100, 100, 0.1)',
            border: '1px solid rgba(255, 100, 100, 0.3)',
            borderRadius: '8px',
            color: '#ff6464',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {errorMessage}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#aaa' }}>
                原始 JSON
              </span>
              <button
                onClick={() => handleCopy('original')}
                disabled={!originalFormatted}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#e0e0e0',
                  cursor: originalFormatted ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  transition: 'all 0.3s',
                  opacity: originalFormatted ? 1 : 0.5
                }}
              >
                {copyStatus.original === 'copied' ? '已复制!' : copyStatus.original === 'error' ? '复制失败' : '复制'}
              </button>
            </div>
            <textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              placeholder='请输入 JSON 数据...'
              style={{
                width: '100%',
                minHeight: '400px',
                padding: '16px',
                background: 'transparent',
                border: 'none',
                color: '#e0e0e0',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '12px 16px',
              background: 'rgba(107, 157, 255, 0.1)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b9dff' }}>
                翻译结果
              </span>
              <button
                onClick={() => handleCopy('translated')}
                disabled={!outputJson}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(107, 157, 255, 0.2)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#6b9dff',
                  cursor: outputJson ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  transition: 'all 0.3s',
                  opacity: outputJson ? 1 : 0.5
                }}
              >
                {copyStatus.translated === 'copied' ? '已复制!' : copyStatus.translated === 'error' ? '复制失败' : '复制'}
              </button>
            </div>
            <textarea
              value={outputJson}
              readOnly
              placeholder='翻译结果将显示在这里...'
              style={{
                width: '100%',
                minHeight: '400px',
                padding: '16px',
                background: 'transparent',
                border: 'none',
                color: '#e0e0e0',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#888'
        }}>
          <strong style={{ color: '#aaa' }}>使用说明：</strong>
          <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
            <li>输入有效的 JSON 格式数据</li>
            <li>选择源语言和目标语言</li>
            <li>点击「开始翻译」按钮</li>
            <li>翻译结果将只翻译 value，保留原始 key</li>
          </ul>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}