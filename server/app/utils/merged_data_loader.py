"""merged_final.json 데이터 로더 (순환 import 방지)"""
from pathlib import Path
from typing import Dict, Any, Optional
import json
import logging

logger = logging.getLogger(__name__)

# 프로젝트 루트 경로
PROJECT_ROOT = Path(__file__).resolve().parents[3]
MERGED_FINAL_JSON = PROJECT_ROOT / 'merged_final.json'

# merged_final.json 데이터를 메모리에 캐싱
_merged_data_cache: Optional[Dict[str, Any]] = None


def load_merged_data() -> Dict[str, Any]:
    """merged_final.json 파일을 로드하고 mb_sn을 키로 하는 딕셔너리로 변환"""
    global _merged_data_cache
    
    if _merged_data_cache is not None:
        logger.info(f"[Merged Data] 캐시된 merged_data 사용: {len(_merged_data_cache)}개 패널")
        return _merged_data_cache
    
    logger.info(f"[Merged Data] merged_final.json 로드 시작: {MERGED_FINAL_JSON}")
    if not MERGED_FINAL_JSON.exists():
        logger.warning(f"[Merged Data] 경고: merged_final.json 파일이 존재하지 않음: {MERGED_FINAL_JSON}")
        return {}
    
    try:
        logger.info(f"[Merged Data] JSON 파일 읽기 시작...")
        with open(MERGED_FINAL_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)
        logger.info(f"[Merged Data] JSON 파일 읽기 완료: {len(data)}개 항목")
        
        # 배열을 mb_sn을 키로 하는 딕셔너리로 변환
        _merged_data_cache = {item['mb_sn']: item for item in data if 'mb_sn' in item}
        logger.info(f"[Merged Data] 딕셔너리 변환 완료: {len(_merged_data_cache)}개 패널")
        return _merged_data_cache
    except Exception as e:
        logger.error(f"[ERROR] merged_final.json 로드 실패: {str(e)}", exc_info=True)
        return {}

