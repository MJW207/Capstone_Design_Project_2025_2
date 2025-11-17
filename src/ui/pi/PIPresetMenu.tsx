import { useState, useEffect } from 'react';
import { PIQuickMenuPopover } from './PIQuickMenuPopover';
import { PITextField } from './PITextField';
import { PIButton } from './PIButton';
import { Zap, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { presetManager, type FilterPreset } from '../../lib/presetManager';
interface PIPresetMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (preset: { filters: any; name: string }) => void;
  currentFilters?: any;
  onEdit?: (preset: FilterPreset) => void; // 프리셋 수정 요청 콜백
  anchorPosition?: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function PIPresetMenu({ isOpen, onClose, onApply, currentFilters = {}, onEdit, anchorPosition = 'center' }: PIPresetMenuProps) {
  const [newPresetName, setNewPresetName] = useState('');
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  
  // localStorage에서 프리셋 로드 (presetManager 사용)
  useEffect(() => {
    if (isOpen) {
      const loadedPresets = presetManager.loadPresets();
      setPresets(loadedPresets);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!newPresetName.trim()) {
      toast.error('프리셋 이름을 입력해주세요');
      return;
    }

    // 필터 형식 변환 (FilterDrawer 형식 -> presetManager 형식)
    const filtersForPreset = {
      gender: currentFilters.selectedGenders || [],
      regions: currentFilters.selectedRegions || [],
      income: currentFilters.selectedIncomes || [],
      ageRange: currentFilters.ageRange || [15, 80],
      quickpollOnly: currentFilters.quickpollOnly || false,
      interests: currentFilters.interests || '',
    };

    // 빈 필터 체크
    const hasActiveFilters = 
      (filtersForPreset.gender && filtersForPreset.gender.length > 0) ||
      (filtersForPreset.regions && filtersForPreset.regions.length > 0) ||
      (filtersForPreset.income && filtersForPreset.income.length > 0) ||
      (filtersForPreset.ageRange && (filtersForPreset.ageRange[0] > 15 || filtersForPreset.ageRange[1] < 80)) ||
      filtersForPreset.quickpollOnly === true;

    if (!hasActiveFilters) {
      toast.error('저장할 필터가 없습니다');
      return;
    }

    presetManager.addPreset(newPresetName, filtersForPreset, '개인');
    const loadedPresets = presetManager.loadPresets();
    setPresets(loadedPresets);
    setNewPresetName('');
    toast.success('프리셋이 저장되었습니다');
  };

  const handleApply = (preset: FilterPreset) => {
    // presetManager 형식 -> FilterDrawer 형식으로 변환
    const filtersForDrawer = {
      selectedGenders: preset.filters.gender || [],
      selectedRegions: preset.filters.regions || [],
      selectedIncomes: preset.filters.income || [],
      ageRange: preset.filters.ageRange || [15, 80],
      quickpollOnly: preset.filters.quickpollOnly || false,
      interests: Array.isArray(preset.filters.interests) 
        ? preset.filters.interests 
        : preset.filters.interests 
          ? [preset.filters.interests] 
          : [],
      interestLogic: preset.filters.interestLogic || 'and',
    };

    // 프리셋 적용하고 검색 실행 (검색페이지와 동일한 로직)
    onApply?.({
      filters: filtersForDrawer,
      name: preset.name,
    });
    onClose();
  };

  const handleDelete = (id: string) => {
    const preset = presets.find(p => p.id === id);
    if (preset && confirm(`프리셋 "${preset.name}"을 삭제하시겠습니까?`)) {
      presetManager.removePreset(id);
      const loadedPresets = presetManager.loadPresets();
      setPresets(loadedPresets);
      toast.success('프리셋이 삭제되었습니다');
    }
  };


  return (
    <>
      <PIQuickMenuPopover
        isOpen={isOpen}
        onClose={onClose}
        title="프리셋"
        anchorPosition={anchorPosition}
      >
      {/* Save current filter */}
      <div 
        className="flex items-center gap-2 p-3 rounded-lg"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div className="flex-1">
          <PITextField
            placeholder="현재 필터 이름"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
          />
        </div>
        <PIButton
          variant="secondary"
          size="small"
          onClick={handleSave}
          disabled={!newPresetName.trim()}
        >
          저장
        </PIButton>
      </div>

      {/* Preset List */}
      {presets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(37, 99, 235, 0.15)',
            }}
          >
            <Zap className="w-6 h-6" style={{ color: 'var(--brand-blue-300)' }} />
          </div>
          <div className="text-center">
            <p style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>
              저장된 프리셋이 없습니다.
            </p>
            <p style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)', marginTop: '4px' }}>
              현재 필터를 저장하여 빠르게 재사용하세요.
            </p>
          </div>
        </div>
      ) : (
        presets.map((preset) => (
          <div
            key={preset.id}
            className="flex items-center justify-between p-3 rounded-lg transition-colors"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-2)';
            }}
          >
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {preset.name}
              </div>
              <div 
                className="flex items-center gap-2 mt-1"
                style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}
              >
                <span>{new Date(preset.timestamp).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PIButton
                variant="ghost"
                size="small"
                onClick={() => handleApply(preset)}
              >
                적용
              </PIButton>
              <button
                onClick={() => {
                  if (onEdit) {
                    onClose();
                    onEdit(preset);
                  }
                }}
                className="btn--ghost w-8 h-8 flex items-center justify-center rounded-lg transition-fast"
                style={{ color: 'var(--muted-foreground)' }}
                title="수정"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(preset.id)}
                className="btn--ghost w-8 h-8 flex items-center justify-center rounded-lg transition-fast"
                style={{ color: 'var(--error-500)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </PIQuickMenuPopover>
    </>
  );
}
