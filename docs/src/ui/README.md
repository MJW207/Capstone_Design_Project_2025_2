# UI 컴포넌트 폴더 구조

이 폴더는 Figma에서 UI를 수정하고 fetch할 때 편리하도록 모든 UI 관련 컴포넌트를 모아둔 폴더입니다.

## 폴더 구조

```
src/ui/
├── base/              # 기본 UI 컴포넌트 (shadcn/ui 스타일)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── pi/                # PI 커스텀 컴포넌트
│   ├── PIButton.tsx
│   ├── PICard.tsx
│   ├── PIPagination.tsx
│   └── ...
├── summary/           # Summary 관련 컴포넌트
│   ├── SummaryBar.tsx
│   ├── KpiCard.tsx
│   └── ...
├── filter/            # 필터 관련 컴포넌트
│   ├── AgeSlider.tsx
│   ├── GenderChips.tsx
│   └── ...
├── profiling/         # 프로파일링 컴포넌트
│   ├── ProfileView.tsx
│   └── ...
├── profiling-ui-kit/  # 프로파일링 UI Kit
│   └── components/
│       ├── comparison/
│       └── ...
├── figma/             # Figma 관련 컴포넌트
│   └── ImageWithFallback.tsx
└── results/           # 결과 관련 컴포넌트
    └── SummaryBar.tsx
```

## 사용 방법

### Import 경로 예시

```typescript
// 기본 UI 컴포넌트
import { Button } from '../ui/base/button';
import { Card } from '../ui/base/card';

// PI 컴포넌트
import { PIButton } from '../ui/pi/PIButton';
import { PIPagination } from '../ui/pi/PIPagination';

// Summary 컴포넌트
import { SummaryBar } from '../ui/summary/SummaryBar';

// Filter 컴포넌트
import { AgeSlider } from '../ui/filter/AgeSlider';
```

## Figma 연동

Figma에서 UI를 수정할 때:
1. `src/ui/` 폴더의 해당 컴포넌트를 찾아서 수정
2. 모든 UI 관련 파일이 한 곳에 모여있어 관리가 편리함
3. Figma에서 fetch할 때도 `src/ui/` 폴더만 확인하면 됨




이 폴더는 Figma에서 UI를 수정하고 fetch할 때 편리하도록 모든 UI 관련 컴포넌트를 모아둔 폴더입니다.

## 폴더 구조

```
src/ui/
├── base/              # 기본 UI 컴포넌트 (shadcn/ui 스타일)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── pi/                # PI 커스텀 컴포넌트
│   ├── PIButton.tsx
│   ├── PICard.tsx
│   ├── PIPagination.tsx
│   └── ...
├── summary/           # Summary 관련 컴포넌트
│   ├── SummaryBar.tsx
│   ├── KpiCard.tsx
│   └── ...
├── filter/            # 필터 관련 컴포넌트
│   ├── AgeSlider.tsx
│   ├── GenderChips.tsx
│   └── ...
├── profiling/         # 프로파일링 컴포넌트
│   ├── ProfileView.tsx
│   └── ...
├── profiling-ui-kit/  # 프로파일링 UI Kit
│   └── components/
│       ├── comparison/
│       └── ...
├── figma/             # Figma 관련 컴포넌트
│   └── ImageWithFallback.tsx
└── results/           # 결과 관련 컴포넌트
    └── SummaryBar.tsx
```

## 사용 방법

### Import 경로 예시

```typescript
// 기본 UI 컴포넌트
import { Button } from '../ui/base/button';
import { Card } from '../ui/base/card';

// PI 컴포넌트
import { PIButton } from '../ui/pi/PIButton';
import { PIPagination } from '../ui/pi/PIPagination';

// Summary 컴포넌트
import { SummaryBar } from '../ui/summary/SummaryBar';

// Filter 컴포넌트
import { AgeSlider } from '../ui/filter/AgeSlider';
```

## Figma 연동

Figma에서 UI를 수정할 때:
1. `src/ui/` 폴더의 해당 컴포넌트를 찾아서 수정
2. 모든 UI 관련 파일이 한 곳에 모여있어 관리가 편리함
3. Figma에서 fetch할 때도 `src/ui/` 폴더만 확인하면 됨


