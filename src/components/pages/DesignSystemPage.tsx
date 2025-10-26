import React from 'react';
import { PIButton } from '../pi/PIButton';
import { PITextField } from '../pi/PITextField';
import { PIChip } from '../pi/PIChip';
import { PIBadge } from '../pi/PIBadge';
import { PICard } from '../pi/PICard';
import { PISegmentedControl } from '../pi/PISegmentedControl';
import { PIHashtag } from '../pi/PIHashtag';
import { PIModelStatusCard } from '../pi/PIModelStatusCard';
import { PIQualityLegend } from '../pi/PIQualityLegend';
import { PIViewControls } from '../pi/PIViewControls';
import { PIClusterFilter } from '../pi/PIClusterFilter';
import { PIClusteringExplainer } from '../pi/PIClusteringExplainer';
import { Search, Download, Sparkles, Info } from 'lucide-react';

export function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-[var(--neutral-50)] p-20">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-[var(--primary-500)]">Panel Insight Design System</h1>
          <p className="text-base text-[var(--neutral-600)]">
            재사용 가능한 컴포넌트와 스타일 토큰 라이브러리
          </p>
        </div>

        {/* Colors */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Colors</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-[var(--neutral-600)]">Primary</h3>
              <div className="grid grid-cols-6 gap-3">
                <div className="space-y-2">
                  <div className="h-20 rounded-xl bg-[var(--primary-500)] pi-elevation-1" />
                  <p className="text-xs font-mono">#111827</p>
                  <p className="text-xs text-[var(--neutral-600)]">Primary 500</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-xl bg-[var(--primary-600)] pi-elevation-1" />
                  <p className="text-xs font-mono">#0B1220</p>
                  <p className="text-xs text-[var(--neutral-600)]">Primary 600</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 text-[var(--neutral-600)]">Neutral</h3>
              <div className="grid grid-cols-6 gap-3">
                {[
                  { var: '--neutral-50', hex: '#F8FAFC', name: 'Neutral 50' },
                  { var: '--neutral-100', hex: '#F1F5F9', name: 'Neutral 100' },
                  { var: '--neutral-200', hex: '#E5E7EB', name: 'Neutral 200' },
                  { var: '--neutral-300', hex: '#D1D5DB', name: 'Neutral 300' },
                  { var: '--neutral-600', hex: '#475569', name: 'Neutral 600' },
                  { var: '--neutral-800', hex: '#1F2937', name: 'Neutral 800' },
                ].map((color) => (
                  <div key={color.var} className="space-y-2">
                    <div className={`h-20 rounded-xl border border-[var(--neutral-200)] pi-elevation-1`} style={{ background: `var(${color.var})` }} />
                    <p className="text-xs font-mono">{color.hex}</p>
                    <p className="text-xs text-[var(--neutral-600)]">{color.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 text-[var(--neutral-600)]">Accent</h3>
              <div className="grid grid-cols-6 gap-3">
                {[
                  { var: '--accent-blue', hex: '#2563EB', name: 'Blue' },
                  { var: '--accent-green', hex: '#16A34A', name: 'Green' },
                  { var: '--accent-amber', hex: '#F59E0B', name: 'Amber' },
                  { var: '--accent-red', hex: '#EF4444', name: 'Red' },
                ].map((color) => (
                  <div key={color.var} className="space-y-2">
                    <div className="h-20 rounded-xl pi-elevation-1" style={{ background: `var(${color.var})` }} />
                    <p className="text-xs font-mono">{color.hex}</p>
                    <p className="text-xs text-[var(--neutral-600)]">{color.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Gradients */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Gradients</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { class: 'pi-gradient-blue', name: 'Blue' },
              { class: 'pi-gradient-primary', name: 'Primary' },
              { style: 'linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)', name: 'Blue-Purple' },
            ].map((grad, i) => (
              <div key={i} className="space-y-2">
                <div 
                  className={`h-32 rounded-xl ${grad.class || ''}`}
                  style={grad.style ? { background: grad.style } : {}}
                />
                <p className="text-sm font-semibold">{grad.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Typography</h2>
          <div className="space-y-4 bg-white rounded-xl p-6 border border-[var(--neutral-200)]">
            <div className="space-y-1">
              <p className="text-4xl font-bold">Display 56px / Bold</p>
              <p className="text-xs text-[var(--neutral-600)]">Pretendard 700</p>
            </div>
            <div className="space-y-1">
              <h1>H1 20px / Bold</h1>
              <p className="text-xs text-[var(--neutral-600)]">Pretendard 700</p>
            </div>
            <div className="space-y-1">
              <h2>H2 16px / Semibold</h2>
              <p className="text-xs text-[var(--neutral-600)]">Pretendard 600</p>
            </div>
            <div className="space-y-1">
              <p>Body 14px / Regular</p>
              <p className="text-xs text-[var(--neutral-600)]">Pretendard 400</p>
            </div>
            <div className="space-y-1">
              <p className="pi-caption">Caption 12px / Regular</p>
              <p className="text-xs text-[var(--neutral-600)]">Pretendard 400</p>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">PI/Button</h2>
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--neutral-600)]">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <PIButton variant="primary">Primary</PIButton>
                <PIButton variant="primary-gradient" icon={<Sparkles className="w-4 h-4" />}>
                  Primary Gradient
                </PIButton>
                <PIButton variant="secondary">Secondary</PIButton>
                <PIButton variant="outline-glass">Outline Glass</PIButton>
                <PIButton variant="ghost">Ghost</PIButton>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--neutral-600)]">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <PIButton variant="primary" size="large">Large 40px</PIButton>
                <PIButton variant="primary" size="medium">Medium 36px</PIButton>
                <PIButton variant="primary" size="small">Small 32px</PIButton>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--neutral-600)]">With Icons</h3>
              <div className="flex flex-wrap gap-3">
                <PIButton variant="primary" icon={<Download className="w-4 h-4" />}>
                  Download
                </PIButton>
                <PIButton variant="secondary" icon={<Search className="w-4 h-4" />}>
                  Search
                </PIButton>
              </div>
            </div>
          </div>
        </section>

        {/* Text Fields */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">PI/TextField</h2>
          <div className="space-y-4 max-w-2xl">
            <PITextField 
              label="기본 입력"
              placeholder="텍스트를 입력하세요"
              helperText="도움말 텍스트"
            />
            <PITextField 
              label="아이콘 포함"
              placeholder="검색..."
              leadingIcon={<Search className="w-4 h-4" />}
              trailingIcons={[<Info key="info" className="w-4 h-4" />]}
            />
            <PITextField 
              label="에러 상태"
              placeholder="이메일 입력"
              error="올바른 이메일을 입력하세요"
            />
            <PITextField 
              large
              placeholder="대형 검색창 (56px)"
            />
          </div>
        </section>

        {/* Chips */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">PI/Chip</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--neutral-600)]">Filter</h3>
              <div className="flex flex-wrap gap-2">
                <PIChip type="filter">Default</PIChip>
                <PIChip type="filter" selected>Selected</PIChip>
                <PIChip type="filter" onRemove={() => {}}>With Close</PIChip>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--neutral-600)]">Tag</h3>
              <div className="flex flex-wrap gap-2">
                <PIChip type="tag">Default</PIChip>
                <PIChip type="tag" selected>Selected</PIChip>
                <PIChip type="tag-soft">Tag Soft</PIChip>
                <PIChip type="tag-soft" selected>Soft Selected</PIChip>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--neutral-600)]">Metric</h3>
              <div className="flex flex-wrap gap-2">
                <PIChip type="metric">Metric</PIChip>
              </div>
            </div>
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">PI/Badge</h2>
          <div className="flex flex-wrap gap-3">
            <PIBadge kind="coverage-qw">Q+W</PIBadge>
            <PIBadge kind="coverage-w">W only</PIBadge>
            <PIBadge kind="cluster">C1</PIBadge>
            <PIBadge kind="new">New</PIBadge>
            <PIBadge kind="info">Info</PIBadge>
          </div>
        </section>

        {/* Hashtags */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">PI/Hashtag (12 Colors)</h2>
          <div className="flex flex-wrap gap-2">
            <PIHashtag color="T1">스킨케어</PIHashtag>
            <PIHashtag color="T2">OTT</PIHashtag>
            <PIHashtag color="T3">여행</PIHashtag>
            <PIHashtag color="T4">피트니스</PIHashtag>
            <PIHashtag color="T5">건강</PIHashtag>
            <PIHashtag color="T6">요가</PIHashtag>
            <PIHashtag color="T7">뷰티</PIHashtag>
            <PIHashtag color="T8">패션</PIHashtag>
            <PIHashtag color="T9">게임</PIHashtag>
            <PIHashtag color="T10">음악</PIHashtag>
            <PIHashtag color="T11">독서</PIHashtag>
            <PIHashtag color="T12">카페</PIHashtag>
          </div>
        </section>

        {/* Cards */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">PI/Card</h2>
          <div className="grid grid-cols-3 gap-4">
            <PICard variant="summary">
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-sm text-[var(--neutral-600)]">
                기본 요약 카드입니다.
              </p>
            </PICard>

            <PICard variant="summary-glow">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-blue)] to-transparent opacity-40" />
              <h3 className="font-semibold mb-2">Summary Glow</h3>
              <p className="text-sm text-[var(--neutral-600)]">
                Gradient hairline이 있는 카드입니다.
              </p>
            </PICard>

            <PICard variant="panel">
              <h3 className="font-semibold mb-2">Panel</h3>
              <p className="text-sm text-[var(--neutral-600)]">
                호버 효과가 있는 패널 카드입니다.
              </p>
            </PICard>
          </div>
        </section>

        {/* Cluster Lab Components */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Cluster Lab Components</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">PI/ModelStatusCard</h3>
              <PIModelStatusCard
                status="synced"
                userRole="viewer"
              />
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">PI/QualityLegend</h3>
              <PIQualityLegend />
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">PI/ViewControls</h3>
              <PIViewControls />
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">PI/ClusterFilter</h3>
              <PIClusterFilter />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold">PI/ClusteringExplainer (Full Width)</h3>
            <PIClusteringExplainer />
          </div>
        </section>

        {/* Segmented Control */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">PI/SegmentedControl</h2>
          <div className="space-y-4">
            <PISegmentedControl
              options={[
                { value: 'option1', label: '옵션 1' },
                { value: 'option2', label: '옵션 2' },
                { value: 'option3', label: '옵션 3' },
              ]}
              value="option1"
              onChange={() => {}}
            />
          </div>
        </section>

        {/* Shadows & Effects */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Shadows & Effects</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="h-32 bg-white rounded-xl pi-elevation-1 flex items-center justify-center">
                <p className="text-sm font-semibold">Elevation 1</p>
              </div>
              <p className="text-xs text-[var(--neutral-600)]">0 1px 2px rgba(0,0,0,0.06)</p>
            </div>

            <div className="space-y-2">
              <div className="h-32 bg-white rounded-xl pi-elevation-2 flex items-center justify-center">
                <p className="text-sm font-semibold">Elevation 2</p>
              </div>
              <p className="text-xs text-[var(--neutral-600)]">0 6px 16px rgba(0,0,0,0.08)</p>
            </div>

            <div className="space-y-2">
              <div className="h-32 bg-white rounded-xl pi-glow flex items-center justify-center">
                <p className="text-sm font-semibold">Glow</p>
              </div>
              <p className="text-xs text-[var(--neutral-600)]">Gradient glow effect</p>
            </div>
          </div>
        </section>

        {/* Glass Effect */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Glass Effect</h2>
          <div className="relative h-64 rounded-xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-blue)] to-[#8B5CF6]" />
            
            {/* Glass Elements */}
            <div className="absolute inset-0 flex items-center justify-center gap-4">
              <div className="pi-glass w-48 h-32 rounded-xl flex items-center justify-center">
                <p className="text-sm font-semibold">Glass Default</p>
              </div>
              <div className="pi-glass-enhanced w-48 h-32 rounded-xl flex items-center justify-center">
                <p className="text-sm font-semibold">Glass Enhanced</p>
              </div>
            </div>
          </div>
        </section>

        {/* Spacing */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Spacing Scale (8px base)</h2>
          <div className="space-y-3">
            {[
              { var: '--space-1', px: '4px', name: 'Space 1' },
              { var: '--space-2', px: '8px', name: 'Space 2' },
              { var: '--space-3', px: '12px', name: 'Space 3' },
              { var: '--space-4', px: '16px', name: 'Space 4' },
              { var: '--space-5', px: '20px', name: 'Space 5' },
              { var: '--space-6', px: '24px', name: 'Space 6' },
              { var: '--space-8', px: '32px', name: 'Space 8' },
            ].map((space) => (
              <div key={space.var} className="flex items-center gap-4">
                <div 
                  className="bg-[var(--accent-blue)] rounded"
                  style={{ width: `var(${space.var})`, height: '32px' }}
                />
                <div>
                  <p className="text-sm font-semibold">{space.name}</p>
                  <p className="text-xs text-[var(--neutral-600)]">{space.px}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
