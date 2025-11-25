# UI 연결 확인 가이드

## ✅ DB 적재 확인 결과

### 1. 클러스터링 세션 정보
- **세션 ID:** `ac5d01ab-864f-5eb4-a96a-e25b839df589`
- **샘플 수:** 19,020개
- **클러스터 수:** 18개
- **Silhouette Score:** 0.6192
- **Davies-Bouldin Index:** 0.5322
- **Precomputed Name:** `hdbscan_default`

### 2. UMAP 좌표
- **좌표 수:** 18,983개 ✅

### 3. 패널-클러스터 매핑
- **매핑 수:** 18,983개 ✅
- **클러스터 수:** 19개 (노이즈 포함)

### 4. 클러스터 프로필
- **프로필 수:** 18개 ✅
- **총 패널 수:** 18,943개

### 5. 클러스터 비교 데이터
- **비교 쌍 수:** 153개 ✅ (예상: 18C2 = 153개)

---

## 🔌 UI 연결 확인

### 백엔드 API 엔드포인트

#### 1. 클러스터링 데이터
- **엔드포인트:** `GET /api/precomputed/clustering`
- **파일:** `server/app/api/precomputed.py` (line 76)
- **기능:** UMAP 좌표, 클러스터 매핑, 세션 메타데이터 반환
- **사용처:** `src/components/pages/ClusterLabPage.tsx` (line 705)

#### 2. 클러스터 프로필
- **엔드포인트:** `GET /api/precomputed/profiles`
- **파일:** `server/app/api/precomputed.py` (line 493)
- **기능:** 클러스터 프로필 목록 반환
- **사용처:**
  - `src/components/pages/ClusterLabPage.tsx` (line 1125, 1351)
  - `src/components/pages/ComparePage.tsx` (line 67)

#### 3. 클러스터 비교
- **엔드포인트:** `GET /api/precomputed/comparison/{cluster_a}/{cluster_b}`
- **파일:** `server/app/api/precomputed.py` (line 321)
- **기능:** 두 클러스터 간 비교 분석 결과 반환
- **사용처:** `src/components/pages/ComparePage.tsx` (line 146)

#### 4. UMAP 좌표만
- **엔드포인트:** `GET /api/precomputed/umap`
- **파일:** `server/app/api/precomputed.py` (line 234)
- **기능:** UMAP 좌표만 반환

---

## 🧪 테스트 방법

### 1. 백엔드 서버 실행
```bash
cd C:\Capstone_Project\server
python run_server.py
```

### 2. 프론트엔드 실행
```bash
cd C:\Capstone_Project
npm run dev
```

### 3. 브라우저에서 확인
- **ClusterLabPage:** `http://localhost:5173/cluster-lab`
- **ComparePage:** `http://localhost:5173/compare`

### 4. API 직접 테스트 (선택사항)

#### 클러스터링 데이터
```bash
curl http://localhost:8004/api/precomputed/clustering
```

#### 클러스터 프로필
```bash
curl http://localhost:8004/api/precomputed/profiles
```

#### 클러스터 비교 (예: Cluster 0 vs 1)
```bash
curl http://localhost:8004/api/precomputed/comparison/0/1
```

---

## ✅ 확인 체크리스트

### ClusterLabPage
- [ ] UMAP 시각화가 표시되는가?
- [ ] 클러스터 수가 18개로 표시되는가?
- [ ] 클러스터 프로필이 로드되는가?
- [ ] 클러스터 클릭 시 상세 정보가 표시되는가?

### ComparePage
- [ ] 클러스터 목록이 표시되는가?
- [ ] 두 클러스터를 선택할 수 있는가?
- [ ] 비교 분석 결과가 표시되는가?
- [ ] 비교 차트가 정상적으로 렌더링되는가?

### API 응답 확인
- [ ] `/api/precomputed/clustering` 응답이 정상인가?
- [ ] `/api/precomputed/profiles` 응답이 정상인가?
- [ ] `/api/precomputed/comparison/{a}/{b}` 응답이 정상인가?

---

## 🔍 예상 응답 형식

### 클러스터링 데이터 (`/api/precomputed/clustering`)
```json
{
  "success": true,
  "data": {
    "umap_data": [
      {
        "x": 1.23,
        "y": 4.56,
        "cluster": 0,
        "panelId": "mb_sn_123"
      }
    ],
    "session_id": "ac5d01ab-864f-5eb4-a96a-e25b839df589",
    "silhouette_score": 0.6192,
    "n_clusters": 18
  }
}
```

### 클러스터 프로필 (`/api/precomputed/profiles`)
```json
{
  "success": true,
  "data": [
    {
      "cluster": 0,
      "name": "20대 독신 직장인",
      "size": 237,
      "percentage": 1.25,
      "tags": ["20대", "독신"],
      "insights": [...],
      "features": {...}
    }
  ]
}
```

### 클러스터 비교 (`/api/precomputed/comparison/0/1`)
```json
{
  "cluster_a": 0,
  "cluster_b": 1,
  "comparison": [...],
  "group_a": {...},
  "group_b": {...}
}
```

---

## ⚠️ 주의사항

1. **세션 ID 확인**
   - 프론트엔드에서 `precomputed_default` 또는 실제 UUID를 사용할 수 있습니다
   - 백엔드는 `precomputed_name = "hdbscan_default"`로 세션을 찾습니다

2. **CORS 설정**
   - 백엔드에서 프론트엔드 도메인을 허용해야 합니다
   - `server/app/main.py`에서 CORS 설정 확인

3. **에러 처리**
   - API 응답이 실패하면 프론트엔드에서 적절한 에러 메시지를 표시해야 합니다
   - 브라우저 콘솔에서 네트워크 오류 확인

---

**작성일:** 2025-11-25  
**버전:** 1.0

