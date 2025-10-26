import { useState } from 'react';
import { HelpCircle, ChevronDown, Info } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
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
                      설문 답변을 숫자로 바꿔 유사한 패턴끼리 모았어요.
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
                      선택·숫자 답변을 표준화하고 빠진 값은 '무응답'으로 처리했어요.
                    </p>
                    <p style={{ fontSize: '11px', fontWeight: 400, color: '#94A3B8', lineHeight: '1.4' }}>
                      중요 문항은 살짝 더 가중치를 줬습니다.
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
                      KNN으로 이웃 관계를 만들고, <strong>Leiden 알고리즘</strong>으로 최적의 그룹을 찾아요.
                    </p>
                    <p style={{ fontSize: '11px', fontWeight: 400, color: '#94A3B8', lineHeight: '1.4' }}>
                      그래프 기반으로 연결된 패턴을 찾아 더 정확한 군집을 만듭니다.
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
                  KNN+Leiden이 뭔가요?
                </p>
                <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', lineHeight: '1.4' }}>
                  KNN으로 이웃을 찾고, Leiden으로 연결된 패턴을 찾아 군집을 만드는 방법입니다.
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'rgba(241, 245, 249, 0.6)', border: '1px solid rgba(17, 24, 39, 0.06)' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                  그래프 기반이 뭔가요?
                </p>
                <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', lineHeight: '1.4' }}>
                  패널들을 점으로, 유사성을 선으로 연결한 네트워크에서 군집을 찾는 방식입니다.
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'rgba(241, 245, 249, 0.6)', border: '1px solid rgba(17, 24, 39, 0.06)' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                  왜 KNN+Leiden을 썼나요?
                </p>
                <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', lineHeight: '1.4' }}>
                  연결된 패턴을 찾아 더 정확하고 해석하기 쉬운 군집을 만들 수 있어요.
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
