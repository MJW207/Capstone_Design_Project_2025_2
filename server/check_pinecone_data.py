"""Pinecone 인덱스 데이터 확인 스크립트"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from pinecone import Pinecone
import json

# UTF-8 인코딩 설정 (Windows)
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# server 디렉토리로 경로 추가
sys.path.insert(0, str(Path(__file__).parent))

# .env 파일 로드
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path, override=True)
    print(f"✅ .env 파일 로드 완료: {env_path}")
else:
    print(f"⚠️ .env 파일이 없습니다: {env_path}")

# 환경변수 확인
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "panel-profiles")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")

print("\n" + "=" * 80)
print("Pinecone 인덱스 데이터 확인")
print("=" * 80)
print(f"인덱스 이름: {PINECONE_INDEX_NAME}")
print(f"환경: {PINECONE_ENVIRONMENT}")
print(f"API 키: {'설정됨' if PINECONE_API_KEY else '❌ 없음!'}")

if not PINECONE_API_KEY:
    print("\n❌ PINECONE_API_KEY가 설정되지 않았습니다!")
    print("   .env 파일에 PINECONE_API_KEY를 설정하세요.")
    sys.exit(1)

try:
    # Pinecone 초기화
    print("\n[1] Pinecone 연결 중...")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    # 인덱스 목록 확인
    print("\n[2] 사용 가능한 인덱스 목록:")
    indexes = pc.list_indexes()
    index_names = [idx.name for idx in indexes.indexes] if hasattr(indexes, 'indexes') else []
    
    if index_names:
        for idx_name in index_names:
            print(f"   - {idx_name}")
    else:
        print("   (인덱스 없음)")
    
    # 지정된 인덱스가 존재하는지 확인
    if PINECONE_INDEX_NAME not in index_names:
        print(f"\n⚠️ 인덱스 '{PINECONE_INDEX_NAME}'가 존재하지 않습니다!")
        print(f"   사용 가능한 인덱스: {index_names}")
        sys.exit(1)
    
    # 인덱스 연결
    print(f"\n[3] 인덱스 '{PINECONE_INDEX_NAME}' 연결 중...")
    index = pc.Index(PINECONE_INDEX_NAME)
    
    # 인덱스 통계 정보
    print("\n[4] 인덱스 통계:")
    stats = index.describe_index_stats()
    print(f"   총 벡터 수: {stats.get('total_vector_count', 0):,}개")
    print(f"   차원: {stats.get('dimension', 'N/A')}")
    print(f"   인덱스 타입: {stats.get('index_type', 'N/A')}")
    
    # 네임스페이스별 통계
    if 'namespaces' in stats:
        print("\n   네임스페이스별 벡터 수:")
        for ns, ns_stats in stats['namespaces'].items():
            count = ns_stats.get('vector_count', 0) if isinstance(ns_stats, dict) else str(ns_stats)
            print(f"     - {ns}: {count}개")
    
    # 샘플 데이터 조회 (최대 10개)
    print("\n[5] 샘플 데이터 조회 (최대 10개)...")
    
    # query로 샘플 조회 (랜덤 벡터로 검색)
    import numpy as np
    dimension = stats.get('dimension', 4096)  # 기본값: Upstage Solar embedding dimension
    
    # 랜덤 벡터 생성 (정규화)
    random_vector = np.random.rand(dimension).astype(np.float32).tolist()
    norm = np.linalg.norm(random_vector)
    if norm > 0:
        random_vector = (np.array(random_vector) / norm).tolist()
    
    # 검색 실행
    results = index.query(
        vector=random_vector,
        top_k=10,
        include_metadata=True
    )
    
    if results.matches:
        print(f"\n   ✅ {len(results.matches)}개 샘플 발견\n")
        
        # 메타데이터 필드 분석
        all_metadata_keys = set()
        topic_counts = {}
        mb_sn_set = set()
        
        for i, match in enumerate(results.matches, 1):
            metadata = match.metadata or {}
            all_metadata_keys.update(metadata.keys())
            
            # topic별 카운트
            topic = metadata.get('topic', 'N/A')
            topic_counts[topic] = topic_counts.get(topic, 0) + 1
            
            # mb_sn 수집
            mb_sn = metadata.get('mb_sn', 'N/A')
            if mb_sn != 'N/A':
                mb_sn_set.add(mb_sn)
            
            print(f"   [{i}] ID: {match.id}")
            print(f"       Score: {match.score:.4f}")
            print(f"       Topic: {topic}")
            print(f"       mb_sn: {mb_sn}")
            print(f"       Index: {metadata.get('index', 'N/A')}")
            
            # 텍스트 미리보기
            text = metadata.get('text', '')
            if text:
                preview = text[:100] + "..." if len(text) > 100 else text
                print(f"       Text: {preview}")
            
            # 주요 메타데이터 필드
            important_fields = ['지역', '연령대', '성별', '나이', '결혼여부', '학력', '개인소득', '가구소득']
            found_fields = {k: v for k, v in metadata.items() if k in important_fields}
            if found_fields:
                print(f"       주요 필드: {found_fields}")
            
            print()
        
        # 통계 요약
        print("\n" + "=" * 80)
        print("데이터 분석 요약")
        print("=" * 80)
        print(f"총 샘플 수: {len(results.matches)}개")
        print(f"고유 mb_sn 수: {len(mb_sn_set)}개")
        print(f"\nTopic별 분포:")
        for topic, count in sorted(topic_counts.items()):
            print(f"   - {topic}: {count}개")
        
        print(f"\n메타데이터 필드 ({len(all_metadata_keys)}개):")
        sorted_keys = sorted(all_metadata_keys)
        for key in sorted_keys:
            print(f"   - {key}")
        
        # 인구 topic의 메타데이터 필드 확인
        print(f"\n[6] '인구' topic 샘플 확인...")
        population_samples = [m for m in results.matches if m.metadata.get('topic') == '인구']
        if population_samples:
            print(f"   ✅ 인구 topic 샘플: {len(population_samples)}개")
            sample = population_samples[0]
            print(f"   메타데이터 필드:")
            for key, value in sorted(sample.metadata.items()):
                print(f"     - {key}: {value}")
        else:
            print("   ⚠️ 랜덤 샘플에 인구 topic이 없습니다. 필터로 직접 조회 시도...")
            # 필터로 인구 topic 직접 조회
            try:
                pop_results = index.query(
                    vector=random_vector,
                    top_k=5,
                    include_metadata=True,
                    filter={"topic": "인구"}
                )
                if pop_results.matches:
                    print(f"   ✅ 인구 topic 샘플 발견: {len(pop_results.matches)}개\n")
                    for i, match in enumerate(pop_results.matches, 1):
                        print(f"   [{i}] ID: {match.id}")
                        print(f"       mb_sn: {match.metadata.get('mb_sn', 'N/A')}")
                        print(f"       메타데이터 필드:")
                        for key, value in sorted(match.metadata.items()):
                            if key != 'text':  # text는 너무 길 수 있으므로 제외
                                print(f"         - {key}: {value}")
                        print()
                else:
                    print("   ❌ 인구 topic 데이터가 없습니다.")
            except Exception as e:
                print(f"   ⚠️ 필터 조회 실패: {e}")
    
    else:
        print("   ⚠️ 샘플 데이터를 찾을 수 없습니다.")
    
    print("\n" + "=" * 80)
    print("✅ 확인 완료")
    print("=" * 80)

except Exception as e:
    print(f"\n❌ 오류 발생: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

