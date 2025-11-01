"""아티팩트 저장/로드 (UI 틀만)"""
import uuid
from pathlib import Path
from typing import Optional


BASE = Path("runs")
BASE.mkdir(exist_ok=True)


def new_session_dir() -> Path:
    """
    새로운 세션 디렉터리 생성 (UI 틀만)
    """
    # UI 틀만 남기고 구현 로직 제거
    d = BASE / str(uuid.uuid4())
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_artifacts(session_dir: Path, df: Any, labels: Any, meta: dict) -> None:
    """
    아티팩트 저장 (UI 틀만)
    
    실제 구현 로직은 제거됨
    """
    pass


def load_artifacts(session_id: str) -> Optional[dict]:
    """
    아티팩트 로드 (UI 틀만)
    
    실제 구현 로직은 제거됨
    """
    return None



