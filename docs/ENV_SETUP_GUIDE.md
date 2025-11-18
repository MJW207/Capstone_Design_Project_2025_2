# 환경변수 설정 가이드

## 📍 .env 파일 위치

`.env` 파일은 **`server/.env`** 경로에 생성해야 합니다.

```
Capstone_Project/
├── server/
│   ├── .env          ← 여기에 생성!
│   ├── app/
│   └── ...
└── category_config.json
```

---

## 🚀 빠른 설정 방법

### 방법 1: 템플릿 파일 복사 (권장)

1. `server/.env.template` 파일을 `server/.env`로 복사
2. 필요한 값만 수정

```bash
# Windows (CMD)
cd server
copy .env.template .env

# Windows (PowerShell)
cd server
Copy-Item .env.template .env

# Linux/macOS
cd server
cp .env.template .env
```

### 방법 2: 직접 생성

1. `server` 폴더에 `.env` 파일 생성
2. 아래 내용 복사하여 붙여넣기

---

## 📝 .env 파일 내용

`server/.env` 파일에 다음 내용을 추가하세요:

```env
# 데이터베이스 연결 (선택적, 세션 관리용)
DATABASE_URL=postgresql://user:password@host:port/database

# ============================================
# Pinecone 검색 설정 (필수)
# ============================================

# Pinecone 검색 활성화 여부
PINECONE_SEARCH_ENABLED=true

# Pinecone API 키 (필수)
PINECONE_API_KEY=your_pinecone_api_key_here

# Pinecone 인덱스 이름
PINECONE_INDEX_NAME=panel-profiles

# Pinecone 환경 (리전)
PINECONE_ENVIRONMENT=us-east-1

# 카테고리 설정 파일 경로
# Windows 절대 경로
CATEGORY_CONFIG_PATH=C:\Capstone_Project\category_config.json

# 또는 상대 경로 (프로젝트 루트 기준)
# CATEGORY_CONFIG_PATH=./category_config.json

# API Keys
# ⚠️ 현재 config.py에 기본값이 있지만, .env 파일에 설정하는 것을 권장
ANTHROPIC_API_KEY=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
UPSTAGE_API_KEY=up_2KGGBmZpBmlePxUyk3ouWBf9iqOmJ

# Pinecone 검색 폴백 설정
FALLBACK_TO_VECTOR_SEARCH=true
```

---

## ⚙️ 설정 설명

### 필수 설정

| 변수 | 설명 | 예시 |
|------|------|------|
| `PINECONE_API_KEY` | Pinecone API 키 | `your_pinecone_api_key_here` |
| `PINECONE_INDEX_NAME` | Pinecone 인덱스 이름 | `panel-profiles` |
| `CATEGORY_CONFIG_PATH` | category_config.json 파일 경로 | `C:\Capstone_Project\category_config.json` |

### 선택 설정 (기본값 있음)

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PINECONE_SEARCH_ENABLED` | Pinecone 검색 활성화 | `true` |
| `PINECONE_ENVIRONMENT` | Pinecone 리전 | `us-east-1` |
| `ANTHROPIC_API_KEY` | Claude API 키 | config.py에 기본값 있음 |
| `UPSTAGE_API_KEY` | Upstage Solar API 키 | config.py에 기본값 있음 |
| `FALLBACK_TO_VECTOR_SEARCH` | 폴백 활성화 | `true` |
| `DATABASE_URL` | PostgreSQL 연결 (선택적) | 없음 |

---

## 🔍 경로 설정 방법

### Windows 절대 경로 (권장)
```env
CATEGORY_CONFIG_PATH=C:\Capstone_Project\category_config.json
```

### Windows 슬래시 사용
```env
CATEGORY_CONFIG_PATH=C:/Capstone_Project/category_config.json
```

### 상대 경로 (프로젝트 루트 기준)
```env
CATEGORY_CONFIG_PATH=./category_config.json
```

**주의**: 상대 경로는 `server/app/core/config.py`가 실행되는 위치 기준이 아니라 프로젝트 루트 기준입니다.

---

## ✅ 설정 확인 방법

서버를 실행하면 자동으로 `.env` 파일을 로드합니다:

```bash
cd server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8004
```

서버 시작 시 다음과 같은 로그가 출력됩니다:
```
[BOOT] .env loaded from C:\Capstone_Project\server\.env
[BOOT] .env exists: True
```

### Python에서 직접 확인

```python
from app.core.config import (
    PINECONE_SEARCH_ENABLED,
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    PINECONE_ENVIRONMENT,
    CATEGORY_CONFIG_PATH,
    ANTHROPIC_API_KEY,
    UPSTAGE_API_KEY
)

print(f"Pinecone 검색 활성화: {PINECONE_SEARCH_ENABLED}")
print(f"Pinecone API 키: {'설정됨' if PINECONE_API_KEY else '없음'}")
print(f"Pinecone 인덱스: {PINECONE_INDEX_NAME}")
print(f"Pinecone 환경: {PINECONE_ENVIRONMENT}")
print(f"카테고리 설정 경로: {CATEGORY_CONFIG_PATH}")
print(f"Anthropic API 키: {'설정됨' if ANTHROPIC_API_KEY else '없음'}")
print(f"Upstage API 키: {'설정됨' if UPSTAGE_API_KEY else '없음'}")
```

---

## ⚠️ 주의사항

### 1. .env 파일은 Git에 커밋하지 마세요!

`.env` 파일은 보안상 Git에 커밋하면 안 됩니다. `.gitignore`에 추가되어 있는지 확인하세요.

### 2. API 키 보안

- API 키는 기본값으로 `config.py`에 하드코딩되어 있지만, **프로덕션 환경에서는 반드시 `.env` 파일로 관리**하세요.
- `.env` 파일의 API 키가 우선순위가 높습니다 (환경변수 > 기본값).

### 3. Pinecone 설정

- Pinecone API 키는 [Pinecone Console](https://app.pinecone.io/)에서 발급받을 수 있습니다.
- 인덱스 이름은 Pinecone에서 생성한 인덱스 이름과 일치해야 합니다.
- 환경(리전)은 인덱스가 생성된 리전과 일치해야 합니다.

### 4. 경로 문제

경로가 올바르지 않으면 다음 오류가 발생할 수 있습니다:
- `FileNotFoundError: 카테고리 설정 파일을 찾을 수 없습니다`

경로를 확인하고 필요시 수정하세요.

---

## 🔧 문제 해결

### .env 파일이 로드되지 않는 경우

1. **파일 위치 확인**: `server/.env` 경로에 파일이 있는지 확인
2. **파일 이름 확인**: `.env` (점으로 시작, 확장자 없음)
3. **서버 재시작**: `.env` 파일 수정 후 서버를 재시작해야 함

### Pinecone 연결 오류가 발생하는 경우

1. **API 키 확인**: Pinecone Console에서 API 키가 올바른지 확인
2. **인덱스 이름 확인**: Pinecone에서 생성한 인덱스 이름과 일치하는지 확인
3. **리전 확인**: 인덱스가 생성된 리전과 환경 변수가 일치하는지 확인

### 경로 오류가 발생하는 경우

1. **절대 경로 사용**: 상대 경로 대신 절대 경로 사용
2. **경로 확인**: 실제 폴더/파일이 존재하는지 확인
3. **슬래시/백슬래시**: Windows에서는 둘 다 사용 가능

---

## 📋 체크리스트

- [ ] `server/.env` 파일 생성
- [ ] `PINECONE_API_KEY` 설정 (Pinecone Console에서 발급)
- [ ] `PINECONE_INDEX_NAME` 설정 (Pinecone에서 생성한 인덱스 이름)
- [ ] `PINECONE_ENVIRONMENT` 설정 (인덱스 리전)
- [ ] `CATEGORY_CONFIG_PATH` 경로 설정 (실제 category_config.json 경로)
- [ ] API 키 설정 (선택사항, 기본값 있음)
- [ ] 서버 실행하여 로드 확인
- [ ] 설정 값 확인 (Python 스크립트 또는 서버 로그)

---

**작성일**: 2025-01-15
**최종 업데이트**: Pinecone 전환 완료
