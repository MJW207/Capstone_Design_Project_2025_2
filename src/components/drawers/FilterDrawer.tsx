import React, { useState, useMemo, useEffect } from 'react';
import { X, Filter as FilterIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { AgeSlider } from '../../ui/filter/AgeSlider';
import { RegionGroups } from '../../ui/filter/RegionGroups';
import { TagInput } from '../../ui/filter/TagInput';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (filters: any) => void;
  initialFilters?: any;
  totalResults?: number;
  filteredResults?: number;
  presetId?: string;
  presetName?: string;
  onPresetUpdate?: (presetId: string, filters: any, name: string) => void;
  onPresetSave?: (filters: any, name: string) => void; // 새 프리셋 저장
}

// Simple Checkbox Component (visual only, click handled by parent)
function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div
      style={{
        width: '16px',
        height: '16px',
        borderRadius: '4px',
        border: checked ? 'none' : '2px solid',
        borderColor: checked ? 'transparent' : 'currentColor',
        background: checked ? 'currentColor' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 120ms cubic-bezier(0.33, 1, 0.68, 1)',
        color: checked 
          ? '#2563EB' 
          : '#D1D5DB',
        flexShrink: 0,
        pointerEvents: 'none', // 클릭은 부모 button이 처리
      }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M10 3L4.5 8.5L2 6"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

// Simple Switch Component
function Switch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: '44px',
        height: '24px',
        borderRadius: '999px',
        background: checked 
          ? 'var(--brand-blue-500, #2563EB)' 
          : 'var(--muted-foreground, #D1D5DB)',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 180ms ease',
      }}
    >
      <div style={{
        position: 'absolute',
        top: '2px',
        left: checked ? '22px' : '2px',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: '#FFFFFF',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        transition: 'left 180ms cubic-bezier(0.33, 1, 0.68, 1)',
      }} />
    </button>
  );
}

const incomeRanges = ['~200', '200~300', '300~400', '400~600', '600~'];

export function FilterDrawer({
  isOpen,
  onClose,
  onApply,
  initialFilters,
  totalResults = 0,
  filteredResults = 0,
  presetId,
  presetName = '',
  onPresetUpdate,
  onPresetSave,
}: FilterDrawerProps) {
  const isEditMode = !!presetId;
  const [ageRange, setAgeRange] = useState<[number, number]>(initialFilters?.ageRange || [15, 80]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(initialFilters?.selectedRegions || []);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(initialFilters?.selectedGenders || []);
  const [selectedIncomes, setSelectedIncomes] = useState<string[]>(initialFilters?.selectedIncomes || []);
  const [quickpollOnly, setQuickpollOnly] = useState(initialFilters?.quickpollOnly || false);
  const [interests, setInterests] = useState<string[]>(
    initialFilters?.interests
      ? Array.isArray(initialFilters.interests)
        ? initialFilters.interests
        : typeof initialFilters.interests === 'string' && initialFilters.interests
          ? [initialFilters.interests]
          : []
      : []
  );
  const [interestLogic, setInterestLogic] = useState<'and' | 'or'>(initialFilters?.interestLogic || 'and');
  const [regionQuery, setRegionQuery] = useState('');
  const [presetNameInput, setPresetNameInput] = useState(presetName);
  
  // initialFilters나 presetName이 변경되면 상태 업데이트
  useEffect(() => {
    if (isOpen && initialFilters) {
      setAgeRange(initialFilters.ageRange || [15, 80]);
      setSelectedRegions(initialFilters.selectedRegions || []);
      setSelectedGenders(initialFilters.selectedGenders || []);
      setSelectedIncomes(initialFilters.selectedIncomes || []);
      setQuickpollOnly(initialFilters.quickpollOnly || false);
      setInterests(
        initialFilters.interests
          ? Array.isArray(initialFilters.interests)
            ? initialFilters.interests
            : typeof initialFilters.interests === 'string' && initialFilters.interests
              ? [initialFilters.interests]
              : []
          : []
      );
      setInterestLogic(initialFilters.interestLogic || 'and');
    }
    if (isOpen) {
      setPresetNameInput(presetName);
    }
  }, [initialFilters, presetName, isOpen]);

  // 활성 필터 개수 계산
  const activeCount = useMemo(() => {
    let count = 0;
    if (selectedGenders.length > 0) count++;
    if (ageRange[0] > 15 || ageRange[1] < 80) count++;
    if (selectedIncomes.length > 0) count++;
    if (selectedRegions.length > 0) count++;
    if (interests.length > 0) count++;
    if (quickpollOnly) count++;
    return count;
  }, [selectedGenders, ageRange, selectedIncomes, selectedRegions, interests, quickpollOnly]);

  // 결과 톤 결정
  const resultTone = useMemo(() => {
    const count = filteredResults > 0 ? filteredResults : totalResults;
    if (count === 0) return 'zero';
    if (count < 100) return 'mid';
    return 'high';
  }, [filteredResults, totalResults]);

  const handleReset = () => {
    setAgeRange([15, 80]);
    setSelectedRegions([]);
    setSelectedGenders([]);
    setSelectedIncomes([]);
    setQuickpollOnly(false);
    setInterests([]);
    setInterestLogic('and');
    setRegionQuery('');
  };

  const handleApply = () => {
    const filters = {
      ageRange,
      selectedRegions,
      selectedGenders,
      selectedIncomes,
      quickpollOnly,
      interests,
      interestLogic,
    };

    // 일반 필터 적용 (수정 모드가 아닐 때만)
    onApply?.(filters);
    toast.success('필터가 적용되었습니다');
    onClose();
  };

  const handlePresetUpdate = () => {
    if (!presetId || !onPresetUpdate) return;
    
    if (!presetNameInput.trim()) {
      toast.error('프리셋 이름을 입력해주세요');
      return;
    }

    const filters = {
      ageRange,
      selectedRegions,
      selectedGenders,
      selectedIncomes,
      quickpollOnly,
      interests,
      interestLogic,
    };

    onPresetUpdate(presetId, filters, presetNameInput.trim());
    toast.success('프리셋이 수정되었습니다');
    onClose();
  };

  const handleSavePreset = () => {
    if (!presetNameInput.trim()) {
      toast.error('프리셋 이름을 입력해주세요');
      return;
    }

    // 활성 필터가 있는지 확인
    const hasActiveFilters = 
      selectedGenders.length > 0 ||
      ageRange[0] > 15 || ageRange[1] < 80 ||
      selectedIncomes.length > 0 ||
      selectedRegions.length > 0 ||
      interests.length > 0 ||
      quickpollOnly === true;

    if (!hasActiveFilters) {
      toast.error('저장할 필터가 없습니다. 필터를 선택한 후 저장해주세요.');
      return;
    }

    const filters = {
      ageRange,
      selectedRegions,
      selectedGenders,
      selectedIncomes,
      quickpollOnly,
      interests,
      interestLogic,
    };

    if (onPresetSave) {
      onPresetSave(filters, presetNameInput.trim());
      toast.success(`프리셋 "${presetNameInput.trim()}"이 저장되었습니다`);
      setPresetNameInput('');
      // 필터창은 열어두고 필터만 저장 (사용자가 계속 조정할 수 있도록)
      // onClose();
    }
  };

  const handleClearAll = () => {
    if (confirm('모든 필터를 초기화하시겠습니까?')) {
      handleReset();
    }
  };

  const toggleItem = <T,>(array: T[], item: T, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
    if (array.includes(item)) {
      setter(array.filter((i) => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  // 다크모드 감지
  const isDark = document.documentElement.classList.contains('dark') || 
                 document.documentElement.getAttribute('data-theme') === 'dark';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)',
              zIndex: 9998,
            }}
          />

          {/* Drawer - Bottom Up Animation */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              display: 'flex',
              justifyContent: 'center',
              padding: '0 16px 16px',
              fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            }}
          >
            {/* Glass Container */}
            <div
              className="filter-drawer-glass"
              style={{
                width: '100%',
                maxWidth: '1200px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: isDark 
                  ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative',
              }}
            >
              {/* Background Layers - Glassmorphism */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: isDark 
                  ? 'rgba(17, 24, 39, 0.85)' 
                  : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }} />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: isDark
                  ? 'linear-gradient(to bottom right, rgba(17, 24, 39, 0.6), rgba(31, 41, 55, 0.4), rgba(17, 24, 39, 0.6))'
                  : 'linear-gradient(to bottom right, rgba(255,255,255,0.5), rgba(255,255,255,0.3), rgba(255,255,255,0.5))',
              }} />
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '24px',
                border: isDark 
                  ? '1px solid rgba(255, 255, 255, 0.1)' 
                  : '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: isDark
                  ? '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                  : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }} />
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(to right, transparent, rgba(37, 99, 235, 0.5), transparent)',
              }} />

              {/* Content */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  style={{
                    padding: '24px 32px',
                    borderBottom: isDark 
                      ? '1px solid rgba(255, 255, 255, 0.1)' 
                      : '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        padding: '10px',
                        background: 'linear-gradient(to bottom right, #2563EB, #7C3AED)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
                      }}>
                        <FilterIcon size={20} color="white" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h2 style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          color: isDark ? '#F9FAFB' : '#111827',
                          margin: 0,
                          lineHeight: 1.4,
                        }}>
                          패널 필터
                        </h2>
                        <p style={{
                          fontSize: '14px',
                          color: isDark ? '#9CA3AF' : '#475569',
                          margin: '2px 0 0 0',
                        }}>
                          원하는 조건으로 패널을 검색하세요
                          {activeCount > 0 && (
                            <span style={{ marginLeft: '8px', fontWeight: 600 }}>
                              · {activeCount}개 필터 활성
                            </span>
                          )}
                        </p>
                        {/* 프리셋명 입력 필드 */}
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', width: '100%', maxWidth: '400px' }}>
                          <input
                            type="text"
                            value={presetNameInput}
                            onChange={(e) => setPresetNameInput(e.target.value)}
                            placeholder={isEditMode ? "프리셋 이름 수정" : "프리셋 이름을 입력하세요"}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: isDark 
                                ? '1px solid rgba(255, 255, 255, 0.1)' 
                                : '1px solid rgba(255, 255, 255, 0.4)',
                              background: isDark 
                                ? 'rgba(255, 255, 255, 0.05)' 
                                : 'rgba(255, 255, 255, 0.7)',
                              fontSize: '13px',
                              color: isDark ? '#F9FAFB' : '#111827',
                              outline: 'none',
                              transition: 'border 120ms',
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#2563EB'}
                            onBlur={(e) => e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)'}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && presetNameInput.trim() && onPresetSave && !isEditMode) {
                                handleSavePreset();
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleClearAll}
                        style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          color: isDark ? '#9CA3AF' : '#475569',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        모두 지우기
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        style={{
                          padding: '10px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'background 120ms',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <X size={20} color={isDark ? '#9CA3AF' : '#475569'} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>

                {/* Body */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px 32px',
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
                    gap: '24px',
                  }}>
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Gender */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                      >
                        <label style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: isDark ? '#E5E7EB' : '#334155' 
                        }}>
                          성별
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          {['여성', '남성'].map((gender) => {
                            const isSelected = selectedGenders.includes(gender);
                            return (
                              <motion.button
                                key={gender}
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => toggleItem(selectedGenders, gender, setSelectedGenders)}
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  padding: '12px 16px',
                                  borderRadius: '12px',
                                  cursor: 'pointer',
                                  border: isSelected 
                                    ? '2px solid #2563EB' 
                                    : isDark 
                                      ? '2px solid rgba(255, 255, 255, 0.1)' 
                                      : '2px solid rgba(255, 255, 255, 0.4)',
                                  background: isSelected
                                    ? 'linear-gradient(to right, rgba(37, 99, 235, 0.15), rgba(124, 58, 237, 0.15))'
                                    : isDark 
                                      ? 'rgba(255, 255, 255, 0.05)' 
                                      : 'rgba(255, 255, 255, 0.5)',
                                  boxShadow: isSelected ? '0 4px 6px -1px rgba(37, 99, 235, 0.15)' : 'none',
                                  transition: 'all 120ms cubic-bezier(0.33, 1, 0.68, 1)',
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                />
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: 500,
                                  color: isSelected 
                                    ? '#2563EB' 
                                    : isDark ? '#9CA3AF' : '#475569',
                                }}>
                                  {gender}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>

                      {/* Age */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          padding: '20px',
                          background: isDark 
                            ? 'rgba(255, 255, 255, 0.05)' 
                            : 'rgba(255, 255, 255, 0.5)',
                          borderRadius: '12px',
                          border: isDark 
                            ? '1px solid rgba(255, 255, 255, 0.1)' 
                            : '1px solid rgba(255, 255, 255, 0.4)',
                        }}
                      >
                        <label style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: isDark ? '#E5E7EB' : '#334155' 
                        }}>
                          나이
                        </label>
                        <div style={{ padding: '0 8px' }}>
                          <AgeSlider value={ageRange} onChange={setAgeRange} />
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '16px',
                          }}>
                            <div style={{
                              padding: '6px 12px',
                              background: 'rgba(37, 99, 235, 0.15)',
                              borderRadius: '8px',
                            }}>
                              <span style={{ 
                                fontSize: '14px', 
                                fontWeight: 600, 
                                color: '#2563EB' 
                              }}>
                                {ageRange[0]}세
                              </span>
                            </div>
                            <div style={{
                              flex: 1,
                              height: '1px',
                              margin: '0 12px',
                              background: 'linear-gradient(to right, rgba(37, 99, 235, 0.2), rgba(124, 58, 237, 0.2))',
                            }} />
                            <div style={{
                              padding: '6px 12px',
                              background: 'rgba(124, 58, 237, 0.15)',
                              borderRadius: '8px',
                            }}>
                              <span style={{ 
                                fontSize: '14px', 
                                fontWeight: 600, 
                                color: '#7C3AED' 
                              }}>
                                {ageRange[1]}세
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Income */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                      >
                        <label style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: isDark ? '#E5E7EB' : '#334155' 
                        }}>
                          소득 (만원)
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {incomeRanges.map((income) => {
                            const isSelected = selectedIncomes.includes(income);
                            return (
                              <motion.button
                                key={income}
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => toggleItem(selectedIncomes, income, setSelectedIncomes)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '10px 16px',
                                  borderRadius: '12px',
                                  cursor: 'pointer',
                                  border: isSelected 
                                    ? '2px solid #16A34A' 
                                    : isDark 
                                      ? '2px solid rgba(255, 255, 255, 0.1)' 
                                      : '2px solid rgba(255, 255, 255, 0.4)',
                                  background: isSelected
                                    ? 'linear-gradient(to right, rgba(22, 163, 74, 0.15), rgba(37, 99, 235, 0.15))'
                                    : isDark 
                                      ? 'rgba(255, 255, 255, 0.05)' 
                                      : 'rgba(255, 255, 255, 0.5)',
                                  boxShadow: isSelected ? '0 4px 6px -1px rgba(22, 163, 74, 0.15)' : 'none',
                                  transition: 'all 120ms cubic-bezier(0.33, 1, 0.68, 1)',
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                />
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: 500,
                                  color: isSelected 
                                    ? '#16A34A' 
                                    : isDark ? '#9CA3AF' : '#475569',
                                }}>
                                  {income}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Regions */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                      >
                        <label style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: isDark ? '#E5E7EB' : '#334155' 
                        }}>
                          지역
                        </label>
                        <div style={{
                          padding: '16px',
                          background: isDark 
                            ? 'rgba(255, 255, 255, 0.05)' 
                            : 'rgba(255, 255, 255, 0.5)',
                          borderRadius: '12px',
                          border: isDark 
                            ? '1px solid rgba(255, 255, 255, 0.1)' 
                            : '1px solid rgba(255, 255, 255, 0.4)',
                          maxHeight: '256px',
                          overflowY: 'auto',
                        }}>
                          <RegionGroups
                            value={selectedRegions}
                            onChange={setSelectedRegions}
                            searchQuery={regionQuery}
                            onSearchChange={setRegionQuery}
                            isDark={isDark}
                          />
                        </div>
                      </motion.div>

                      {/* Interests */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          padding: '20px',
                          background: isDark 
                            ? 'rgba(255, 255, 255, 0.05)' 
                            : 'rgba(255, 255, 255, 0.5)',
                          borderRadius: '12px',
                          border: isDark 
                            ? '1px solid rgba(255, 255, 255, 0.1)' 
                            : '1px solid rgba(255, 255, 255, 0.4)',
                        }}
                      >
                        <label style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: isDark ? '#E5E7EB' : '#334155' 
                        }}>
                          관심사
                        </label>
                        <TagInput
                          value={interests}
                          onChange={setInterests}
                          logic={interestLogic}
                          onLogicChange={setInterestLogic}
                          isDark={isDark}
                        />
                      </motion.div>

                      {/* Quickpoll Toggle */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '20px',
                          background: 'linear-gradient(to right, rgba(245, 158, 11, 0.15), rgba(37, 99, 235, 0.15))',
                          borderRadius: '12px',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sparkles size={16} color="#F59E0B" />
                          <label style={{ 
                            fontSize: '14px', 
                            fontWeight: 600, 
                            color: isDark ? '#E5E7EB' : '#334155' 
                          }}>
                            퀵폴 응답 보유만 보기
                          </label>
                        </div>
                        <Switch checked={quickpollOnly} onChange={setQuickpollOnly} />
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    padding: '24px 32px',
                    borderTop: isDark 
                      ? '1px solid rgba(255, 255, 255, 0.1)' 
                      : '1px solid rgba(255, 255, 255, 0.2)',
                    background: isDark 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(255, 255, 255, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Live Count */}
                    <div style={{
                      flex: 1,
                      padding: '16px',
                      background: 'linear-gradient(to right, rgba(37, 99, 235, 0.2), rgba(124, 58, 237, 0.2))',
                      borderRadius: '12px',
                      border: '1px solid rgba(37, 99, 235, 0.3)',
                    }}>
                      <p style={{ 
                        fontSize: '12px', 
                        fontWeight: 500, 
                        color: isDark ? '#9CA3AF' : '#475569', 
                        margin: 0 
                      }}>
                        현재 필터 결과
                      </p>
                      <p style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        background: 'linear-gradient(to right, #2563EB, #7C3AED)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: '4px 0 0 0',
                      }}>
                        {(filteredResults > 0 ? filteredResults : totalResults).toLocaleString()}명
                        {totalResults > 0 && (
                          <span style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: isDark ? '#6B7280' : '#64748B',
                            marginLeft: '8px',
                          }}>
                            / {totalResults.toLocaleString()}명
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleReset}
                        style={{
                          padding: '12px 24px',
                          fontSize: '14px',
                          fontWeight: 600,
                          background: isDark 
                            ? 'rgba(255, 255, 255, 0.1)' 
                            : 'rgba(255, 255, 255, 0.7)',
                          border: isDark 
                            ? '2px solid rgba(255, 255, 255, 0.1)' 
                            : '2px solid rgba(255, 255, 255, 0.4)',
                          borderRadius: '12px',
                          color: isDark ? '#E5E7EB' : '#334155',
                          cursor: 'pointer',
                          transition: 'all 120ms',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.15)' : '#FFFFFF'}
                        onMouseLeave={(e) => e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.7)'}
                      >
                        초기화
                      </motion.button>
                      {isEditMode && presetId && onPresetUpdate ? (
                        // 수정 모드일 때만 표시되는 수정 전용 버튼
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handlePresetUpdate}
                          disabled={!presetNameInput.trim()}
                          style={{
                            padding: '12px 32px',
                            fontSize: '14px',
                            fontWeight: 600,
                            background: !presetNameInput.trim()
                              ? (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.3)')
                              : 'linear-gradient(to right, #F59E0B, #EF4444)',
                            border: 'none',
                            borderRadius: '12px',
                            color: !presetNameInput.trim()
                              ? (isDark ? '#6B7280' : '#9CA3AF')
                              : 'white',
                            cursor: presetNameInput.trim() ? 'pointer' : 'not-allowed',
                            transition: 'all 120ms',
                            opacity: !presetNameInput.trim() ? 0.6 : 1,
                            boxShadow: presetNameInput.trim() ? '0 10px 15px -3px rgba(245, 158, 11, 0.3)' : 'none',
                          }}
                          onMouseEnter={(e) => {
                            if (presetNameInput.trim()) {
                              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(245, 158, 11, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (presetNameInput.trim()) {
                              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(245, 158, 11, 0.3)';
                            }
                          }}
                        >
                          프리셋 수정
                        </motion.button>
                      ) : (
                        <>
                          {onPresetSave && (
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handleSavePreset}
                              disabled={!presetNameInput.trim()}
                              style={{
                                padding: '12px 24px',
                                fontSize: '14px',
                                fontWeight: 600,
                                background: !presetNameInput.trim() 
                                  ? (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.3)')
                                  : (isDark ? 'rgba(22, 163, 74, 0.2)' : 'rgba(22, 163, 74, 0.15)'),
                                border: !presetNameInput.trim()
                                  ? (isDark ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid rgba(255, 255, 255, 0.3)')
                                  : '2px solid #16A34A',
                                borderRadius: '12px',
                                color: !presetNameInput.trim()
                                  ? (isDark ? '#6B7280' : '#9CA3AF')
                                  : '#16A34A',
                                cursor: presetNameInput.trim() ? 'pointer' : 'not-allowed',
                                transition: 'all 120ms',
                                opacity: !presetNameInput.trim() ? 0.6 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (presetNameInput.trim()) {
                                  e.currentTarget.style.background = 'rgba(22, 163, 74, 0.25)';
                                  e.currentTarget.style.borderColor = '#15803D';
                                  e.currentTarget.style.color = '#15803D';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (presetNameInput.trim()) {
                                  e.currentTarget.style.background = isDark ? 'rgba(22, 163, 74, 0.2)' : 'rgba(22, 163, 74, 0.15)';
                                  e.currentTarget.style.borderColor = '#16A34A';
                                  e.currentTarget.style.color = '#16A34A';
                                }
                              }}
                            >
                              현재 필터 저장
                            </motion.button>
                          )}
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleApply}
                            style={{
                              padding: '12px 32px',
                              fontSize: '14px',
                              fontWeight: 600,
                              background: 'linear-gradient(to right, #2563EB, #7C3AED)',
                              border: 'none',
                              borderRadius: '12px',
                              color: 'white',
                              cursor: 'pointer',
                              boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
                            }}
                          >
                            적용하고 검색
                          </motion.button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
