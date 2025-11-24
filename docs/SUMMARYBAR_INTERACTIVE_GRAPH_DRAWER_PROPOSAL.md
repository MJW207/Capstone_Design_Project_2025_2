# SummaryBar 인터랙티브 그래프 드로우아웃 구현 계획서

## 📋 목차
1. [개요](#개요)
2. [기능 요구사항](#기능-요구사항)
3. [UI/UX 설계](#uiux-설계)
4. [기술 구현 계획](#기술-구현-계획)
5. [데이터 구조](#데이터-구조)
6. [컴포넌트 구조](#컴포넌트-구조)
7. [구현 단계](#구현-단계)
8. [고려사항](#고려사항)

---

## 1. 개요

### 1.1 목표
SummaryBar의 특정 칩(주요지역, 차량보유, 주요 스마트폰, 흡연, 음주)을 클릭하면 오른쪽에서 드로우아웃이 나타나고, 해당 항목의 상세 통계를 시각화한 그래프를 표시합니다.

### 1.2 사용자 가치
- **빠른 인사이트**: 검색 결과의 분포를 한눈에 파악
- **인터랙티브 탐색**: 클릭 한 번으로 상세 통계 확인
- **시각적 이해**: 숫자보다 그래프로 직관적 이해

### 1.3 대상 칩
- ✅ **주요지역** (`region`) - 지역별 분포
- ✅ **차량보유** (`car`) - 보유/미보유 비율
- ✅ **주요 스마트폰** (`phone`) - 브랜드별 분포
- ✅ **흡연** (`smoking`) - 흡연자/비흡연자 비율
- ✅ **음주** (`drinking`) - 음주자/비음주자 비율

---

## 2. 기능 요구사항

### 2.1 핵심 기능
1. **칩 클릭 감지**: SummaryBar의 특정 칩 클릭 시 이벤트 발생
2. **드로우아웃 표시**: 오른쪽에서 슬라이드 인 애니메이션으로 드로우아웃 표시
3. **그래프 렌더링**: 칩 타입에 맞는 적절한 그래프 타입으로 데이터 시각화
4. **데이터 계산**: 전체 검색 결과에서 해당 항목의 통계 계산
5. **드로우아웃 닫기**: X 버튼 또는 오버레이 클릭으로 닫기

### 2.2 그래프 타입별 요구사항

#### 2.2.1 주요지역 (Region)
- **그래프 타입**: 수평 막대 그래프 (Top 10)
- **표시 정보**:
  - 지역명
  - 패널 수
  - 비율 (%)
  - 색상: 지역별 구분 (그라데이션)
- **추가 기능**: "전체 보기" 버튼으로 모든 지역 표시

#### 2.2.2 차량보유 (Car)
- **그래프 타입**: 도넛 차트 (Donut Chart)
- **표시 정보**:
  - 보유: 비율 + 패널 수
  - 미보유: 비율 + 패널 수
- **색상**: 
  - 보유: `emerald-500`
  - 미보유: `slate-300`

#### 2.2.3 주요 스마트폰 (Phone)
- **그래프 타입**: 수평 막대 그래프 (Top 5)
- **표시 정보**:
  - 브랜드명 (애플, 삼성, 기타)
  - 패널 수
  - 비율 (%)
- **색상**: 브랜드별 구분 (애플: `slate-700`, 삼성: `blue-600`, 기타: `gray-400`)

#### 2.2.4 흡연 (Smoking)
- **그래프 타입**: 도넛 차트 (Donut Chart)
- **표시 정보**:
  - 흡연자: 비율 + 패널 수
  - 비흡연자: 비율 + 패널 수
- **색상**:
  - 흡연자: `amber-500`
  - 비흡연자: `slate-300`

#### 2.2.5 음주 (Drinking)
- **그래프 타입**: 도넛 차트 (Donut Chart)
- **표시 정보**:
  - 음주자: 비율 + 패널 수
  - 비음주자: 비율 + 패널 수
- **색상**:
  - 음주자: `violet-500`
  - 비음주자: `slate-300`

### 2.3 상호작용 기능
- **호버 효과**: 그래프 요소에 마우스 오버 시 툴팁 표시 (상세 정보)
- **애니메이션**: 그래프 로드 시 부드러운 애니메이션 효과
- **반응형**: 모바일/태블릿에서도 적절한 크기로 표시

---

## 3. UI/UX 설계

### 3.1 드로우아웃 레이아웃

```
┌─────────────────────────────────────────┐
│  [X]  주요지역 분포                      │ ← Header
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  서울          ████████ 45%     │   │
│  │  경기          ██████ 32%       │   │
│  │  부산          ███ 12%          │   │
│  │  ...                             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [전체 보기]                             │
└─────────────────────────────────────────┘
```

### 3.2 드로우아웃 스펙
- **위치**: 화면 오른쪽
- **너비**: `480px` (기존 ExportDrawer와 동일)
- **높이**: `100vh` (전체 화면 높이)
- **애니메이션**: `slide-in-from-right` (300ms)
- **오버레이**: 반투명 검은색 배경 (`bg-black/40`, `backdrop-filter: blur(8px)`)

### 3.3 헤더 디자인
```tsx
<div className="px-6 py-5 border-b">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5" /> {/* 칩별 아이콘 */}
      <h2 className="text-lg font-semibold">주요지역 분포</h2>
    </div>
    <button onClick={onClose}>
      <X className="w-5 h-5" />
    </button>
  </div>
</div>
```

### 3.4 그래프 영역 디자인
- **패딩**: `px-6 py-6`
- **간격**: `space-y-4`
- **그래프 컨테이너**: `w-full h-auto`
- **범례**: 그래프 하단 또는 우측에 표시

---

## 4. 기술 구현 계획

### 4.1 라이브러리 선택

#### 옵션 1: Recharts (권장)
- **장점**: 
  - React 네이티브, TypeScript 지원
  - 커스터마이징 용이
  - 가벼움
- **설치**: `npm install recharts`

#### 옵션 2: Chart.js + react-chartjs-2
- **장점**: 다양한 차트 타입
- **단점**: 번들 크기 큼

#### 옵션 3: D3.js
- **장점**: 완전한 커스터마이징
- **단점**: 학습 곡선 높음, 구현 시간 오래 걸림

**결정**: **Recharts** 사용 (가장 적합)

### 4.2 필요한 차트 컴포넌트
```typescript
// Recharts 컴포넌트
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
```

### 4.3 데이터 계산 로직 위치
- **위치**: `src/components/pages/ResultsPage.tsx`
- **기존**: `allSearchResults`를 사용하여 통계 계산
- **추가**: 각 칩 타입별 상세 통계 계산 함수 추가

---

## 5. 데이터 구조

### 5.1 칩 클릭 이벤트 데이터
```typescript
interface ChipClickData {
  key: 'region' | 'car' | 'phone' | 'smoking' | 'drinking';
  label: string;
  value: string;
  color: string;
  // 추가: 전체 검색 결과 데이터
  allSearchResults: Panel[];
}
```

### 5.2 그래프 데이터 구조

#### 5.2.1 지역 분포 (Region)
```typescript
interface RegionData {
  name: string;      // "서울"
  count: number;     // 450
  rate: number;      // 45.0
  color: string;     // "#3b82f6"
}
```

#### 5.2.2 차량보유 (Car)
```typescript
interface CarData {
  name: string;      // "보유" | "미보유"
  count: number;    // 650 | 350
  rate: number;      // 65.0 | 35.0
  color: string;     // "#10b981" | "#cbd5e1"
}
```

#### 5.2.3 스마트폰 브랜드 (Phone)
```typescript
interface PhoneData {
  name: string;      // "애플" | "삼성" | "기타"
  count: number;     // 450 | 300 | 250
  rate: number;      // 45.0 | 30.0 | 25.0
  color: string;     // "#334155" | "#2563eb" | "#9ca3af"
}
```

#### 5.2.4 흡연/음주 (Smoking/Drinking)
```typescript
interface LifestyleData {
  name: string;      // "흡연자" | "비흡연자" 또는 "음주자" | "비음주자"
  count: number;     // 150 | 850
  rate: number;      // 15.0 | 85.0
  color: string;     // "#f59e0b" | "#cbd5e1"
}
```

### 5.3 통계 계산 함수 시그니처
```typescript
// src/utils/statistics.ts
export function calculateRegionDistribution(panels: Panel[]): RegionData[];
export function calculateCarOwnership(panels: Panel[]): CarData[];
export function calculatePhoneBrandDistribution(panels: Panel[]): PhoneData[];
export function calculateSmokingRate(panels: Panel[]): LifestyleData[];
export function calculateDrinkingRate(panels: Panel[]): LifestyleData[];
```

---

## 6. 컴포넌트 구조

### 6.1 파일 구조
```
src/
├── components/
│   └── drawers/
│       └── SummaryStatDrawer.tsx          # 메인 드로우아웃 컴포넌트
├── components/
│   └── charts/
│       ├── RegionBarChart.tsx             # 지역 막대 그래프
│       ├── CarDonutChart.tsx              # 차량 도넛 차트
│       ├── PhoneBarChart.tsx              # 스마트폰 막대 그래프
│       └── LifestyleDonutChart.tsx       # 흡연/음주 도넛 차트
└── utils/
    └── statistics.ts                       # 통계 계산 유틸리티
```

### 6.2 컴포넌트 계층 구조
```
ResultsPage
  └── SummaryBarNew
      └── (칩 클릭)
          └── SummaryStatDrawer
              ├── Header
              └── ChartContainer
                  ├── RegionBarChart (key === 'region')
                  ├── CarDonutChart (key === 'car')
                  ├── PhoneBarChart (key === 'phone')
                  ├── LifestyleDonutChart (key === 'smoking')
                  └── LifestyleDonutChart (key === 'drinking')
```

### 6.3 주요 컴포넌트 인터페이스

#### SummaryStatDrawer.tsx
```typescript
interface SummaryStatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chip: SummaryProfileChip;
  allSearchResults: Panel[];
}
```

#### RegionBarChart.tsx
```typescript
interface RegionBarChartProps {
  data: RegionData[];
  totalCount: number;
}
```

#### CarDonutChart.tsx
```typescript
interface CarDonutChartProps {
  data: CarData[];
  totalCount: number;
}
```

---

## 7. 구현 단계

### Phase 1: 기본 인프라 구축 (1-2일)
- [ ] `SummaryStatDrawer` 컴포넌트 생성
- [ ] 드로우아웃 레이아웃 및 애니메이션 구현
- [ ] `ResultsPage`에서 드로우아웃 상태 관리 추가
- [ ] 칩 클릭 이벤트 핸들러 연결

### Phase 2: 통계 계산 로직 (1일)
- [ ] `src/utils/statistics.ts` 파일 생성
- [ ] 각 칩 타입별 통계 계산 함수 구현:
  - [ ] `calculateRegionDistribution`
  - [ ] `calculateCarOwnership`
  - [ ] `calculatePhoneBrandDistribution`
  - [ ] `calculateSmokingRate`
  - [ ] `calculateDrinkingRate`
- [ ] 단위 테스트 작성

### Phase 3: 그래프 컴포넌트 구현 (2-3일)
- [ ] Recharts 설치 및 설정
- [ ] `RegionBarChart` 컴포넌트 구현
- [ ] `CarDonutChart` 컴포넌트 구현
- [ ] `PhoneBarChart` 컴포넌트 구현
- [ ] `LifestyleDonutChart` 컴포넌트 구현
- [ ] 툴팁 및 범례 추가

### Phase 4: 통합 및 최적화 (1일)
- [ ] `SummaryStatDrawer`에 그래프 컴포넌트 통합
- [ ] 칩 타입별 조건부 렌더링
- [ ] 로딩 상태 처리
- [ ] 에러 처리
- [ ] 애니메이션 최적화

### Phase 5: UI/UX 개선 (1일)
- [ ] 반응형 디자인 적용
- [ ] 다크 모드 지원
- [ ] 접근성 개선 (키보드 네비게이션, ARIA 레이블)
- [ ] 성능 최적화 (메모이제이션)

### Phase 6: 테스트 및 버그 수정 (1일)
- [ ] 다양한 데이터 케이스 테스트
- [ ] 엣지 케이스 처리 (빈 데이터, 0개 결과 등)
- [ ] 크로스 브라우저 테스트
- [ ] 사용자 피드백 반영

**총 예상 기간**: 7-9일

---

## 8. 고려사항

### 8.1 성능
- **대용량 데이터**: 검색 결과가 많을 때 (10,000+ 패널) 통계 계산 최적화
- **메모이제이션**: `useMemo`를 사용하여 불필요한 재계산 방지
- **지연 로딩**: 드로우아웃이 열릴 때만 통계 계산

### 8.2 데이터 정확성
- **null/undefined 처리**: 메타데이터가 없는 패널 처리
- **데이터 정규화**: 다양한 형식의 데이터 통일 (예: "있다"/"있음"/"yes")
- **에러 핸들링**: 통계 계산 실패 시 fallback UI 표시

### 8.3 사용자 경험
- **로딩 상태**: 통계 계산 중 스켈레톤 UI 또는 로딩 스피너
- **빈 상태**: 데이터가 없을 때 안내 메시지
- **애니메이션**: 너무 빠르거나 느린 애니메이션 조정

### 8.4 확장성
- **새로운 칩 추가**: 향후 다른 칩(예: 학력, 직업) 추가 시 쉽게 확장 가능한 구조
- **그래프 타입 확장**: 필요 시 다른 그래프 타입(라인, 영역 등) 추가

### 8.5 접근성
- **키보드 네비게이션**: Tab으로 드로우아웃 열기/닫기
- **스크린 리더**: ARIA 레이블 및 설명 추가
- **색상 대비**: WCAG 2.1 AA 기준 준수

---

## 9. 예상 결과물

### 9.1 사용자 플로우
1. 사용자가 검색 실행
2. SummaryBar에 통계 칩 표시
3. 사용자가 "주요지역" 칩 클릭
4. 오른쪽에서 드로우아웃 슬라이드 인
5. 지역별 분포 막대 그래프 표시
6. 사용자가 그래프 요소에 호버하여 상세 정보 확인
7. X 버튼 또는 오버레이 클릭으로 닫기

### 9.2 시각적 예시

#### 주요지역 드로우아웃
```
┌─────────────────────────────────────┐
│  [X]  🗺️  주요지역 분포              │
├─────────────────────────────────────┤
│                                     │
│  서울          ████████████ 45%     │
│  경기          ████████ 32%         │
│  부산          ███ 12%              │
│  인천          ██ 8%                │
│  대구          █ 3%                 │
│                                     │
│  [전체 보기]                         │
└─────────────────────────────────────┘
```

#### 차량보유 드로우아웃
```
┌─────────────────────────────────────┐
│  [X]  🚗  차량 보유 분포             │
├─────────────────────────────────────┤
│                                     │
│         ┌─────────┐                 │
│         │   65%   │                 │
│         │  보유   │                 │
│         └─────────┘                 │
│     650명 (65%)                     │
│     350명 (35%)                     │
│                                     │
└─────────────────────────────────────┘
```

---

## 10. 다음 단계

1. **승인 및 우선순위 결정**: 이 계획서 검토 후 구현 시작
2. **라이브러리 설치**: Recharts 설치 및 기본 설정
3. **프로토타입 개발**: 하나의 칩(예: 차량보유)으로 프로토타입 구현
4. **피드백 수집**: 프로토타입 테스트 후 개선사항 반영
5. **전체 구현**: 나머지 칩들 구현

---

## 11. 참고 자료

- [Recharts 공식 문서](https://recharts.org/)
- [기존 Drawer 컴포넌트](./src/components/drawers/)
- [SummaryBar 컴포넌트](./src/ui/summary/SummaryBarNew.tsx)
- [통계 계산 로직](./src/components/pages/ResultsPage.tsx)

---

**작성일**: 2025-01-XX  
**작성자**: AI Assistant  
**버전**: 1.0

