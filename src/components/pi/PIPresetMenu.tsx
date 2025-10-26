import { useState } from 'react';
import { PIQuickMenuPopover } from './PIQuickMenuPopover';
import { PISegmentedControl } from './PISegmentedControl';
import { PITextField } from './PITextField';
import { PIButton } from './PIButton';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';

type PresetScope = '개인' | '팀';

interface Preset {
  id: string;
  name: string;
  scope: PresetScope;
  date: string;
  filters: any;
}

interface PIPresetMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (preset: Preset) => void;
  currentFilters?: any;
}

export function PIPresetMenu({ isOpen, onClose, onApply, currentFilters = {} }: PIPresetMenuProps) {
  const [scope, setScope] = useState<PresetScope>('개인');
  const [newPresetName, setNewPresetName] = useState('');
  const [presets, setPresets] = useState<Preset[]>([
    {
      id: '1',
      name: '빠른 설문 보유 패널',
      scope: '개인',
      date: '2025.10.10',
      filters: {
        ageRange: [20, 39],
        selectedRegions: ['서울', '경기'],
        selectedGenders: ['여성'],
        selectedIncomes: ['300~400', '400~600'],
        quickpollOnly: true,
      },
    },
    {
      id: '2',
      name: '20-30대 여성',
      scope: '팀',
      date: '2025.10.08',
      filters: {
        ageRange: [20, 30],
        selectedRegions: ['서울', '부산', '대구'],
        selectedGenders: ['여성'],
        selectedIncomes: ['200~300', '300~400'],
        quickpollOnly: false,
      },
    },
  ]);

  const handleSave = () => {
    if (!newPresetName.trim()) return;

    const newPreset: Preset = {
      id: Date.now().toString(),
      name: newPresetName,
      scope,
      date: new Date().toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).replace(/\. /g, '.').replace('.', ''),
      filters: currentFilters,
    };

    setPresets([newPreset, ...presets]);
    setNewPresetName('');
    toast.success('프리셋이 저장되었습니다');
  };

  const handleApply = (preset: Preset) => {
    onApply?.(preset);
    toast.success('프리셋 적용됨');
    onClose();
  };

  const handleDelete = (id: string) => {
    setPresets(presets.filter(p => p.id !== id));
    toast.success('프리셋이 삭제되었습니다');
  };

  const filteredPresets = presets.filter(p => p.scope === scope);

  return (
    <PIQuickMenuPopover
      isOpen={isOpen}
      onClose={onClose}
      title="프리셋"
      headerRight={
        <PISegmentedControl
          value={scope}
          onChange={(value) => setScope(value as PresetScope)}
          options={[
            { value: '개인', label: '개인' },
            { value: '팀', label: '팀' },
          ]}
          size="sm"
        />
      }
    >
      {/* Save current filter */}
      <div 
        className="flex items-center gap-2 p-3 rounded-lg"
        style={{
          background: 'rgba(255, 255, 255, 0.5)',
          border: '1px solid rgba(17, 24, 39, 0.08)',
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
      {filteredPresets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(29, 78, 216, 0.08)',
            }}
          >
            <Zap className="w-6 h-6" style={{ color: '#2563EB' }} />
          </div>
          <div className="text-center">
            <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B' }}>
              저장된 프리셋이 없습니다.
            </p>
            <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', marginTop: '4px' }}>
              현재 필터를 저장하여 빠르게 재사용하세요.
            </p>
          </div>
        </div>
      ) : (
        filteredPresets.map((preset) => (
          <div
            key={preset.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-white/50 transition-colors"
            style={{
              border: '1px solid rgba(17, 24, 39, 0.06)',
            }}
          >
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                {preset.name}
              </div>
              <div 
                className="flex items-center gap-2 mt-1"
                style={{ fontSize: '12px', fontWeight: 400, color: '#64748B' }}
              >
                <span>{preset.scope}</span>
                <span>-</span>
                <span>{preset.date}</span>
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
              <PIButton
                variant="ghost"
                size="small"
                onClick={() => handleDelete(preset.id)}
              >
                삭제
              </PIButton>
            </div>
          </div>
        ))
      )}
    </PIQuickMenuPopover>
  );
}
