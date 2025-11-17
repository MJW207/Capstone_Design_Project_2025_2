import { useState } from 'react';
import { HelpCircle, ChevronDown, Info } from 'lucide-react';
import { Switch } from '../base/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../base/accordion';
import { PIButton } from './PIButton';
import { PIGlossaryDrawer } from './PIGlossaryDrawer';

interface PIClusteringExplainerProps {
  silhouette?: number;
  noiseRatio?: number;
  clusterCount?: number;
}

export function PIClusteringExplainer({
  silhouette = 0.62,
  noiseRatio = 8.5,
  clusterCount = 5,
}: PIClusteringExplainerProps) {
  const [isSimpleMode, setIsSimpleMode] = useState(true);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);

  return (
    <>
      <div
        className="flex flex-col rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(17, 24, 39, 0.10)',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b relative"
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
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '20px' }}>📊</span>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
                군집은 이렇게 만들었어요
              </h3>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
                  쉬운 설명
                </span>
                <Switch checked={isSimpleMode} onCheckedChange={setIsSimpleMode} />
              </div>

              <button
                onClick={() => setIsGlossaryOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors"
              >
                <HelpCircle className="w-4 h-4" style={{ color: '#2563EB' }} />
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#2563EB' }}>
                  용어 설명
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* TL;DR - Summary Card */}
          <div className="flex gap-6">
            <div className="flex-1 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563EB' }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>?</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>
                      무엇?
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', lineHeight: '1.5' }}>
                      비슷하게 답한 사람들끼리 자연스럽게 묶인 그룹이에요.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16A34A' }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>-&gt;</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>
                      어떻게?
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', lineHeight: '1.5' }}>
                      패널 특성을 숫자로 변환해 유사한 패턴끼리 자동으로 묶었어요.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>!</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>
                      주의!
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', lineHeight: '1.5' }}>
                      지도가 아니라 가까울수록 비슷한 취향을 뜻해요.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mini Infographic */}
            <div className="w-[240px] h-[140px] flex items-center justify-center rounded-xl"
              style={{
                background: 'rgba(241, 245, 249, 0.6)',
                border: '1px solid rgba(17, 24, 39, 0.06)',
              }}
            >
              <svg width="200" height="120" viewBox="0 0 200 120">
                {/* Cluster 1 - Blue */}
                <g>
                  <circle cx="50" cy="35" r="4" fill="#2563EB" opacity="0.6" />
                  <circle cx="45" cy="42" r="4" fill="#2563EB" opacity="0.6" />
                  <circle cx="55" cy="40" r="4" fill="#2563EB" opacity="0.6" />
                  <circle cx="52" cy="30" r="4" fill="#2563EB" opacity="0.6" />
                  <circle cx="58" cy="35" r="4" fill="#2563EB" opacity="0.6" />
                </g>

                {/* Cluster 2 - Green */}
                <g>
                  <circle cx="100" cy="80" r="4" fill="#16A34A" opacity="0.6" />
                  <circle cx="95" cy="75" r="4" fill="#16A34A" opacity="0.6" />
                  <circle cx="105" cy="75" r="4" fill="#16A34A" opacity="0.6" />
                  <circle cx="98" cy="85" r="4" fill="#16A34A" opacity="0.6" />
                  <circle cx="107" cy="82" r="4" fill="#16A34A" opacity="0.6" />
                </g>

                {/* Cluster 3 - Amber */}
                <g>
                  <circle cx="150" cy="45" r="4" fill="#F59E0B" opacity="0.6" />
                  <circle cx="145" cy="50" r="4" fill="#F59E0B" opacity="0.6" />
                  <circle cx="155" cy="50" r="4" fill="#F59E0B" opacity="0.6" />
                  <circle cx="148" cy="40" r="4" fill="#F59E0B" opacity="0.6" />
                </g>

                {/* Noise - Gray */}
                <circle cx="75" cy="60" r="3" fill="#94A3B8" opacity="0.4" />
                <circle cx="125" cy="50" r="3" fill="#94A3B8" opacity="0.4" />
                <circle cx="170" cy="70" r="3" fill="#94A3B8" opacity="0.4" />
              </svg>
            </div>
          </div>

          {/* Quality Callouts */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(37, 99, 235, 0.04)', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-8 rounded-full" style={{ background: silhouette > 0.5 ? '#16A34A' : '#F59E0B' }} />
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>실루엣</p>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>{silhouette.toFixed(2)}</p>
                </div>
              </div>
              <p style={{ fontSize: '11px', fontWeight: 400, color: '#64748B', lineHeight: '1.4' }}>
                +1에 가까울수록 그룹이 또렷해요.
              </p>
            </div>

            <div className="p-4 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-8 rounded-full" style={{ background: noiseRatio < 15 ? '#16A34A' : '#F59E0B' }} />
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>노이즈</p>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>{noiseRatio.toFixed(1)}%</p>
                </div>
              </div>
              <p style={{ fontSize: '11px', fontWeight: 400, color: '#64748B', lineHeight: '1.4' }}>
                회색 점이 많으면 해석에 주의해요.
              </p>
            </div>

            <div className="p-4 rounded-xl" style={{ background: 'rgba(124, 58, 237, 0.04)', border: '1px solid rgba(124, 58, 237, 0.1)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-8 rounded-full" style={{ background: clusterCount >= 3 && clusterCount <= 7 ? '#16A34A' : '#F59E0B' }} />
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>군집 수</p>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>{clusterCount}개</p>
                </div>
              </div>
              <p style={{ fontSize: '11px', fontWeight: 400, color: '#64748B', lineHeight: '1.4' }}>
                너무 많거나 적으면 의미가 약해요.
              </p>
            </div>
          </div>

          {/* Steps Accordion - Only show if NOT simple mode */}
          {!isSimpleMode && (
            <Accordion type="single" collapsible defaultValue="step-1">
              <AccordionItem value="step-1" className="border-b" style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}>
                <AccordionTrigger style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                  1. 준비하기
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p style={{ fontSize: '13px', fontWeight: 400, color: '#0F172A', lineHeight: '1.5' }}>
                      연속형 변수는 표준화하고, 이진 변수는 그대로 사용했어요. 결측치는 0으로 처리했습니다.
                    </p>
                    <p style={{ fontSize: '11px', fontWeight: 400, color: '#94A3B8', lineHeight: '1.4' }}>
                      샘플 수에 따라 자동으로 최적의 전처리 방법을 선택합니다.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-2" className="border-b" style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}>
                <AccordionTrigger style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                  2. 묶기
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p style={{ fontSize: '13px', fontWeight: 400, color: '#0F172A', lineHeight: '1.5' }}>
                      샘플 수에 따라 <strong>동적 전략</strong>으로 최적의 알고리즘을 선택해요. 
                      작은 샘플은 K-Means, 큰 샘플은 MiniBatch K-Means를 사용합니다.
                    </p>
                    <p style={{ fontSize: '11px', fontWeight: 400, color: '#94A3B8', lineHeight: '1.4' }}>
                      Silhouette Score를 기준으로 최적의 군집 수(k)를 자동으로 찾습니다.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-3">
                <AccordionTrigger style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                  3. 보여주기
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p style={{ fontSize: '13px', fontWeight: 400, color: '#0F172A', lineHeight: '1.5' }}>
                      UMAP으로 2D에 배치해 가까우면 비슷하게 보이도록 그렸어요.
                    </p>
                    <p style={{ fontSize: '11px', fontWeight: 400, color: '#94A3B8', lineHeight: '1.4' }}>
                      보기 편하려고 축소만 했고, 군집 품질 평가는 원래 공간에서 계산합니다.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Common Questions FAQ */}
          <div className="space-y-3">
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              자주 묻는 질문
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(241, 245, 249, 0.6)', border: '1px solid rgba(17, 24, 39, 0.06)' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                  동적 전략이 뭔가요?
                </p>
                <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', lineHeight: '1.4' }}>
                  샘플 수에 따라 자동으로 최적의 클러스터링 방법을 선택합니다. 
                  100명 미만은 프로파일링만, 100~500명은 Simple, 500~3,000명은 Standard, 
                  3,000명 이상은 Advanced 전략을 사용합니다.
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'rgba(241, 245, 249, 0.6)', border: '1px solid rgba(17, 24, 39, 0.06)' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                  K-Means와 MiniBatch K-Means의 차이는?
                </p>
                <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', lineHeight: '1.4' }}>
                  K-Means는 전체 데이터를 사용하고, MiniBatch K-Means는 배치 단위로 처리해 
                  대용량 데이터에서 빠르게 작동합니다.
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'rgba(241, 245, 249, 0.6)', border: '1px solid rgba(17, 24, 39, 0.06)' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                  최적 k는 어떻게 정하나요?
                </p>
                <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', lineHeight: '1.4' }}>
                  여러 k 값에 대해 Silhouette Score를 계산하고, 가장 높은 점수의 k를 선택합니다. 
                  최소 클러스터 크기 제약도 함께 고려합니다.
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'rgba(241, 245, 249, 0.6)', border: '1px solid rgba(17, 24, 39, 0.06)' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                  통계적으로 다르다는 게 뭔가요?
                </p>
                <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', lineHeight: '1.4' }}>
                  그 변수에서 군집 평균이 유의하게 달랐다는 뜻이에요(인과X).
                </p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 rounded-xl"
            style={{
              background: 'rgba(245, 158, 11, 0.06)',
              border: '1px solid rgba(245, 158, 11, 0.15)',
            }}
          >
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
            <p style={{ fontSize: '12px', fontWeight: 400, color: '#D97706', lineHeight: '1.5' }}>
              표본이 작거나 노이즈가 많은 군집은 해석에 주의하세요. 과도한 인과 해석을 피하세요.
            </p>
          </div>
        </div>
      </div>

      {/* Glossary Drawer */}
      <PIGlossaryDrawer
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
      />
    </>
  );
}
