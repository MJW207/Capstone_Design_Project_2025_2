import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { motion } from 'motion/react';
import { presetManager, type FilterPreset } from '../../lib/presetManager';
import { toast } from 'sonner';

interface PIPresetSaveButtonProps {
  currentFilters: FilterPreset['filters'];
  onSaved?: () => void;
}

export function PIPresetSaveButton({ currentFilters, onSaved }: PIPresetSaveButtonProps) {
  const handleSave = () => {
    // 빈 필터 체크
    const hasActiveFilters = 
      (currentFilters.gender && currentFilters.gender.length > 0) ||
      (currentFilters.regions && currentFilters.regions.length > 0) ||
      (currentFilters.income && currentFilters.income.length > 0) ||
      (currentFilters.ageRange && (currentFilters.ageRange[0] > 15 || currentFilters.ageRange[1] < 80)) ||
      currentFilters.quickpollOnly === true;

    if (!hasActiveFilters) {
      toast.error('저장할 필터가 없습니다');
      return;
    }

    // 기본 이름 생성 (현재 시간 기반)
    const defaultName = `프리셋 ${new Date().toLocaleString('ko-KR', { 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;

    presetManager.addPreset(defaultName, currentFilters, '개인');
    toast.success('프리셋이 저장되었습니다');
    onSaved?.();
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleSave}
      className="btn btn--ghost"
      style={{
        padding: '8px 16px',
        borderRadius: '10px',
        border: '1px solid hsl(var(--border))',
        background: 'transparent',
        color: 'hsl(var(--foreground))',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'hsl(var(--hover-surface))';
        e.currentTarget.style.borderColor = 'hsl(var(--border-accent))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'hsl(var(--border))';
      }}
      title="현재 필터를 프리셋으로 저장"
    >
      <Save size={14} />
      프리셋 저장
    </motion.button>
  );
}
