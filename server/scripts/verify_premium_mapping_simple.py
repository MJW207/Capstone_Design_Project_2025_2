"""
프리미엄 제품명과 제품 번호 매핑 역계산 (간단 버전)
welcome_2nd_label.csv를 기반으로 매핑 확인
"""
import sys
from pathlib import Path
import pandas as pd

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 처음 버전에서 사용했던 프리미엄 제품명
ORIGINAL_PREMIUM_PRODUCT_NAMES = [
    "로봇청소기",
    "무선청소기(예:다이슨, 코드제로, 제트 등)",
    "안마의자",
    "의류 관리기(스타일러)",
    "가정용 식물 재배기",
    "식기세척기",
    "건조기",
    "커피 머신(에스프레소 머신, 캡슐커피 머신 등)"
]

# 기존 프리미엄 제품 번호
ORIGINAL_PREMIUM_PRODUCT_NUMBERS = [3, 9, 18, 20, 22, 25]

def load_q8_mapping():
    """welcome_2nd_label.csv에서 Q8 제품 매핑 로드"""
    label_path = project_root / "clustering_data" / "data" / "welcome_2nd_label.csv"
    
    if not label_path.exists():
        print(f"[오류] 라벨 파일을 찾을 수 없습니다: {label_path}")
        return None
    
    print(f"라벨 파일 로드 중: {label_path}")
    df = pd.read_csv(label_path, encoding='utf-8')
    
    # Q8 섹션 찾기
    q8_start_idx = None
    for i, row in df.iterrows():
        if 'Q8' in str(row['변수명']) and '보유전제품' in str(row['문항']):
            q8_start_idx = i
            break
    
    if q8_start_idx is None:
        print("[오류] Q8 섹션을 찾을 수 없습니다.")
        return None
    
    # Q8 제품 목록 추출
    product_mapping = {}  # {번호: 제품명}
    
    for i in range(q8_start_idx + 1, len(df)):
        row = df.iloc[i]
        var_name = str(row['변수명'])
        question = str(row['문항'])
        
        # Q8 섹션이 끝나면 중단
        if var_name.startswith('Q') and var_name != 'Q8' and var_name[1:].isdigit():
            break
        
        # 제품 번호와 제품명 추출
        try:
            product_num = int(var_name)
            product_name = question.strip()
            if product_name and product_name != 'nan':
                product_mapping[product_num] = product_name
        except:
            pass
    
    return product_mapping


def match_premium_products(product_mapping):
    """프리미엄 제품명과 번호 매칭"""
    print("\n" + "=" * 80)
    print("프리미엄 제품명-번호 매핑 결과")
    print("=" * 80)
    
    print(f"\n기존 프리미엄 제품 번호: {ORIGINAL_PREMIUM_PRODUCT_NUMBERS}")
    print(f"\n처음 버전 프리미엄 제품명 ({len(ORIGINAL_PREMIUM_PRODUCT_NAMES)}개):")
    for i, name in enumerate(ORIGINAL_PREMIUM_PRODUCT_NAMES, 1):
        print(f"  {i}. {name}")
    
    # 제품명 → 번호 매칭
    print("\n" + "-" * 80)
    print("제품명 → 번호 매칭 결과:")
    print("-" * 80)
    
    matched_numbers = {}
    unmatched_names = []
    
    for product_name in ORIGINAL_PREMIUM_PRODUCT_NAMES:
        # 정확한 매칭 시도
        matched = False
        for num, name in product_mapping.items():
            if product_name == name or product_name in name or name in product_name:
                matched_numbers[product_name] = num
                matched = True
                break
        
        if not matched:
            unmatched_names.append(product_name)
    
    print("\n매칭된 제품:")
    for product_name, number in matched_numbers.items():
        is_premium = number in ORIGINAL_PREMIUM_PRODUCT_NUMBERS
        status = "[프리미엄]" if is_premium else "[일반]"
        print(f"  {product_name}")
        print(f"    → 번호: {number} {status}")
        print(f"    → 실제 제품명: {product_mapping.get(number, 'N/A')}")
    
    if unmatched_names:
        print(f"\n매칭되지 않은 제품명 ({len(unmatched_names)}개):")
        for name in unmatched_names:
            print(f"  - {name}")
    
    # 역방향 검색: 프리미엄 번호에 해당하는 제품명
    print("\n" + "-" * 80)
    print("역방향 검색: 프리미엄 번호에 해당하는 제품명")
    print("-" * 80)
    
    for num in ORIGINAL_PREMIUM_PRODUCT_NUMBERS:
        product_name = product_mapping.get(num, "제품명 없음")
        is_in_original_list = any(name in product_name or product_name in name 
                                  for name in ORIGINAL_PREMIUM_PRODUCT_NAMES)
        status = "[처음 버전 프리미엄]" if is_in_original_list else "[일반]"
        print(f"  번호 {num}: {product_name} {status}")
    
    # 처음 버전 프리미엄 제품명에 해당하는 번호 추출
    print("\n" + "-" * 80)
    print("처음 버전 프리미엄 제품명에 해당하는 번호")
    print("-" * 80)
    
    original_premium_numbers = []
    for product_name in ORIGINAL_PREMIUM_PRODUCT_NAMES:
        for num, name in product_mapping.items():
            if product_name == name or product_name in name or name in product_name:
                if num not in original_premium_numbers:
                    original_premium_numbers.append(num)
                break
    
    original_premium_numbers.sort()
    print(f"\n처음 버전 프리미엄 제품 번호: {original_premium_numbers}")
    print(f"기존에 사용한 프리미엄 제품 번호: {ORIGINAL_PREMIUM_PRODUCT_NUMBERS}")
    
    if set(original_premium_numbers) == set(ORIGINAL_PREMIUM_PRODUCT_NUMBERS):
        print("\n[결과] [일치] 처음 버전 프리미엄 제품명과 기존 프리미엄 제품 번호가 일치합니다!")
    else:
        print("\n[결과] [불일치] 처음 버전 프리미엄 제품명과 기존 프리미엄 제품 번호가 일치하지 않습니다.")
        print(f"  차이점:")
        only_in_original = set(original_premium_numbers) - set(ORIGINAL_PREMIUM_PRODUCT_NUMBERS)
        only_in_used = set(ORIGINAL_PREMIUM_PRODUCT_NUMBERS) - set(original_premium_numbers)
        if only_in_original:
            print(f"    처음 버전에만 있는 번호: {sorted(only_in_original)}")
        if only_in_used:
            print(f"    기존에만 있는 번호: {sorted(only_in_used)}")


def main():
    """메인 함수"""
    print("=" * 80)
    print("프리미엄 제품명-번호 매핑 역계산")
    print("=" * 80)
    
    # 1. Q8 제품 매핑 로드
    product_mapping = load_q8_mapping()
    if product_mapping is None:
        return
    
    print(f"\n로드된 제품 매핑: {len(product_mapping)}개")
    print("\n전체 Q8 제품 목록:")
    for num in sorted(product_mapping.keys()):
        print(f"  {num}: {product_mapping[num]}")
    
    # 2. 프리미엄 제품명-번호 매칭
    match_premium_products(product_mapping)
    
    print("\n" + "=" * 80)
    print("완료!")
    print("=" * 80)


if __name__ == "__main__":
    main()

