import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { presetManager, type FilterPreset } from '../../lib/presetManager';
import { toast } from 'sonner';

interface PIPresetEditModalProps {
  isOpen: boolean;
  preset: FilterPreset | null;
  onClose: () => void;
  onSave: (preset: FilterPreset) => void;
}

const regions = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산',
  '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '기타'
];

const incomeRanges = [
  '~200', '200~300', '300~400', '400~600', '600~'
];

export function PIPresetEditModal({ isOpen, preset, onClose, onSave }: PIPresetEditModalProps) {
  const [name, setName] = useState('');
  const [ageRange, setAgeRange] = useState<[number, number]>([15, 80]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedIncomes, setSelectedIncomes] = useState<string[]>([]);
  const [quickpollOnly, setQuickpollOnly] = useState(false);

  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setAgeRange(preset.filters.ageRange || [15, 80]);
      setSelectedRegions(preset.filters.regions || []);
      setSelectedGenders(preset.filters.gender || []);
      setSelectedIncomes(preset.filters.income || []);
      setQuickpollOnly(preset.filters.quickpollOnly || false);
    }
  }, [preset, isOpen]);

  const handleSave = () => {
    if (!preset || !name.trim()) {
      toast.error('프리셋 이름을 입력해주세요');
      return;
    }

    const updated = presetManager.updatePreset(preset.id, {
      name: name.trim(),
      filters: {
        ageRange,
        regions: selectedRegions,
        gender: selectedGenders,
        income: selectedIncomes,
        quickpollOnly,
      },
    });

    if (updated) {
      onSave(updated);
      toast.success('프리셋이 수정되었습니다');
      onClose();
    } else {
      toast.error('프리셋 수정에 실패했습니다');
    }
  };

  const toggleItem = <T,>(array: T[], item: T, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
    if (array.includes(item)) {
      setter(array.filter((i) => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  if (!isOpen || !preset) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && preset && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              margin: 0,
              padding: 0,
              transform: 'translate(-50%, -50%)',
              width: '600px',
              maxHeight: '80vh',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                프리셋 수정
              </h3>
              <button
                onClick={onClose}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <X size={20} color="#6B7280" />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 프리셋 이름 */}
                <div>
                  <Label style={{ marginBottom: '8px', display: 'block' }}>프리셋 이름</Label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
                    onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  />
                </div>

                {/* 성별 */}
                <div>
                  <Label style={{ marginBottom: '8px', display: 'block' }}>성별</Label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['여성', '남성'].map((gender) => {
                      const isSelected = selectedGenders.includes(gender);
                      return (
                        <label
                          key={gender}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                            background: isSelected ? '#EFF6FF' : 'white',
                            cursor: 'pointer',
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleItem(selectedGenders, gender, setSelectedGenders)}
                          />
                          <span style={{ fontSize: '14px', fontWeight: 500, color: isSelected ? '#3B82F6' : '#374151' }}>
                            {gender}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 나이 */}
                <div>
                  <Label style={{ marginBottom: '8px', display: 'block' }}>나이</Label>
                  <div style={{ padding: '0 8px' }}>
                    <Slider value={ageRange} onValueChange={setAgeRange} min={15} max={80} step={1} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#3B82F6' }}>
                        {ageRange[0]}세
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#7C3AED' }}>
                        {ageRange[1]}세
                      </span>
                    </div>
                  </div>
                </div>

                {/* 지역 */}
                <div>
                  <Label style={{ marginBottom: '8px', display: 'block' }}>지역</Label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '6px',
                      padding: '12px',
                      background: '#F9FAFB',
                      borderRadius: '8px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {regions.map((region) => {
                      const isSelected = selectedRegions.includes(region);
                      return (
                        <label
                          key={region}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: isSelected ? '#EFF6FF' : 'white',
                            border: isSelected ? '1px solid #3B82F6' : '1px solid #E5E7EB',
                            cursor: 'pointer',
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleItem(selectedRegions, region, setSelectedRegions)}
                          />
                          <span style={{ fontSize: '13px', fontWeight: 500, color: isSelected ? '#3B82F6' : '#374151' }}>
                            {region}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 소득 */}
                <div>
                  <Label style={{ marginBottom: '8px', display: 'block' }}>소득 (만원)</Label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {incomeRanges.map((income) => {
                      const isSelected = selectedIncomes.includes(income);
                      return (
                        <label
                          key={income}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                            background: isSelected ? '#EFF6FF' : 'white',
                            cursor: 'pointer',
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleItem(selectedIncomes, income, setSelectedIncomes)}
                          />
                          <span style={{ fontSize: '13px', fontWeight: 500, color: isSelected ? '#3B82F6' : '#374151' }}>
                            {income}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 퀵폴 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                  }}
                >
                  <Label>퀵폴 응답 보유만 보기</Label>
                  <Switch checked={quickpollOnly} onCheckedChange={setQuickpollOnly} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  background: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#3B82F6',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                저장
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Portal을 사용해 body에 직접 렌더링
  return createPortal(modalContent, document.body);
}

