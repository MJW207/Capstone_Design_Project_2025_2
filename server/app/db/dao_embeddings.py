"""임베딩 벡터 검색 DAO"""
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import DBN, fq


async def find_embedding_tables(session: AsyncSession) -> List[Dict[str, Any]]:
    """
    임베딩 테이블 찾기 (모든 스키마에서 검색)
    
    Returns:
        발견된 테이블 리스트
    """
    print(f"[DEBUG Vector] ========== 임베딩 테이블 검색 시작 ==========")
    
    try:
        # 모든 스키마에서 embedding 컬럼이 있는 테이블 검색
        search_sql = """
        SELECT 
            table_schema,
            table_name,
            column_name,
            data_type,
            udt_name
        FROM information_schema.columns 
        WHERE column_name = 'embedding'
        AND (udt_name = 'vector' OR data_type LIKE '%vector%')
        ORDER BY table_schema, table_name;
        """
        
        result = await session.execute(text(search_sql))
        tables = []
        for row in result:
            tables.append({
                "schema": row[0],
                "table": row[1],
                "column": row[2],
                "data_type": row[3],
                "udt_name": row[4]
            })
        
        print(f"[DEBUG Vector] 발견된 임베딩 테이블:")
        for tbl in tables:
            print(f"[DEBUG Vector]   {tbl['schema']}.{tbl['table']} (컬럼: {tbl['column']}, 타입: {tbl['udt_name']})")
        
        return tables
        
    except Exception as e:
        import traceback
        print(f"[DEBUG Vector] ❌ 임베딩 테이블 검색 실패:")
        traceback.print_exc()
        return []


async def create_panel_embeddings_view(session: AsyncSession, source_schema: str = None, source_table: str = None) -> Dict[str, Any]:
    """
    panel_embeddings_v 뷰 생성
    
    Args:
        session: 비동기 데이터베이스 세션
        source_schema: 원본 스키마 (없으면 자동 검색)
        source_table: 원본 테이블 (없으면 자동 검색)
    
    Returns:
        생성 결과 딕셔너리
    """
    print(f"[DEBUG Vector] ========== 뷰 생성 시작 ==========")
    
    try:
        # 1. 원본 테이블 찾기
        if not source_schema or not source_table:
            print(f"[DEBUG Vector] 원본 테이블 정보가 없습니다. 자동 검색...")
            tables = await find_embedding_tables(session)
            
            if not tables:
                return {
                    "created": False,
                    "error": "임베딩 테이블을 찾을 수 없습니다. embedding 컬럼이 있는 테이블이 없습니다.",
                    "table_exists": False,
                    "searched_tables": []
                }
            
            # testcl.panel_embeddings 우선 선택, 없으면 첫 번째 테이블 사용
            testcl_table = next(
                (t for t in tables if t['table'].lower() == 'panel_embeddings' and t['schema'].lower() in ('testcl', 'test_cl')),
                None
            )
            
            if testcl_table:
                source_schema = testcl_table["schema"]
                source_table = testcl_table["table"]
                print(f"[DEBUG Vector] ✅ testcl.panel_embeddings 발견: {source_schema}.{source_table}")
            else:
                # 첫 번째 발견된 테이블 사용
                source_schema = tables[0]["schema"]
                source_table = tables[0]["table"]
                print(f"[DEBUG Vector] 발견된 테이블 사용: {source_schema}.{source_table}")
        else:
            # 지정된 테이블 확인
            check_table_sql = f"""
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = :schema 
                AND table_name = :table
            ) as table_exists;
            """
            
            result = await session.execute(text(check_table_sql), {
                "schema": source_schema,
                "table": source_table
            })
            table_exists = result.scalar()
            print(f"[DEBUG Vector] 원본 테이블 {source_schema}.{source_table} 존재 여부: {table_exists}")
            
            if not table_exists:
                return {
                    "created": False,
                    "error": f"원본 테이블 {source_schema}.{source_table}가 존재하지 않습니다",
                    "table_exists": False
                }
        
        # 2. RawData 스키마 생성 (없으면)
        create_schema_sql = f'CREATE SCHEMA IF NOT EXISTS "{DBN.RAW}";'
        await session.execute(text(create_schema_sql))
        await session.commit()
        print(f"[DEBUG Vector] 스키마 {DBN.RAW} 확인/생성 완료")
        
        # 3. 뷰 생성
        EMB_V = fq(DBN.RAW, DBN.T_EMB_V)
        SOURCE_TABLE = fq(source_schema, source_table)
        
        # 원본 테이블의 컬럼 확인
        check_columns_sql = f"""
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_schema = :schema 
        AND table_name = :table
        ORDER BY ordinal_position;
        """
        
        result = await session.execute(text(check_columns_sql), {
            "schema": source_schema,
            "table": source_table
        })
        columns = [row[0] for row in result]
        print(f"[DEBUG Vector] 원본 테이블 컬럼: {columns}")
        
        # 필요한 컬럼만 선택 (없으면 NULL)
        column_mapping = {
            'mb_sn': None,
            'demographics': None,
            'combined_text': None,
            'labeled_text': None,
            'chunks': None,
            'chunk_count': None,
            'categories': None,
            'all_labels': None,
            'embedding': None,
            'created_at': None
        }
        
        select_parts = []
        for col_name in column_mapping.keys():
            if col_name in columns:
                select_parts.append(f"{col_name}")
            else:
                select_parts.append(f"NULL as {col_name}")
        
        create_view_sql = f"""
        CREATE OR REPLACE VIEW {EMB_V} AS
        SELECT
            {', '.join(select_parts)}
        FROM {SOURCE_TABLE};
        """
        
        await session.execute(text(create_view_sql))
        await session.commit()
        print(f"[DEBUG Vector] 뷰 {EMB_V} 생성 완료")
        
        # 4. 뷰 주석 추가
        comment_sql = f"""
        COMMENT ON VIEW {EMB_V} IS 
            'Bridge view from {SOURCE_TABLE} to {DBN.RAW} schema for consistency';
        """
        await session.execute(text(comment_sql))
        await session.commit()
        print(f"[DEBUG Vector] 뷰 주석 추가 완료")
        
        print(f"[DEBUG Vector] ========== 뷰 생성 완료 ==========")
        
        return {
            "created": True,
            "view_name": EMB_V,
            "source_table": SOURCE_TABLE,
            "source_schema": source_schema,
            "source_table_name": source_table,
            "available_columns": columns
        }
        
    except Exception as e:
        await session.rollback()
        import traceback
        print(f"[DEBUG Vector] ❌ 뷰 생성 실패:")
        print(f"[DEBUG Vector] 에러 타입: {type(e).__name__}")
        print(f"[DEBUG Vector] 에러 메시지: {str(e)}")
        print(f"[DEBUG Vector] 스택 트레이스:")
        traceback.print_exc()
        print(f"[DEBUG Vector] ============================================")
        
        return {
            "created": False,
            "error": str(e),
            "error_type": type(e).__name__
        }


async def test_vector_db_connection(session: AsyncSession) -> Dict[str, Any]:
    """
    벡터 DB 연결 테스트 및 메타데이터 확인
    
    Returns:
        연결 상태 및 메타데이터 딕셔너리
    """
    print(f"[DEBUG Vector] ========== 벡터 DB 연결 테스트 시작 ==========")
    
    try:
        # search_path 설정
        await session.execute(text(f'SET search_path TO "{DBN.RAW}", public'))
        print(f"[DEBUG Vector] search_path 설정 완료: {DBN.RAW}")
        
        # 1. 뷰 존재 확인
        EMB_V = fq(DBN.RAW, DBN.T_EMB_V)
        print(f"[DEBUG Vector] 뷰 이름: {EMB_V}")
        
        check_view_sql = f"""
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.views 
            WHERE table_schema = '{DBN.RAW}' 
            AND table_name = '{DBN.T_EMB_V}'
        ) as view_exists;
        """
        
        result = await session.execute(text(check_view_sql))
        view_exists = result.scalar()
        print(f"[DEBUG Vector] 뷰 존재 여부: {view_exists}")
        
        # 뷰가 없으면 자동 생성 시도
        if not view_exists:
            print(f"[DEBUG Vector] 뷰가 없습니다. 자동 생성 시도...")
            create_result = await create_panel_embeddings_view(session)
            if not create_result.get("created", False):
                return {
                    "connected": False,
                    "error": create_result.get("error", "뷰 생성 실패"),
                    "view_exists": False,
                    "auto_create_attempted": True,
                    "create_result": create_result
                }
            # 뷰 생성 후 다시 확인
            result = await session.execute(text(check_view_sql))
            view_exists = result.scalar()
            print(f"[DEBUG Vector] 뷰 생성 후 존재 여부: {view_exists}")
        
        # 2. embedding 컬럼 존재 확인
        check_columns_sql = f"""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = '{DBN.RAW}' 
        AND table_name = '{DBN.T_EMB_V}'
        AND column_name = 'embedding';
        """
        
        result = await session.execute(text(check_columns_sql))
        embedding_col = result.first()
        print(f"[DEBUG Vector] embedding 컬럼: {embedding_col}")
        
        if not embedding_col:
            return {
                "connected": False,
                "error": f"뷰 {EMB_V}에 embedding 컬럼이 없습니다",
                "view_exists": True,
                "embedding_column_exists": False
            }
        
        # 3. 샘플 데이터 확인 (embedding 있는 행 수)
        count_sql = f"""
        SELECT 
            COUNT(*) as total_rows,
            COUNT(embedding) as rows_with_embedding,
            COUNT(DISTINCT mb_sn) as unique_panels
        FROM {EMB_V};
        """
        
        result = await session.execute(text(count_sql))
        row = result.first()
        total_rows = row[0] if row else 0
        rows_with_embedding = row[1] if row else 0
        unique_panels = row[2] if row else 0
        
        print(f"[DEBUG Vector] 데이터 통계:")
        print(f"[DEBUG Vector]   전체 행: {total_rows}")
        print(f"[DEBUG Vector]   embedding 있는 행: {rows_with_embedding}")
        print(f"[DEBUG Vector]   고유 패널 수: {unique_panels}")
        
        # 4. embedding 컬럼 타입 및 차원 확인
        check_embedding_type_sql = f"""
        SELECT 
            data_type,
            udt_name
        FROM information_schema.columns 
        WHERE table_schema = '{DBN.RAW}' 
        AND table_name = '{DBN.T_EMB_V}'
        AND column_name = 'embedding';
        """
        
        result = await session.execute(text(check_embedding_type_sql))
        type_row = result.first()
        embedding_type = type_row[0] if type_row else None
        udt_name = type_row[1] if type_row and len(type_row) > 1 else None
        print(f"[DEBUG Vector]   embedding 타입: {embedding_type}, UDT: {udt_name}")
        
        embedding_dim = None
        # pgvector의 vector 타입에서 차원 추출 (올바른 방법)
        if udt_name == 'vector':
            # pgvector vector 타입의 차원 확인 방법
            # 방법 1: 샘플 데이터를 텍스트로 가져와서 차원 추출 (가장 안전)
            try:
                sample_sql = f"""
                SELECT embedding::text
                FROM {EMB_V} 
                WHERE embedding IS NOT NULL 
                LIMIT 1;
                """
                result = await session.execute(text(sample_sql))
                sample_row = result.first()
                if sample_row and sample_row[0]:
                    # '[1,2,3]' 형태에서 차원 추출
                    vec_text = sample_row[0].strip('[]')
                    if vec_text:
                        embedding_dim = len([x for x in vec_text.split(',') if x.strip()])
                        print(f"[DEBUG Vector]   embedding 차원 (방법 1): {embedding_dim}")
            except Exception as e:
                print(f"[DEBUG Vector] 방법 1 실패: {str(e)}")
                await session.rollback()
                
                # 방법 2: pgvector의 vector 차원 함수 사용 (있는 경우)
                try:
                    dim_sql = f"""
                    SELECT array_length(
                        string_to_array(
                            trim(both '[]' from embedding::text),
                            ','
                        ),
                        1
                    ) as dim
                    FROM {EMB_V} 
                    WHERE embedding IS NOT NULL 
                    LIMIT 1;
                    """
                    result = await session.execute(text(dim_sql))
                    dim_row = result.first()
                    if dim_row:
                        embedding_dim = dim_row[0]
                        print(f"[DEBUG Vector]   embedding 차원 (방법 2): {embedding_dim}")
                except Exception as e2:
                    print(f"[DEBUG Vector] 방법 2 실패: {str(e2)}")
                    await session.rollback()
                    # 차원을 알 수 없으면 None 유지
        
        # 5. pgvector 확장 확인 (트랜잭션이 괜찮은 상태에서만)
        extension_exists = False
        try:
            check_extension_sql = """
            SELECT EXISTS (
                SELECT 1 
                FROM pg_extension 
                WHERE extname = 'vector'
            ) as extension_exists;
            """
            
            result = await session.execute(text(check_extension_sql))
            extension_exists = result.scalar()
            print(f"[DEBUG Vector] pgvector 확장 설치 여부: {extension_exists}")
        except Exception as e:
            print(f"[DEBUG Vector] 확장 확인 실패 (계속 진행): {str(e)}")
            # 확장 확인 실패해도 계속 진행
            try:
                await session.rollback()
            except:
                pass
        
        result_data = {
            "connected": True,
            "view_exists": True,
            "embedding_column_exists": True,
            "extension_exists": extension_exists,
            "total_rows": total_rows,
            "rows_with_embedding": rows_with_embedding,
            "unique_panels": unique_panels,
            "embedding_dimension": embedding_dim,
            "view_name": EMB_V
        }
        
        print(f"[DEBUG Vector] ========== 벡터 DB 연결 테스트 완료 ==========")
        print(f"[DEBUG Vector] 결과: {result_data}")
        
        return result_data
        
    except Exception as e:
        import traceback
        print(f"[DEBUG Vector] ❌ 벡터 DB 연결 테스트 실패:")
        print(f"[DEBUG Vector] 에러 타입: {type(e).__name__}")
        print(f"[DEBUG Vector] 에러 메시지: {str(e)}")
        print(f"[DEBUG Vector] 스택 트레이스:")
        traceback.print_exc()
        print(f"[DEBUG Vector] ============================================")
        
        # 트랜잭션 롤백 시도
        try:
            await session.rollback()
        except:
            pass
        
        return {
            "connected": False,
            "error": str(e),
            "error_type": type(e).__name__
        }


async def search_panels_by_embedding(
    session: AsyncSession,
    query_embedding: List[float],
    limit: int = 20,
    filters: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    임베딩 벡터로 패널 검색 (cosine similarity)
    
    Args:
        session: 비동기 데이터베이스 세션
        query_embedding: 쿼리 텍스트의 임베딩 벡터
        limit: 반환할 최대 결과 수
        filters: 추가 필터 (성별, 지역 등)
        
    Returns:
        검색 결과 리스트 (유사도 점수 포함)
    """
    print(f"[DEBUG Vector] ========== 벡터 검색 시작 ==========")
    print(f"[DEBUG Vector] Query embedding 차원: {len(query_embedding)}")
    print(f"[DEBUG Vector] Limit: {limit}")
    print(f"[DEBUG Vector] Filters: {filters}")
    
    try:
        # pgvector 확장 확인 및 활성화 (필요한 경우)
        # Neon DB에서는 확장이 이미 설치되어 있을 가능성이 높음
        try:
            # 먼저 확장 설치 여부 확인
            check_ext_sql = "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as ext_exists;"
            result = await session.execute(text(check_ext_sql))
            ext_exists = result.scalar()
            
            if not ext_exists:
                # 확장이 없으면 활성화 시도
                try:
                    print(f"[DEBUG Vector] pgvector 확장이 없습니다. 활성화 시도...")
                    await session.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                    await session.commit()
                    print(f"[DEBUG Vector] ✅ pgvector 확장 활성화 완료")
                except Exception as create_error:
                    print(f"[DEBUG Vector] ❌ pgvector 확장 활성화 실패: {create_error}")
                    print(f"[DEBUG Vector] 계속 진행 (권한 문제일 수 있음)")
            else:
                print(f"[DEBUG Vector] ✅ pgvector 확장 확인 완료")
            
            # vector 타입 존재 여부 확인
            check_vector_type_sql = """
            SELECT EXISTS(
                SELECT 1 FROM pg_type WHERE typname = 'vector'
            ) as vector_type_exists;
            """
            result = await session.execute(text(check_vector_type_sql))
            vector_type_exists = result.scalar()
            
            if not vector_type_exists:
                print(f"[DEBUG Vector] ⚠️ vector 타입이 존재하지 않습니다!")
                raise RuntimeError("pgvector 확장이 활성화되지 않았거나 vector 타입을 찾을 수 없습니다.")
            else:
                print(f"[DEBUG Vector] ✅ vector 타입 확인 완료")
        except Exception as ext_error:
            print(f"[DEBUG Vector] ⚠️ pgvector 확장 확인 실패: {ext_error}")
            # 확장 확인 실패해도 계속 진행 (이미 설치되어 있을 수 있음)
            # 하지만 vector 타입이 없으면 나중에 에러 발생
        
        # search_path 설정 (testcl 스키마도 포함, public 스키마는 선택적)
        # Neon DB에서는 public 스키마가 없을 수 있으므로, vector 타입이 있는 곳을 찾아야 함
        try:
            # vector 타입이 있는 스키마 찾기
            find_vector_schema_sql = """
            SELECT nspname 
            FROM pg_type t
            JOIN pg_namespace n ON t.typnamespace = n.oid
            WHERE t.typname = 'vector'
            LIMIT 1;
            """
            result = await session.execute(text(find_vector_schema_sql))
            vector_schema = result.scalar()
            
            if vector_schema:
                print(f"[DEBUG Vector] vector 타입 발견: {vector_schema} 스키마")
                # vector 타입이 있는 스키마를 search_path에 포함
                search_path = f'"{DBN.RAW}", "testcl", "{vector_schema}"'
            else:
                print(f"[DEBUG Vector] ⚠️ vector 타입의 스키마를 찾을 수 없습니다. 기본 search_path 사용")
                search_path = f'"{DBN.RAW}", "testcl"'
        except Exception as schema_error:
            print(f"[DEBUG Vector] ⚠️ vector 스키마 찾기 실패 (기본값 사용): {schema_error}")
            search_path = f'"{DBN.RAW}", "testcl"'
        
        await session.execute(text(f'SET search_path TO {search_path}'))
        print(f"[DEBUG Vector] search_path 설정: {search_path}")
        
        # 뷰 존재 확인
        EMB_V = fq(DBN.RAW, DBN.T_EMB_V)
        check_view_sql = f"""
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.views 
            WHERE table_schema = '{DBN.RAW}' 
            AND table_name = '{DBN.T_EMB_V}'
        ) as view_exists;
        """
        
        result = await session.execute(text(check_view_sql))
        view_exists = result.scalar()
        print(f"[DEBUG Vector] 뷰 존재 여부: {view_exists}")
        
        # 뷰가 없으면 자동 생성 시도
        if not view_exists:
            print(f"[DEBUG Vector] ⚠️ 뷰가 없습니다. 자동 생성 시도...")
            create_result = await create_panel_embeddings_view(session)
            if not create_result.get("created", False):
                error_msg = f"뷰 {EMB_V}가 존재하지 않으며 생성에도 실패했습니다: {create_result.get('error', '알 수 없는 오류')}"
                print(f"[DEBUG Vector] ❌ {error_msg}")
                raise RuntimeError(error_msg)
            print(f"[DEBUG Vector] ✅ 뷰 자동 생성 완료")
        
        # 임베딩 벡터를 PostgreSQL 배열 형식으로 변환 (소수점 6자리)
        embedding_str = '[' + ','.join(f"{x:.6f}" for x in query_embedding) + ']'
        
        # 기본 벡터 검색 쿼리 (cosine similarity)
        # pgvector의 <#> 연산자는 cosine distance를 반환 (코사인 거리)
        # similarity = 1 - distance (코사인 유사도)
        # vector 타입은 스키마 미지정 (pgvector 타입은 전역 등록됨)
        # 유사도 0.9 이상만 필터링
        base_sql = f"""
        SELECT 
            mb_sn,
            demographics,
            combined_text,
            labeled_text,
            chunks,
            chunk_count,
            categories,
            all_labels,
            embedding,
            1 - (embedding <#> CAST(:query_embedding AS vector)) AS similarity,
            (embedding <#> CAST(:query_embedding AS vector)) AS distance
        FROM {EMB_V}
        WHERE embedding IS NOT NULL
        AND 1 - (embedding <#> CAST(:query_embedding AS vector)) >= 0.9
        """
        
        params = {
            "query_embedding": embedding_str
        }
        
        # 추가 필터 적용
        if filters:
            # 성별 필터
            if gender := filters.get("gender"):
                if isinstance(gender, list):
                    gender_conditions = []
                    for idx, g in enumerate(gender):
                        gender_conditions.append(f"demographics->>'gender' = :g{idx}")
                        params[f"g{idx}"] = g
                    if gender_conditions:
                        base_sql += " AND (" + " OR ".join(gender_conditions) + ")"
                else:
                    base_sql += " AND demographics->>'gender' = :gender"
                    params["gender"] = gender
            
            # 지역 필터
            if region := filters.get("region"):
                if isinstance(region, list):
                    region_conditions = []
                    for idx, r in enumerate(region):
                        region_conditions.append(f"demographics->>'region' = :r{idx}")
                        params[f"r{idx}"] = r
                    if region_conditions:
                        base_sql += " AND (" + " OR ".join(region_conditions) + ")"
                else:
                    base_sql += " AND demographics->>'region' = :region"
                    params["region"] = region
        
        # 거리 오름차순으로 정렬하고 LIMIT (코사인 거리 기준, 작을수록 유사)
        base_sql += " ORDER BY distance ASC LIMIT :limit"
        params["limit"] = limit
        
        print(f"[DEBUG Vector] 벡터 검색 SQL:")
        print(f"[DEBUG Vector] {base_sql[:500]}")
        print(f"[DEBUG Vector] 파라미터 키: {list(params.keys())}")
        
        result = await session.execute(text(base_sql), params)
        rows = [dict(row) for row in result.mappings()]
        
        print(f"[DEBUG Vector] 검색 결과 수: {len(rows)}")
        if rows:
            print(f"[DEBUG Vector] 첫 번째 결과 similarity: {rows[0].get('similarity')}")
        
        print(f"[DEBUG Vector] ========== 벡터 검색 완료 ==========")
        
        return rows
        
    except Exception as e:
        import traceback
        error_type = type(e).__name__
        error_msg = str(e)
        
        print(f"[DEBUG Vector] ❌ 벡터 검색 실패:")
        print(f"[DEBUG Vector] 에러 타입: {error_type}")
        print(f"[DEBUG Vector] 에러 메시지: {error_msg}")
        print(f"[DEBUG Vector] 스택 트레이스:")
        traceback.print_exc()
        print(f"[DEBUG Vector] ============================================")
        
        # 원본 에러를 그대로 전파 (상위에서 처리)
        raise

