# SummaryBar 추가 정보 분석 문서

## 1. NeonDB 스키마 구조

### 1.1 `merged.panel_data` 테이블

#### 기본 컬럼
- `mb_sn` (VARCHAR, PK): 패널 고유 ID

#### JSONB 컬럼

**`base_profile` (JSONB)** - 인구통계 및 기본 프로필 정보

**`quick_answers` (JSONB)** - Qpoll 질문-답변 데이터

---

## 2. `base_profile` 필드 상세 분석

### 2.1 현재 SummaryBar에 표시되는 필드 ✅

| 필드명 | 현재 표시 여부 | 표시 형식 |
|--------|---------------|----------|
| `gender` | ✅ | 성비 (남:여 비율) |
| `age` | ✅ | 평균 연령 |
| `location` | ✅ | 주요 지역 (TOP 1) |
| `detail_location` | ❌ | - |
| `결혼여부` | ✅ | 기혼/미혼 비율 |
| `자녀수` | ✅ | 평균 자녀 수 (내부 계산) |
| `가족수` | ✅ | 가구원 수 분포 (내부 계산) |
| `최종학력` | ✅ | 학력 분포 (내부 계산) |
| `직업` | ✅ | 주요 직업 (TOP 1) |
| `직무` | ❌ | - |
| `월평균 개인소득` | ✅ | 평균 월수입 |
| `월평균 가구소득` | ✅ | 평균 월수입 (개인소득 없을 때) |

### 2.2 현재 SummaryBar에 표시되지 않는 필드 ❌

#### A. 전자제품 관련
- `보유전제품` (배열): ["스마트폰", "태블릿", "노트북", ...]
- `보유 휴대폰 단말기 브랜드`: "애플", "삼성", "LG", ...
- `보유 휴대폰 모델명`: "아이폰16 프로", "갤럭시 S24", ...

**추가 가능성:**
- ✅ **주요 스마트폰 브랜드**: TOP 1 브랜드 + 비율 (예: "애플 45%")
- ✅ **전자제품 보유율**: 스마트폰/태블릿/노트북 보유 비율
- ⚠️ **휴대폰 모델명**: 너무 세분화되어 SummaryBar에 적합하지 않음

#### B. 자동차 관련
- `보유차량여부`: "없다" | "있다"
- `자동차 제조사`: "무응답" | "현대" | "기아" | "테슬라" | ...
- `자동차 모델`: "무응답" | "아반떼" | "소나타" | ...

**추가 가능성:**
- ✅ **차량 보유율**: 차량 보유 패널 비율 (예: "차량 보유 65%")
- ✅ **주요 자동차 브랜드**: TOP 1 브랜드 + 비율 (예: "현대 30%")
- ⚠️ **자동차 모델명**: 너무 세분화되어 SummaryBar에 적합하지 않음

#### C. 흡연 관련
- `흡연경험` (배열): ["과거 흡연", "현재 흡연", "흡연 경험 없음", ...]
- `흡연경험 담배브랜드` (배열): ["에쎄", "말보로", ...]
- `궐련형 전자담배/가열식 전자담배 이용경험` (배열): ["과거 이용", "현재 이용", ...]

**추가 가능성:**
- ✅ **흡연 경험 비율**: 현재 흡연자 비율 (예: "흡연자 15%")
- ✅ **전자담배 이용 비율**: 전자담배 이용자 비율 (예: "전자담배 8%")
- ⚠️ **담배 브랜드**: 너무 세분화되어 SummaryBar에 적합하지 않음

#### D. 음주 관련
- `음용경험 술` (배열): ["과거 음주", "현재 음주", "음주 경험 없음", ...]

**추가 가능성:**
- ✅ **음주 경험 비율**: 현재 음주자 비율 (예: "음주자 70%")

#### E. 기타
- `직무`: 직업의 세부 직무 (예: "고객상담•TM")
  - ⚠️ **직무**: 직업보다 세분화되어 SummaryBar에 적합하지 않을 수 있음

---

## 3. SummaryBar 추가 정보 제안

### 3.1 우선순위 높음 (추가 권장) ⭐⭐⭐

#### 1. **차량 보유율**
- **필드**: `보유차량여부`
- **계산**: "있다" 응답 비율
- **표시 형식**: "차량 보유 65%"
- **아이콘**: 🚗 (Car)
- **색상**: slate
- **이유**: 소비 패턴 및 라이프스타일 파악에 유용

#### 2. **주요 스마트폰 브랜드**
- **필드**: `보유 휴대폰 단말기 브랜드`
- **계산**: TOP 1 브랜드 + 비율
- **표시 형식**: "애플 45%" 또는 "삼성 35%"
- **아이콘**: 📱 (Smartphone)
- **색상**: indigo
- **이유**: 디지털 소비 패턴 파악에 유용

#### 3. **흡연자 비율**
- **필드**: `흡연경험` (배열에서 "현재 흡연" 포함 여부)
- **계산**: 현재 흡연자 비율
- **표시 형식**: "흡연자 15%"
- **아이콘**: 🚬 (Cigarette) 또는 ⚠️
- **색상**: red 또는 amber
- **이유**: 건강 관련 통계로 유용

#### 4. **음주자 비율**
- **필드**: `음용경험 술` (배열에서 "현재 음주" 포함 여부)
- **계산**: 현재 음주자 비율
- **표시 형식**: "음주자 70%"
- **아이콘**: 🍺 (Beer) 또는 🍷
- **색상**: amber
- **이유**: 라이프스타일 파악에 유용

### 3.2 우선순위 중간 (선택적 추가) ⭐⭐

#### 5. **전자담배 이용 비율**
- **필드**: `궐련형 전자담배/가열식 전자담배 이용경험`
- **계산**: 현재 이용자 비율
- **표시 형식**: "전자담배 8%"
- **아이콘**: 💨 (Vape)
- **색상**: slate
- **이유**: 흡연 관련 세부 정보

#### 6. **전자제품 보유율**
- **필드**: `보유전제품` (배열)
- **계산**: 특정 제품 보유 비율 (예: 태블릿, 노트북)
- **표시 형식**: "태블릿 보유 40%"
- **아이콘**: 📱 (Tablet) 또는 💻
- **색상**: blue
- **이유**: 디지털 소비 패턴 파악

### 3.3 우선순위 낮음 (추가 비권장) ⭐

#### 7. **주요 자동차 브랜드**
- **필드**: `자동차 제조사`
- **계산**: TOP 1 브랜드 + 비율
- **표시 형식**: "현대 30%"
- **아이콘**: 🚗
- **색상**: slate
- **이유**: 차량 보유율이 더 중요, 브랜드는 세부 정보

#### 8. **직무**
- **필드**: `직무`
- **계산**: TOP 1 직무 + 비율
- **표시 형식**: "고객상담•TM 12%"
- **아이콘**: 💼
- **색상**: violet
- **이유**: 직업보다 세분화되어 SummaryBar에 적합하지 않음

---

## 4. SummaryBar 레이아웃 고려사항

### 4.1 현재 SummaryBar 구조

```
┌─────────────────────────────────────────────────────────────┐
│ [👥 744 FOUND] │ [📅 25세] [👫 여50%] [📍 서울 11%] [💬 Q+W 0%] │
├─────────────────────────────────────────────────────────────┤
│ [📅 평균 연령: 25세] [📍 주요 지역: 서울 11%] [💼 주요 직업: ...] │
│ [💚 결혼 여부: 기혼 30%, 미혼 70%] [💰 평균 월수입: 250만원]      │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 추가 정보 배치 방안

#### 방안 A: 기존 칩 레일에 추가 (권장)
- 현재 프로필 칩 레일에 새로운 칩 추가
- 스크롤 가능하므로 정보 밀도 증가 가능
- **장점**: 기존 레이아웃 유지, 확장성 좋음
- **단점**: 칩이 많아지면 스크롤 필요

#### 방안 B: 두 번째 칩 레일 추가
- 첫 번째 레일: 기본 정보 (연령, 성비, 지역, 소득, 결혼)
- 두 번째 레일: 라이프스타일 정보 (차량, 스마트폰, 흡연, 음주)
- **장점**: 정보 분류 명확
- **단점**: 화면 공간 더 많이 사용

#### 방안 C: 접기/펼치기 기능 추가
- 기본 정보만 표시, "더 보기" 버튼으로 확장
- **장점**: 화면 공간 절약
- **단점**: 추가 클릭 필요

---

## 5. 데이터 계산 로직 제안

### 5.1 차량 보유율

```typescript
// 차량 보유율 계산
const carOwnershipStatuses = allSearchResults
  .map((p: Panel) => {
    const status = p.metadata?.["보유차량여부"];
    if (!status) return null;
    const lower = String(status).toLowerCase();
    return lower.includes('있다') || lower === '있음' ? 'has_car' : 'no_car';
  })
  .filter(Boolean) as string[];

const carOwnershipRate = carOwnershipStatuses.length > 0
  ? carOwnershipStatuses.filter(s => s === 'has_car').length / carOwnershipStatuses.length
  : undefined;
```

### 5.2 주요 스마트폰 브랜드

```typescript
// 스마트폰 브랜드 통계
const phoneBrands = allSearchResults
  .map((p: Panel) => {
    const brand = p.metadata?.["보유 휴대폰 단말기 브랜드"];
    if (!brand || brand === '무응답') return null;
    return String(brand).trim();
  })
  .filter(Boolean) as string[];

const phoneBrandCount: Record<string, number> = {};
phoneBrands.forEach(brand => {
  phoneBrandCount[brand] = (phoneBrandCount[brand] || 0) + 1;
});

const topPhoneBrand = Object.entries(phoneBrandCount)
  .sort((a, b) => b[1] - a[1])[0];

// topPhoneBrand: ["애플", 335] -> "애플 45%"
```

### 5.3 흡연자 비율

```typescript
// 흡연자 비율 계산
const smokingStatuses = allSearchResults
  .map((p: Panel) => {
    const experiences = p.metadata?.["흡연경험"];
    if (!Array.isArray(experiences)) return null;
    return experiences.some(exp => 
      String(exp).includes('현재 흡연') || 
      String(exp).toLowerCase().includes('current')
    ) ? 'current_smoker' : 'non_smoker';
  })
  .filter(Boolean) as string[];

const smokingRate = smokingStatuses.length > 0
  ? smokingStatuses.filter(s => s === 'current_smoker').length / smokingStatuses.length
  : undefined;
```

### 5.4 음주자 비율

```typescript
// 음주자 비율 계산
const drinkingStatuses = allSearchResults
  .map((p: Panel) => {
    const experiences = p.metadata?.["음용경험 술"];
    if (!Array.isArray(experiences)) return null;
    return experiences.some(exp => 
      String(exp).includes('현재 음주') || 
      String(exp).toLowerCase().includes('current')
    ) ? 'current_drinker' : 'non_drinker';
  })
  .filter(Boolean) as string[];

const drinkingRate = drinkingStatuses.length > 0
  ? drinkingStatuses.filter(s => s === 'current_drinker').length / drinkingStatuses.length
  : undefined;
```

---

## 6. SummaryData 타입 확장 제안

```typescript
export type SummaryData = {
  // ... 기존 필드들 ...
  
  // 라이프스타일 관련 (신규)
  carOwnershipRate?: number;        // 차량 보유율 (0~1)
  topPhoneBrand?: {                 // 주요 스마트폰 브랜드
    name: string;
    count: number;
    rate: number;                   // 비율 (0~100)
  };
  smokingRate?: number;              // 흡연자 비율 (0~1)
  vapingRate?: number;               // 전자담배 이용 비율 (0~1)
  drinkingRate?: number;             // 음주자 비율 (0~1)
  topCarBrand?: {                   // 주요 자동차 브랜드 (선택적)
    name: string;
    count: number;
    rate: number;
  };
  electronicsOwnership?: {          // 전자제품 보유율 (선택적)
    tablet?: number;                 // 태블릿 보유율 (0~1)
    laptop?: number;                 // 노트북 보유율 (0~1)
  };
};
```

---

## 7. 구현 우선순위

### Phase 1: 즉시 추가 (우선순위 높음) ⭐⭐⭐
1. ✅ 차량 보유율
2. ✅ 주요 스마트폰 브랜드
3. ✅ 흡연자 비율
4. ✅ 음주자 비율

### Phase 2: 선택적 추가 (우선순위 중간) ⭐⭐
5. 전자담배 이용 비율
6. 전자제품 보유율 (태블릿/노트북)

### Phase 3: 추가 비권장 (우선순위 낮음) ⭐
7. 주요 자동차 브랜드
8. 직무

---

## 8. UI/UX 고려사항

### 8.1 칩 레이아웃
- 현재 프로필 칩 레일에 추가하는 방식 권장
- 스크롤 가능하므로 정보 밀도 증가 가능
- 각 칩은 클릭 가능하여 필터로 활용 가능

### 8.2 색상 체계
- 차량: slate (중립적)
- 스마트폰: indigo (디지털 느낌)
- 흡연: red 또는 amber (주의)
- 음주: amber (중립적)
- 전자담배: slate (중립적)

### 8.3 아이콘 선택
- 차량: 🚗 (Car) 또는 Car 아이콘
- 스마트폰: 📱 (Smartphone) 또는 Phone 아이콘
- 흡연: 🚬 (Cigarette) 또는 AlertCircle 아이콘
- 음주: 🍺 (Beer) 또는 Wine 아이콘
- 전자담배: 💨 (Vape) 또는 Wind 아이콘

---

## 9. 데이터 품질 고려사항

### 9.1 데이터 완성도
- 일부 필드가 "무응답" 또는 빈 값일 수 있음
- 계산 시 null/undefined 처리 필요
- 비율 계산 시 유효한 응답 수 기준으로 계산

### 9.2 배열 필드 처리
- `흡연경험`, `음용경험 술`, `보유전제품` 등은 배열
- 배열 내 문자열 매칭 로직 필요
- 대소문자 구분 없이 처리

### 9.3 데이터 정규화
- 브랜드명 통일 필요 (예: "애플" vs "Apple")
- 응답 형식 통일 필요 (예: "있다" vs "있음")

---

## 10. 성능 고려사항

### 10.1 계산 비용
- 전체 검색 결과에 대해 통계 계산
- 배열 필드 파싱 비용 고려
- 메모이제이션 고려 (같은 검색 결과에 대해 재계산 방지)

### 10.2 데이터 로딩
- `base_profile` JSONB 파싱은 이미 수행됨
- 추가 필드 접근 비용 최소화

---

## 11. 결론 및 권장사항

### 11.1 즉시 추가 권장 항목
1. **차량 보유율** - 라이프스타일 파악에 유용
2. **주요 스마트폰 브랜드** - 디지털 소비 패턴 파악
3. **흡연자 비율** - 건강 관련 통계
4. **음주자 비율** - 라이프스타일 파악

### 11.2 구현 시 주의사항
- 데이터 완성도 확인 (null/undefined 처리)
- 배열 필드 파싱 로직 정확성
- 브랜드명/응답 형식 정규화
- 성능 최적화 (메모이제이션)

### 11.3 UI/UX 권장사항
- 기존 프로필 칩 레일에 추가 (스크롤 가능)
- 각 칩은 클릭 가능하여 필터로 활용
- 색상 및 아이콘 일관성 유지

---

**작성일**: 2025-11-24  
**작성자**: AI Assistant  
**버전**: 1.0

