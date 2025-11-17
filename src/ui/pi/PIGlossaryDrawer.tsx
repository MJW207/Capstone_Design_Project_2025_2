import { X, AlertTriangle } from 'lucide-react';

interface PIGlossaryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const glossaryTerms = [
  {
    term: '군집 (Cluster)',
    definition: '비슷한 답변 패턴을 가진 사람들의 묶음입니다. 같은 군집에 속한 사람들은 설문 응답이 유사한 경향을 보입니다.',
  },
  {
    term: '노이즈 (Noise)',
    definition: '어느 그룹에도 명확하게 속하지 않는 사람들입니다. 응답 패턴이 독특하거나 불규칙한 경우 노이즈로 분류됩니다.',
  },
  {
    term: 'UMAP',
    definition: '고차원 데이터를 2차원으로 축소하여 시각화하는 기법입니다. 보기 편하게 만드는 용도이며, 실제 군집 분석은 원본 데이터로 수행됩니다.',
  },
  {
    term: 'KNN+Leiden',
    definition: 'KNN으로 이웃 관계를 구축하고, Leiden 알고리즘으로 그래프 기반 군집을 만드는 방법입니다. 연결된 패턴을 찾아 더 정확한 군집을 생성합니다.',
  },
  {
    term: 'KNN (K-Nearest Neighbors)',
    definition: '각 데이터 포인트에서 가장 가까운 K개의 이웃을 찾는 알고리즘입니다. 군집화에서는 이웃 관계를 구축하는 데 사용됩니다.',
  },
  {
    term: 'Leiden 알고리즘',
    definition: '그래프에서 최적의 군집을 찾는 알고리즘입니다. 모듈성(Modularity)을 최대화하여 연결성이 강한 노드들을 하나의 군집으로 묶습니다.',
  },
  {
    term: '실루엣 점수 (Silhouette Score)',
    definition: '군집이 얼마나 또렷하게 나뉘었는지를 나타내는 지표입니다. -1에서 +1 사이 값이며, 1에 가까울수록 군집이 명확합니다.',
  },
  {
    term: 'ANOVA (분산분석)',
    definition: '여러 군집 간의 평균 차이가 통계적으로 유의한지 검정하는 방법입니다. 유의하다는 것은 우연이 아닐 가능성이 높다는 뜻이지, 인과관계를 의미하지 않습니다.',
  },
  {
    term: '표준화 (Standardization)',
    definition: '서로 다른 척도의 변수들을 동일한 기준으로 변환하는 과정입니다. 평균 0, 표준편차 1이 되도록 조정합니다.',
  },
  {
    term: '가중치 (Weight)',
    definition: '특정 문항이 군집화에 미치는 영향의 정도입니다. 중요한 문항에는 더 높은 가중치를 부여할 수 있습니다.',
  },
];

export function PIGlossaryDrawer({ isOpen, onClose }: PIGlossaryDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: 'rgba(0, 0, 0, 0.32)',
          backdropFilter: 'blur(6px)',
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-[480px] flex flex-col"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(24px)',
          boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.12)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>
              용어 설명
            </h2>
            <p style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', marginTop: '4px' }}>
              군집 분석에서 사용되는 주요 개념들
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: '#64748B' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {glossaryTerms.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl"
              style={{
                background: 'rgba(241, 245, 249, 0.6)',
                border: '1px solid rgba(17, 24, 39, 0.06)',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
                {item.term}
              </h3>
              <p style={{ fontSize: '13px', fontWeight: 400, color: '#64748B', lineHeight: '1.5' }}>
                {item.definition}
              </p>
            </div>
          ))}
        </div>

        {/* Footer - Warning */}
        <div className="px-6 py-4 border-t"
          style={{ borderColor: 'rgba(17, 24, 39, 0.08)' }}
        >
          <div className="flex items-start gap-3 p-4 rounded-xl"
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#D97706', marginBottom: '4px' }}>
                해석 시 주의사항
              </p>
              <p style={{ fontSize: '11px', fontWeight: 400, color: '#D97706', lineHeight: '1.4' }}>
                과도한 인과 해석을 피하세요. 군집 분석은 패턴을 발견하는 탐색적 방법이며, 인과관계를 증명하지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
