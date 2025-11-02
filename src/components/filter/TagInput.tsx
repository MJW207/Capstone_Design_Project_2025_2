import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  logic?: 'and' | 'or';
  onLogicChange?: (logic: 'and' | 'or') => void;
  isDark?: boolean;
}

export function TagInput({
  value,
  onChange,
  logic = 'and',
  onLogicChange,
  isDark = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue('');
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        {value.map((tag) => (
          <motion.span
            key={tag}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 600,
              background: isDark 
                ? 'rgba(124, 58, 237, 0.2)' 
                : 'rgba(37, 99, 235, 0.12)',
              color: isDark ? '#C4B5FD' : '#2563EB',
              border: isDark 
                ? '1px solid rgba(124, 58, 237, 0.3)' 
                : '1px solid rgba(37, 99, 235, 0.25)',
            }}
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              title="삭제"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'currentColor',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <X size={12} />
            </button>
          </motion.span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="태그 입력 (엔터 또는 쉼표)"
          style={{
            flex: 1,
            minWidth: '120px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: isDark 
              ? '2px solid rgba(255, 255, 255, 0.1)' 
              : '2px solid rgba(255, 255, 255, 0.4)',
            background: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px',
            color: isDark ? '#F9FAFB' : '#111827',
            outline: 'none',
            transition: 'border 120ms',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#2563EB'}
          onBlur={(e) => e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)'}
        />
      </div>
      {onLogicChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            fontSize: '12px', 
            fontWeight: 500, 
            color: isDark ? '#9CA3AF' : '#475569' 
          }}>
            조건:
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onLogicChange('and')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                background: logic === 'and'
                  ? 'linear-gradient(to right, #2563EB, #7C3AED)'
                  : isDark 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.7)',
                color: logic === 'and' ? 'white' : (isDark ? '#9CA3AF' : '#475569'),
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: logic === 'and' ? '0 4px 6px -1px rgba(37, 99, 235, 0.3)' : 'none',
              }}
            >
              AND
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onLogicChange('or')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                background: logic === 'or'
                  ? 'linear-gradient(to right, #2563EB, #7C3AED)'
                  : isDark 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.7)',
                color: logic === 'or' ? 'white' : (isDark ? '#9CA3AF' : '#475569'),
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: logic === 'or' ? '0 4px 6px -1px rgba(37, 99, 235, 0.3)' : 'none',
              }}
            >
              OR
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
