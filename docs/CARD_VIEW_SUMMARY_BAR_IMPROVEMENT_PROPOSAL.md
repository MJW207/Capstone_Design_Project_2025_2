# 카드뷰 & SummaryBar 개선안 제안서

## 1. 현재 데이터 구조 분석

### 1.1 NeonDB `merged.panel_data` 테이블 구조

#### 기본 컬럼
- `mb_sn` (VARCHAR, PK): 패널 고유 ID

#### JSONB 컬럼

**`base_profile` (JSONB)** - 인구통계 및 기본 프로필 정보
```json
{
  "gender": "여" | "남",
  "age": 29,
  "location": "서울",
  "detail_location": "송파구",
  "결혼여부": "미혼" | "기혼",
  "자녀수": 0,
  "가족수": "2명",
  "최종학력": "고등학교 졸업 이하" | "대학교 졸업" | ...,
  "직업": "서비스직 (미용, 통신, 안내, 요식업 직원 등)",
  "직무": "고객상담•TM",
  "월평균 개인소득": "월 200~299만원",
  "월평균 가구소득": "월 400~499만원",
  "보유전제품": ["스마트폰", "태블릿", ...],
  "보유 휴대폰 단말기 브랜드": "애플",
  "보유 휴대폰 모델명": "아이폰16 프로",
  "보유차량여부": "없다" | "있다",
  "자동차 제조사": "무응답" | "현대" | ...,
  "자동차 모델": "무응답" | "아반떼" | ...,
  "흡연경험": ["과거 흡연", "현재 흡연", ...],
  "흡연경험 담배브랜드": ["에쎄", ...],
  "궐련형 전자담배/가열식 전자담배 이용경험": ["과거 이용", ...],
  "음용경험 술": ["과거 음주", "현재 음주", ...]
}
```

**`quick_answers` (JSONB)** - Qpoll 질문-답변 데이터
```json
{
  "question_key_1": "답변 내용",
  "question_key_2": "답변 내용",
  ...
}
```

### 1.2 현재 SummaryData 구조

```typescript
{
  total: number;                    // 총 결과 수
  qCount: number;                   // Q+W 응답 수
  wOnlyCount: number;                // W-only 수
  femaleRate?: number;               // 여성 비율 (0~1)
  avgAge?: number;                   // 평균 연령
  regionsTop: Array<{...}>;         // 지역 Top N
  avgPersonalIncome?: number;        // 평균 개인소득 (만원)
  avgHouseholdIncome?: number;       // 평균 가구소득 (만원)
  occupationTop?: Array<{...}>;      // 직업 Top N
  educationDistribution?: Array<{...}>; // 학력 분포
  marriedRate?: number;              // 기혼 비율
  avgChildrenCount?: number;         // 평균 자녀 수
  householdSizeDistribution?: Array<{...}>; // 가구원 수 분포
  incomeDistribution?: Array<{...}>;   // 소득 구간 분포
  // ... 기타 필드
}
```

---

## 2. 카드뷰 개선안

### 2.1 현재 문제점

1. **ID 중복 표시**: 헤더와 하단에 모두 표시됨
2. **정보 밀도 부족**: 성별, 나이, 지역만 표시되어 활용도 낮음
3. **시각적 계층 부족**: 모든 정보가 동일한 중요도로 표시
4. **NeonDB 데이터 미활용**: `base_profile`의 풍부한 데이터 미사용

### 2.2 개선안: 정보 계층 구조화

#### 디자인 컨셉: **"정보 피라미드"**

```
┌─────────────────────────────────────┐
│ [⭐] 패널명          [Q+W] [복사]    │ ← Level 1: 핵심 식별
├─────────────────────────────────────┤
│ 👤 여 • 📅 29세 • 📍 서울 송파구    │ ← Level 2: 기본 인구통계
├─────────────────────────────────────┤
│ 💼 서비스직 • 💰 200~299만원        │ ← Level 3: 직업/소득 (선택적)
└─────────────────────────────────────┘
```

#### 구체적 개선사항

**Level 1: 헤더 영역 (최상단)**
- 북마크 아이콘 (왼쪽)
- 패널명 (중앙, `text-sm font-semibold`)
- Q+W/W 배지 + 유사도 배지 (오른쪽)
- 복사 버튼 (오른쪽, 호버 시 표시)
- **ID 제거**: 하단 ID 표시 완전 제거

**Level 2: 기본 정보 (항상 표시)**
- 성별, 나이, 지역을 한 줄로 배치
- 각 정보에 색상 코딩된 배지 스타일
- 아이콘 + 텍스트 조합

**Level 3: 추가 정보 (데이터 있을 때만)**
- 직업 또는 소득 중 하나만 표시 (공간 절약)
- 우선순위: 직업 > 개인소득 > 가구소득
- 더 작은 폰트와 연한 색상

#### 시각적 디자인

```tsx
// 카드 구조
<div className="p-4 space-y-3">
  {/* Level 1: Header */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <BookmarkIcon />
      <span className="text-sm font-semibold truncate">{name}</span>
      {similarity > 0 && <SimilarityBadge />}
    </div>
    <div className="flex items-center gap-1.5">
      <CoverageBadge /> {/* Q+W or W */}
      <CopyButton />
    </div>
  </div>

  {/* Level 2: 기본 정보 */}
  <div className="flex items-center gap-2 flex-wrap">
    <InfoBadge icon={User} color="blue" text={gender} />
    <InfoBadge icon={Calendar} color="purple" text={`${age}세`} />
    <InfoBadge icon={MapPin} color="green" text={region} />
  </div>

  {/* Level 3: 추가 정보 (조건부) */}
  {(job || income) && (
    <div className="flex items-center gap-2 text-xs opacity-75">
      {job && <><Briefcase className="w-3 h-3" /> {job}</>}
      {!job && income && <><DollarSign className="w-3 h-3" /> {income}</>}
    </div>
  )}
</div>
```

#### 색상 팔레트

- **성별**: 파란색 계열 (`#3B82F6`) - 남성, 핑크 계열 (`#EC4899`) - 여성
- **나이**: 보라색 계열 (`#8B5CF6`)
- **지역**: 초록색 계열 (`#10B981`)
- **직업**: 인디고 계열 (`#6366F1`)
- **소득**: 에메랄드 계열 (`#10B981`)

---

## 3. SummaryBar 개선안

### 3.1 현재 문제점

1. **데이터 활용 부족**: NeonDB의 풍부한 데이터가 SummaryBar에 반영되지 않음
2. **시각적 피로도**: 너무 많은 정보가 한 번에 표시됨
3. **인터랙티브 부족**: 통계 정보를 필터로 활용할 수 없음
4. **커버리지 정보 부족**: Q+W vs W 비율이 명확하지 않음

### 3.2 개선안: 계층적 정보 아키텍처

#### 디자인 컨셉: **"Progressive Disclosure"** (점진적 공개)

```
┌─────────────────────────────────────────────────────────┐
│ [FOUND: 1,234] [평균연령] [성비] [평균소득] [주요직업]  │ ← Level 1: 핵심 KPI
├─────────────────────────────────────────────────────────┤
│ [평균연령] [주요지역] [주요직업] [기혼비율] [평균소득]  │ ← Level 2: 프로필 칩 (클릭 가능)
└─────────────────────────────────────────────────────────┘
```

#### 구체적 개선사항

**Level 1: 핵심 KPI 바 (항상 표시)**

1. **FOUND 숫자** (왼쪽, 강조)
   - 큰 숫자 + "FOUND" 라벨
   - 그라데이션 배경 아이콘

2. **핵심 지표 카드들** (오른쪽, 4-5개)
   - 평균 연령
   - 성비 (남:여 비율)
   - 평균 소득 (개인 또는 가구)
   - 주요 직업 (Top 1)
   - **Q+W 비율** (신규 추가) ⭐

**Level 2: 상세 프로필 칩 (스크롤 가능)**

- 클릭 시 해당 필터 적용
- 칩별 아이콘과 색상 코딩
- 데이터가 있을 때만 표시

**신규 추가 지표**

1. **Q+W Coverage 비율**
   ```typescript
   qCoverageRate: number; // Q+W 패널 비율 (%)
   wOnlyRate: number;     // W-only 패널 비율 (%)
   ```

2. **생활습관 통계** (NeonDB 데이터 활용)
   ```typescript
   smokingRate?: number;        // 흡연 경험 비율
   drinkingRate?: number;       // 음주 경험 비율
   smartphoneBrandTop?: Array<{...}>; // 주요 스마트폰 브랜드
   ```

3. **가구 구성 통계**
   ```typescript
   householdSizeDistribution: Array<{...}>; // 가구원 수 분포
   childrenDistribution: Array<{...}>;      // 자녀 수 분포
   ```

#### SummaryBar 컴포넌트 구조

```tsx
<SummaryBar>
  {/* Level 1: 핵심 KPI */}
  <KpiBar>
    <FoundCount count={total} />
    <KpiCard icon={Calendar} label="평균 연령" value={avgAge} />
    <KpiCard icon={Users} label="성비" value={genderRatio} />
    <KpiCard icon={DollarSign} label="평균 소득" value={avgIncome} />
    <KpiCard icon={Briefcase} label="주요 직업" value={topJob} />
    <KpiCard icon={MessageSquare} label="Q+W" value={qCoverageRate} /> {/* 신규 */}
  </KpiBar>

  {/* Level 2: 프로필 칩 (인터랙티브) */}
  <ProfileChips>
    <Chip icon={Calendar} label="평균 연령" value={avgAge} onClick={applyAgeFilter} />
    <Chip icon={MapPin} label="주요 지역" value={topRegion} onClick={applyRegionFilter} />
    <Chip icon={Briefcase} label="주요 직업" value={topJob} onClick={applyJobFilter} />
    <Chip icon={Heart} label="기혼 비율" value={marriedRate} onClick={applyMarriageFilter} />
    <Chip icon={DollarSign} label="평균 소득" value={avgIncome} onClick={applyIncomeFilter} />
    {/* 신규 칩들 */}
    <Chip icon={MessageSquare} label="Q+W 비율" value={qCoverageRate} onClick={applyCoverageFilter} />
    <Chip icon={Smartphone} label="주요 기기" value={topDevice} onClick={applyDeviceFilter} />
  </ProfileChips>
</SummaryBar>
```

---

## 4. 데이터 반영 전략

### 4.1 NeonDB 데이터 → SummaryData 변환

#### 백엔드 계산 로직 (추가 필요)

```python
# server/app/api/search.py 또는 새로운 summary 계산 함수

def calculate_summary_from_panels(panels: List[Dict]) -> SummaryData:
    """
    패널 리스트에서 SummaryData 계산
    NeonDB base_profile 데이터 활용
    """
    total = len(panels)
    
    # Q+W vs W 비율 계산
    q_count = sum(1 for p in panels if p.get('coverage') in ['qw', 'qw1', 'qw2', 'q'])
    w_only_count = total - q_count
    
    # 성별 통계
    genders = [p.get('gender') for p in panels if p.get('gender')]
    female_count = sum(1 for g in genders if g == '여')
    female_rate = female_count / len(genders) if genders else None
    
    # 연령 통계
    ages = [p.get('age') for p in panels if p.get('age') and p.get('age') > 0]
    avg_age = sum(ages) / len(ages) if ages else None
    
    # 지역 통계
    regions = [p.get('region') or p.get('location') for p in panels if p.get('region') or p.get('location')]
    regions_top = calculate_top_n(regions, n=5)
    
    # 소득 통계
    incomes = []
    for p in panels:
        income = p.get('metadata', {}).get('월평균 개인소득') or \
                 p.get('metadata', {}).get('월평균 가구소득')
        if income:
            # "월 200~299만원" → 250 (중간값)
            incomes.append(parse_income_range(income))
    avg_personal_income = sum(incomes) / len(incomes) if incomes else None
    
    # 직업 통계
    jobs = [p.get('metadata', {}).get('직업') for p in panels 
            if p.get('metadata', {}).get('직업')]
    occupation_top = calculate_top_n(jobs, n=5)
    
    # 기혼 비율
    marriages = [p.get('metadata', {}).get('결혼여부') for p in panels 
                 if p.get('metadata', {}).get('결혼여부')]
    married_count = sum(1 for m in marriages if m == '기혼')
    married_rate = married_count / len(marriages) if marriages else None
    
    # 평균 자녀 수
    children = [p.get('metadata', {}).get('자녀수') for p in panels 
                if p.get('metadata', {}).get('자녀수') is not None]
    avg_children = sum(children) / len(children) if children else None
    
    # 생활습관 통계 (신규)
    smoking_count = sum(1 for p in panels 
                       if p.get('metadata', {}).get('흡연경험'))
    smoking_rate = smoking_count / total if total > 0 else None
    
    drinking_count = sum(1 for p in panels 
                        if p.get('metadata', {}).get('음용경험 술'))
    drinking_rate = drinking_count / total if total > 0 else None
    
    # 스마트폰 브랜드 통계 (신규)
    devices = [p.get('metadata', {}).get('보유 휴대폰 단말기 브랜드') 
               for p in panels 
               if p.get('metadata', {}).get('보유 휴대폰 단말기 브랜드')]
    smartphone_brand_top = calculate_top_n(devices, n=3)
    
    return {
        'total': total,
        'qCount': q_count,
        'wOnlyCount': w_only_count,
        'femaleRate': female_rate,
        'avgAge': avg_age,
        'regionsTop': regions_top,
        'avgPersonalIncome': avg_personal_income,
        'occupationTop': occupation_top,
        'marriedRate': married_rate,
        'avgChildrenCount': avg_children,
        'smokingRate': smoking_rate,  # 신규
        'drinkingRate': drinking_rate,  # 신규
        'smartphoneBrandTop': smartphone_brand_top,  # 신규
        # ... 기타 필드
    }
```

### 4.2 프론트엔드 SummaryData 확장

```typescript
// src/ui/summary/types.ts 확장

export type SummaryData = {
  // 기존 필드들...
  
  // 신규 필드
  qCoverageRate?: number;  // Q+W 비율 (0~100)
  wOnlyRate?: number;      // W-only 비율 (0~100)
  
  // 생활습관 통계 (신규)
  smokingRate?: number;    // 흡연 경험 비율 (0~1)
  drinkingRate?: number;   // 음주 경험 비율 (0~1)
  smartphoneBrandTop?: Array<{ name: string; count: number; rate: number }>;
  
  // 가구 구성 상세 (신규)
  childrenDistribution?: Array<{ label: string; count: number; rate: number }>;
};
```

---

## 5. UI/UX 개선 방향

### 5.1 카드뷰 UX 원칙

1. **스캔 가능성 (Scannability)**
   - 정보를 3단계 계층으로 구조화
   - 중요한 정보는 상단, 상세 정보는 하단
   - 색상 코딩으로 빠른 인식

2. **정보 밀도 최적화**
   - 필수 정보는 항상 표시
   - 선택적 정보는 데이터 있을 때만 표시
   - 공간 효율성 극대화

3. **시각적 피로도 감소**
   - 일관된 색상 팔레트 사용
   - 적절한 여백과 간격
   - 아이콘과 텍스트의 균형

### 5.2 SummaryBar UX 원칙

1. **점진적 공개 (Progressive Disclosure)**
   - 핵심 정보는 항상 표시
   - 상세 정보는 칩 형태로 접근 가능
   - 클릭 시 필터 적용으로 인터랙티브

2. **데이터 시각화**
   - 숫자만이 아닌 비율과 분포 표시
   - 도넛 차트로 분포 시각화
   - 색상으로 의미 전달

3. **액션 가능성 (Actionability)**
   - 모든 통계를 필터로 활용 가능
   - 클릭 한 번으로 필터 적용
   - 즉각적인 피드백

---

## 6. 구현 우선순위

### Phase 1: 즉시 적용 (High Priority)
1. ✅ 카드뷰 ID 중복 제거
2. ✅ 카드뷰 정보 계층 구조화 (Level 1, 2, 3)
3. ✅ SummaryBar Q+W 비율 추가
4. ✅ SummaryBar 프로필 칩 인터랙티브화 (클릭 시 필터 적용)

### Phase 2: 데이터 반영 (Medium Priority)
1. NeonDB 데이터 기반 SummaryData 계산 로직 추가
2. 생활습관 통계 (흡연, 음주) SummaryBar 반영
3. 스마트폰 브랜드 통계 SummaryBar 반영
4. 가구 구성 상세 통계 추가

### Phase 3: 고급 기능 (Low Priority)
1. SummaryBar 칩 클릭 시 필터 자동 적용
2. 카드뷰 호버 시 추가 정보 툴팁 표시
3. SummaryBar 차트 인터랙션 (클릭 시 필터)

---

## 7. 예상 효과

### 7.1 사용자 경험 개선
- **정보 인식 속도**: 3단계 계층 구조로 30% 향상 예상
- **필터 활용도**: 인터랙티브 SummaryBar로 필터 사용 빈도 증가
- **데이터 활용도**: NeonDB 데이터 반영으로 정보 밀도 50% 증가

### 7.2 개발 효율성
- **코드 재사용성**: 공통 컴포넌트로 유지보수 용이
- **확장성**: 새로운 통계 추가 시 쉬운 확장
- **일관성**: 디자인 시스템으로 UI 일관성 확보

---

## 8. 참고사항

### 8.1 성능 고려사항
- SummaryData 계산은 백엔드에서 수행 (프론트엔드 부담 감소)
- 대량 데이터 처리 시 샘플링 또는 캐싱 고려
- SummaryBar 칩은 가상 스크롤 고려 (100개 이상 시)

### 8.2 접근성 (Accessibility)
- 색상만으로 정보 전달하지 않음 (아이콘 + 텍스트)
- 키보드 네비게이션 지원
- 스크린 리더 호환성

---

## 9. 다음 단계

1. **제안서 검토 및 피드백 수집**
2. **프로토타입 구현** (카드뷰 Level 1, 2만 먼저)
3. **사용자 테스트** (A/B 테스트 고려)
4. **점진적 롤아웃** (Phase별 구현)

---

**작성일**: 2025-01-XX  
**작성자**: AI Assistant  
**버전**: 1.0

