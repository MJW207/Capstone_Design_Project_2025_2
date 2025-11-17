"""클러스터링 설정"""

# 클러스터링에 사용할 피처 목록

CLUSTERING_FEATURES = [
    # 인구통계
    'age_scaled',
    'Q6_scaled',
    'education_level_scaled',
    'is_metro',
    
    # 가족
    'has_children',
    'children_category_ordinal',
    'family_type_기혼_자녀있음',
    
    # 소비
    'is_premium_car',
    'is_premium_phone',
    'is_apple_user',
    'has_car',
    'Q8_premium_count',
    
    # 라이프스타일
    'has_drinking_experience',
    'drinking_types_count',
    'has_smoking_experience',
    'is_college_graduate',
]

# 피처 설명 (UI에 표시용)
FEATURE_DESCRIPTIONS = {
    'age_scaled': '연령',
    'Q6_scaled': '소득 수준',
    'education_level_scaled': '학력',
    'is_metro': '수도권 거주',
    'has_children': '자녀 유무',
    'children_category_ordinal': '자녀 수',
    'family_type_기혼_자녀있음': '기혼 자녀있음',
    'is_premium_car': '프리미엄 차량',
    'is_premium_phone': '프리미엄 폰',
    'is_apple_user': '애플 사용자',
    'has_car': '차량 보유',
    'Q8_premium_count': '프리미엄 제품 수',
    'has_drinking_experience': '음주 경험',
    'drinking_types_count': '음주 다양성',
    'has_smoking_experience': '흡연 경험',
    'is_college_graduate': '대졸 이상',
}

