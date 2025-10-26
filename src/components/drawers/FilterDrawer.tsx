import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PIButton } from '../pi/PIButton';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (filters: any) => void;
  initialFilters?: any;
}

const regions = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산',
  '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '기타'
];

const incomeRanges = [
  '~200', '200~300', '300~400', '400~600', '600~'
];

export function FilterDrawer({ isOpen, onClose, onApply, initialFilters }: FilterDrawerProps) {
  const [ageRange, setAgeRange] = useState(initialFilters?.ageRange || [20, 39]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(initialFilters?.selectedRegions || ['서울', '경기']);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(initialFilters?.selectedGenders || ['여성']);
  const [selectedIncomes, setSelectedIncomes] = useState<string[]>(initialFilters?.selectedIncomes || []);
  const [quickpollOnly, setQuickpollOnly] = useState(initialFilters?.quickpollOnly || false);

  if (!isOpen) return null;

  const handleReset = () => {
    setAgeRange([20, 39]);
    setSelectedRegions([]);
    setSelectedGenders([]);
    setSelectedIncomes([]);
    setQuickpollOnly(false);
  };

  return (
    <>
      {/* Overlay with Enhanced Blur */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-[var(--duration-fast)]"
        style={{ backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-[var(--duration-base)]"
      >
        {/* Header with Gradient Hairline */}
        <div className="px-6 py-5 border-b border-[var(--neutral-200)] flex items-center justify-between relative">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[var(--accent-blue)] via-[#8B5CF6] to-transparent opacity-50" />
          <h2 className="text-lg font-semibold">패널 필터</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--neutral-100)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Section 1: Basic */}
          <div className="space-y-6">
            <h3 className="font-semibold text-[var(--primary-500)]">기본</h3>

            {/* Gender */}
            <div className="space-y-3">
              <Label>성별</Label>
              <div className="flex flex-wrap gap-2">
                {['여성', '남성'].map((gender) => (
                  <label key={gender} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedGenders.includes(gender)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedGenders([...selectedGenders, gender]);
                        } else {
                          setSelectedGenders(selectedGenders.filter(g => g !== gender));
                        }
                      }}
                    />
                    <span className="text-sm">{gender}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Age Range */}
            <div className="space-y-3">
              <Label>나이</Label>
              <div className="px-2">
                <Slider
                  value={ageRange}
                  onValueChange={setAgeRange}
                  min={15}
                  max={80}
                  step={1}
                  className="w-full"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-[var(--neutral-600)]">{ageRange[0]}세</span>
                  <span className="text-sm text-[var(--neutral-600)]">{ageRange[1]}세</span>
                </div>
              </div>
            </div>

            {/* Region */}
            <div className="space-y-3">
              <Label>지역</Label>
              <div className="grid grid-cols-3 gap-2">
                {regions.map((region) => (
                  <label key={region} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedRegions.includes(region)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRegions([...selectedRegions, region]);
                        } else {
                          setSelectedRegions(selectedRegions.filter(r => r !== region));
                        }
                      }}
                    />
                    <span className="text-sm">{region}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Income */}
            <div className="space-y-3">
              <Label>소득 (만원)</Label>
              <div className="flex flex-wrap gap-2">
                {incomeRanges.map((income) => (
                  <label key={income} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedIncomes.includes(income)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIncomes([...selectedIncomes, income]);
                        } else {
                          setSelectedIncomes(selectedIncomes.filter(i => i !== income));
                        }
                      }}
                    />
                    <span className="text-sm">{income}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Interests */}
          <div className="space-y-3">
            <h3 className="font-semibold text-[var(--primary-500)]">관심사</h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="태그 입력 (자동완성)"
                className="w-full px-4 py-2 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm">조건:</span>
                <div className="flex gap-1">
                  <button className="px-3 py-1 text-sm bg-[var(--primary-500)] text-white rounded-lg">AND</button>
                  <button className="px-3 py-1 text-sm bg-[var(--neutral-100)] rounded-lg">OR</button>
                </div>
              </div>
            </div>
          </div>

          {/* Quickpoll Toggle */}
          <div className="flex items-center justify-between p-4 bg-[var(--neutral-50)] rounded-xl">
            <Label className="text-sm">퀵폴 응답 보유만 보기</Label>
            <Switch checked={quickpollOnly} onCheckedChange={setQuickpollOnly} />
          </div>

          {/* Live Count */}
          <div className="p-4 bg-gradient-to-r from-[var(--accent-blue)]/10 to-[#8B5CF6]/10 rounded-xl border border-[var(--accent-blue)]/20">
            <p className="text-sm text-[var(--neutral-600)]">현재 필터 결과</p>
            <p className="text-xl font-bold text-[var(--primary-500)] mt-1">
              8,863명 중 2,140명
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--neutral-200)] flex items-center gap-3">
          <PIButton variant="ghost" onClick={handleReset} className="flex-1">
            초기화
          </PIButton>
          <PIButton
            variant="primary"
            onClick={() => {
              onApply?.({
                ageRange,
                selectedRegions,
                selectedGenders,
                selectedIncomes,
                quickpollOnly,
              });
              onClose();
            }}
            className="flex-1"
          >
            적용하고 검색
          </PIButton>
        </div>
      </div>
    </>
  );
}
