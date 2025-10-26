import { useState } from 'react';
import { Eye, Tag, Palette, Download, Search } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { PIButton } from './PIButton';
import { Label } from '../ui/label';

interface PIViewControlsProps {
  showNoise?: boolean;
  onShowNoiseChange?: (value: boolean) => void;
  showLabels?: boolean;
  onShowLabelsChange?: (value: boolean) => void;
  densityCorrection?: boolean;
  onDensityCorrectionChange?: (value: boolean) => void;
  pointSize?: number;
  onPointSizeChange?: (value: number) => void;
  opacity?: number;
  onOpacityChange?: (value: number) => void;
  colorBy?: string;
  onColorByChange?: (value: string) => void;
  onHighlightSimilar?: () => void;
  onExportSnapshot?: () => void;
}

export function PIViewControls({
  showNoise = true,
  onShowNoiseChange,
  showLabels = true,
  onShowLabelsChange,
  densityCorrection = false,
  onDensityCorrectionChange,
  pointSize = 4,
  onPointSizeChange,
  opacity = 0.8,
  onOpacityChange,
  colorBy = 'cluster',
  onColorByChange,
  onHighlightSimilar,
  onExportSnapshot,
}: PIViewControlsProps) {
  const colorOptions = [
    { value: 'cluster', label: '클러스터별' },
    { value: 'gender', label: '성별별' },
    { value: 'region', label: '지역별' },
    { value: 'income', label: '소득별' },
  ];

  return (
    <div
      className="flex flex-col rounded-2xl"
      style={{
        height: '224px',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(17, 24, 39, 0.10)',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b relative flex-shrink-0"
        style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}
      >
        {/* Gradient Hairline */}
        <div 
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)',
            opacity: 0.5,
          }}
        />
        
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
          보기 옵션
        </h3>
      </div>

      {/* Body - Scrollable */}
      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto">
        {/* Toggles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
              <Label style={{ fontSize: '11px', fontWeight: 500, color: '#0F172A', cursor: 'pointer' }}>
                노이즈 점
              </Label>
            </div>
            <Switch checked={showNoise} onCheckedChange={onShowNoiseChange} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
              <Label style={{ fontSize: '11px', fontWeight: 500, color: '#0F172A', cursor: 'pointer' }}>
                라벨 표시
              </Label>
            </div>
            <Switch checked={showLabels} onCheckedChange={onShowLabelsChange} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full" style={{ background: '#64748B' }} />
              </div>
              <Label 
                style={{ fontSize: '11px', fontWeight: 500, color: '#0F172A', cursor: 'pointer' }}
                title="점 밀도 보정"
              >
                밀도 보정
              </Label>
            </div>
            <Switch checked={densityCorrection} onCheckedChange={onDensityCorrectionChange} />
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label style={{ fontSize: '11px', fontWeight: 500, color: '#0F172A' }}>
                점 크기
              </Label>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                {pointSize}
              </span>
            </div>
            <Slider
              value={[pointSize]}
              onValueChange={(vals) => {
                console.log('Point size changed:', vals[0]);
                onPointSizeChange?.(vals[0]);
              }}
              min={1}
              max={8}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label style={{ fontSize: '11px', fontWeight: 500, color: '#0F172A' }}>
                투명도
              </Label>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <Slider
              value={[opacity * 100]}
              onValueChange={(vals) => onOpacityChange?.(vals[0] / 100)}
              min={20}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        </div>

        {/* Color By Dropdown */}
        <div>
          <Label style={{ fontSize: '11px', fontWeight: 500, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
            색상 기준
          </Label>
          <select
            value={colorBy}
            onChange={(e) => onColorByChange?.(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border transition-colors"
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#0F172A',
              background: 'rgba(255, 255, 255, 0.8)',
              borderColor: 'rgba(17, 24, 39, 0.10)',
            }}
          >
            {colorOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
