import streamlit as st
import pandas as pd
from pathlib import Path
import re
import json  # JSON 파싱용

# ===== 1. 데이터 로드 + answers 펼치기 =====
DATA_PATH = Path(__file__).parent / "merged_final_data.json"

@st.cache_data
def load_data():
    # 파일 존재 확인
    if not DATA_PATH.exists():
        st.error(f"데이터 파일을 찾을 수 없습니다: {DATA_PATH}")
        st.stop()

    # JSON 로드 (UTF-8 BOM 제거 포함)
    try:
        with open(DATA_PATH, "r", encoding="utf-8-sig") as f:
            data = json.load(f)
    except Exception as e:
        st.error(f"JSON 파싱에 실패했습니다: {e}")
        st.stop()

    # 최상단이 dict면, 안에 리스트 키를 찾아서 사용 (data / rows / records 등)
    if isinstance(data, dict):
        for key in ["data", "rows", "records"]:
            if key in data and isinstance(data[key], list):
                data = data[key]
                break

    # 여기까지 왔는데 여전히 리스트가 아니면 에러
    if not isinstance(data, list):
        st.error("JSON 최상단 구조가 리스트(배열)가 아닙니다. "
                 "대상은 [ {...}, {...}, ... ] 형태여야 합니다.")
        st.stop()

    # data → DataFrame
    df = pd.DataFrame(data)

    # ---- answers 컬럼에서 Q001~Qxxx 펼치기 ----
    if "answers" in df.columns:
        q_keys = set()
        for a in df["answers"]:
            if isinstance(a, dict):
                q_keys.update(a.keys())

        for q in sorted(q_keys):
            def extract_answer(ans):
                if not isinstance(ans, dict):
                    return None
                item = ans.get(q)
                if not isinstance(item, dict):
                    return None
                val = item.get("answer")
                if isinstance(val, list):
                    return ", ".join(map(str, val))
                return val
            df[q] = df["answers"].apply(extract_answer)

    # object → str 통일 (리스트/None도 포함해서 통으로 문자열 처리)
    for col in df.columns:
        if df[col].dtype == "object":
            df[col] = df[col].astype(str)

    return df

df = load_data()

# ===== 2. 컬럼 이름 매핑 =====
def pick_col(candidates):
    for c in candidates:
        if c in df.columns:
            return c
    return None

COL_ID        = pick_col(["mb_sn", "panel_id", "id"])
COL_LOCATION  = pick_col(["location", "지역", "거주지역"])
COL_DETAILL   = pick_col(["detail_location", "세부지역", "detailLocation", "detail_loc"])
COL_GENDER    = pick_col(["gender", "성별"])
COL_AGEGROUP  = pick_col(["age_group", "연령대"])
COL_AGE       = pick_col(["age", "나이"])
COL_BIRTHYEAR = pick_col(["birth_year", "출생년도", "출생연도"])

# welcome2(프로파일) 기본 항목
COL_MARRIAGE      = pick_col(["결혼여부", "marriage"])      # Q1
COL_CHILDREN      = pick_col(["자녀수"])                    # Q2
COL_FAMILY_SIZE   = pick_col(["가족수"])                    # Q3
COL_EDU           = pick_col(["최종학력"])                  # Q4
COL_JOB           = pick_col(["직업", "job"])               # Q5
COL_JOB_DETAIL    = pick_col(["직무"])                      # Q5_1
COL_INCOME_PERSON = pick_col(["월평균 개인소득"])           # Q6
COL_INCOME_HOUSE  = pick_col(["월평균 가구소득"])           # Q7
COL_OWN_APPLIANCES = pick_col(["보유전제품"])               # Q8

COL_PHONE_BRAND   = pick_col(["보유 휴대폰 단말기 브랜드"])  # Q9_1
COL_PHONE_MODEL   = pick_col(["보유 휴대폰 모델명"])        # Q9_2

COL_CAR_OWN       = pick_col(["보유차량여부"])              # Q10
COL_CAR_MAKER     = pick_col(["자동차 제조사"])             # Q11_1
COL_CAR_MODEL     = pick_col(["자동차 모델"])               # Q11_2

# 흡연/음주 관련 welcome2 항목
COL_SMOKING           = pick_col(["흡연경험"])                     # Q12 (복수)
COL_SMOKE_BRAND       = pick_col(["흡연경험 담배브랜드"])          # Q12_1
COL_HEAT_NOT_BURN     = pick_col(["궐련형 전자담배/가열식 전자담배 이용경험"])  # Q12_2

COL_DRINK        = pick_col(["음용경험 술"])                       # Q13 (복수)

# Q001~ 같은 질문 컬럼 (Q 뒤에 숫자 3자리)
QUESTION_COLS = [c for c in df.columns if re.match(r"^Q\d{3}$", c)]

# ===== 3. Quickpoll 질문 메타정보 =====
QUESTION_META = {
    "Q001": {"topic": "스트레스", "text": "다음 중 가장 스트레스를 많이 느끼는 상황은 무엇인가요?"},
    "Q002": {"topic": "스트레스", "text": "스트레스를 해소하는 방법으로 주로 사용하는 것은 무엇인가요?"},
    "Q003": {"topic": "미용", "text": "현재 본인의 피부 상태에 얼마나 만족하시나요?"},
    "Q004": {"topic": "미용", "text": "한 달 기준으로 스킨케어 제품에 평균적으로 얼마나 소비하시나요?"},
    "Q005": {"topic": "미용", "text": "스킨케어 제품을 구매할 때 가장 중요하게 고려하는 요소는 무엇인가요?"},
    "Q006": {"topic": "AI 서비스", "text": "여러분이 사용해 본 AI 챗봇 서비스는 무엇인가요? 모두 선택해주세요."},
    "Q007": {"topic": "AI 서비스", "text": "사용해 본 AI 챗봇 서비스 중 주로 사용하는 것은 무엇인가요?"},
    "Q008": {"topic": "AI 서비스", "text": "AI 챗봇 서비스를 주로 어떤 용도로 활용하셨거나, 앞으로 활용하고 싶으신가요?"},
    "Q009": {"topic": "AI 서비스", "text": "다음 두 서비스 중, 어느 서비스에 더 호감이 가나요?"},
    "Q010": {"topic": "미디어", "text": "여러분이 현재 이용 중인 OTT 서비스는 몇 개인가요?"},
    "Q011": {"topic": "소비", "text": "여러분은 전통시장을 얼마나 자주 방문하시나요?"},
    "Q012": {"topic": "소비", "text": "여러분이 가장 선호하는 설 선물 유형은 무엇인가요?"},
    "Q013": {"topic": "경험", "text": "초등학생 시절 겨울방학 때 가장 기억에 남는 일은 무엇인가요?"},
    "Q014": {"topic": "경험", "text": "여러분은 반려동물을 키우는 중이시거나 혹은 키워보신 적이 있으신가요?"},
    "Q015": {"topic": "스트레스", "text": "여러분은 이사할 때 가장 스트레스 받는 부분은 어떤걸까요?"},
    "Q016": {"topic": "소비", "text": "여러분은 본인을 위해 소비하는 것 중 가장 기분 좋아지는 소비는 무엇인가요?"},
    "Q017": {"topic": "미디어", "text": "여러분은 요즘 가장 많이 사용하는 앱은 무엇인가요?"},
    "Q018": {"topic": "소비", "text": "빠른 배송(당일·새벽·직진 배송) 서비스를 주로 어떤 제품을 구매할 때 이용하시나요?"},
    "Q019": {"topic": "계절", "text": "여러분은 다가오는 여름철 가장 걱정되는 점이 무엇인가요?"},
    "Q020": {"topic": "라이프스타일", "text": "여러분은 버리기 아까운 물건이 있을 때, 주로 어떻게 하시나요?"},
    "Q021": {"topic": "라이프스타일", "text": "여러분은 아침에 기상하기 위해 어떤 방식으로 알람을 설정해두시나요?"},
    "Q022": {"topic": "라이프스타일", "text": "여러분은 외부 식당에서 혼자 식사하는 빈도는 어느 정도인가요?"},
    "Q023": {"topic": "건강", "text": "여러분이 가장 중요하다고 생각하는 행복한 노년의 조건은 무엇인가요?"},
    "Q024": {"topic": "경험", "text": "여러분이 지금까지 해본 다이어트 중 가장 효과 있었던 방법은 무엇인가요?"},
    "Q025": {"topic": "식음료 습관", "text": "여러분은 야식을 먹을 때 보통 어떤 방법으로 드시나요?"},
    "Q026": {"topic": "식음료 습관", "text": "여름철 최애 간식은 무엇인가요?"},
    "Q027": {"topic": "소비", "text": "여러분은 최근 가장 지출을 많이 한 곳은 어디입니까?"},
    "Q028": {"topic": "라이프스타일", "text": "여러분은 본인을 미니멀리스트와 맥시멀리스트 중 어디에 더 가깝다고 생각하시나요?"},
    "Q029": {"topic": "여행", "text": "어려분은 여행갈 때 어떤 스타일에 더 가까우신가요?"},
    "Q030": {"topic": "소비", "text": "여러분은 할인, 캐시백, 멤버십 등 포인트 적립 혜택을 얼마나 신경 쓰시나요?"},
    "Q031": {"topic": "식음료 습관", "text": "여러분은 초콜릿을 주로 언제 드시나요?"},
    "Q032": {"topic": "계절", "text": "갑작스런 비로 우산이 없을 때 여러분은 어떻게 하시나요?"},
    "Q033": {"topic": "경험", "text": "여러분의 휴대폰 갤러리에 가장 많이 저장되어져 있는 사진은 무엇인가요?"},
    "Q034": {"topic": "여행", "text": "여러분이 여름철 물놀이 장소로 가장 선호하는 곳은 어디입니까?"},
    "Q035": {"topic": "건강", "text": "여러분은 평소 체력 관리를 위해 어떤 활동을 하고 계신가요? 모두 선택해주세요."},
    "Q036": {"topic": "여행", "text": "여러분은 올해 해외여행을 간다면 어디로 가고 싶나요? 모두 선택해주세요"},
    "Q037": {"topic": "계절", "text": "여름철 땀 때문에 겪는 불편함은 어떤 것이 있는지 모두 선택해주세요."},
    "Q038": {"topic": "AI 서비스", "text": "여러분은 요즘 어떤 분야에서 AI 서비스를 활용하고 계신가요?"},
    "Q039": {"topic": "라이프스타일", "text": "평소 일회용 비닐봉투 사용을 줄이기 위해 어떤 노력을 하고 계신가요?"},
    "Q040": {"topic": "라이프스타일", "text": "여러분은 평소 개인정보보호를 위해 어떤 습관이 있으신가요?"},
    "Q041": {"topic": "계절", "text": "여러분이 절대 포기할 수 없는 여름 패션 필수템은 무엇인가요?"},
}

# ===== 4. Welcome 코드북 기반 옵션 =====
WELCOME_OPTIONS = {
    "결혼여부": ["미혼", "기혼", "기타(사별/이혼 등)"],
    "가족수": ["1명(혼자 거주)", "2명", "3명", "4명", "5명 이상"],
    "최종학력": [
        "고등학교 졸업 이하",
        "대학교 재학(휴학 포함)",
        "대학교 졸업",
        "대학원 재학/졸업 이상",
    ],
    "직업": [
        "전문직 (의사, 간호사, 변호사, 회계사, 예술가, 종교인, 엔지니어, 프로그래머, 기술사 등)",
        "교직 (교수, 교사, 강사 등)",
        "경영/관리직 (사장, 대기업 간부, 고위 공무원 등)",
        "사무직 (기업체 차장 이하 사무직 종사자, 공무원 등)",
        "자영업 (제조업, 건설업, 도소매업, 운수업, 무역업, 서비스업 경영)",
        "판매직 (보험판매, 세일즈맨, 도/소매업 직원, 부동산 판매, 행상, 노점상 등)",
        "서비스직 (미용, 통신, 안내, 요식업 직원 등)",
        "생산/노무직 (차량운전자, 현장직, 생산직 등)",
        "기능직 (기술직, 제빵업, 목수, 전기공, 정비사, 배관공 등)",
        "농업/임업/축산업/광업/수산업",
        "임대업",
        "중/고등학생",
        "대학생/대학원생",
        "전업주부",
        "퇴직/연금생활자",
        "무직",
    ],
    "직무": [
        "경영•인사•총무•사무",
        "재무•회계•경리",
        "금융•보험•증권",
        "마케팅•광고•홍보•조사",
        "무역•영업•판매•매장관리",
        "고객상담•TM",
        "전문직•법률•인문사회•임원",
        "의료•간호•보건•복지",
        "교육•교사•강사•교직원",
        "방송•언론",
        "문화•스포츠",
        "서비스•여행•숙박•음식•미용•보안",
        "유통•물류•운송•운전",
        "디자인",
        "인터넷•통신",
        "IT",
        "모바일",
        "게임",
        "전자•기계•기술•화학•연구개발",
        "건설•건축•토목•환경",
        "생산•정비•기능•노무",
    ],
    "월평균 개인소득": [
        "월 100만원 미만",
        "월 100~199만원",
        "월 200~299만원",
        "월 300~399만원",
        "월 400~499만원",
        "월 500~599만원",
        "월 600~699만원",
        "월 700~799만원",
        "월 800~899만원",
        "월 900~999만원",
        "월 1000만원 이상",
        "모름/무응답",
    ],
    "월평균 가구소득": [
        "월 100만원 미만",
        "월 100~199만원",
        "월 200~299만원",
        "월 300~399만원",
        "월 400~499만원",
        "월 500~599만원",
        "월 600~699만원",
        "월 700~799만원",
        "월 800~899만원",
        "월 900~999만원",
        "월 1000만원 이상",
        "모름/무응답",
    ],
    "보유전제품": [
        "TV", "냉장고", "김치냉장고", "세탁기", "에어컨", "제습기",
        "공기청정기(에어 케어)", "정수기", "일반청소기", "로봇청소기",
        "무선청소기(예:다이슨, 코드제로, 제트 등)", "커피 머신(에스프레소 머신, 캡슐커피 머신 등)",
        "안마의자", "음식물 처리기", "비데", "의류 관리기(스타일러)",
        "건조기", "전기레인지(하이라이트, 인덕션, 핫플레이트 등)",
        "식기세척기", "에어프라이기", "가정용 식물 재배기",
        "노트북", "태블릿PC (아이패드, 갤럭시 탭 등)",
        "데스크탑", "무선 이어폰(예: 에어팟, 갤럭시 버즈 등)",
        "스마트 워치(예: 애플워치, 갤럭시 워치, 샤오미 등)",
        "인공지능 AI 스피커", "블루투스 스피커",
    ],
    "보유 휴대폰 단말기 브랜드": [
        "애플 (아이폰)",
        "삼성전자 (갤럭시, 노트)",
        "LG전자",
        "LG전자(V 시리즈, G 시리즈 등)",
    ],
    "보유차량여부": ["있다", "없다"],
    "흡연경험": [
        "일반 담배",
        "궐련형 전자 담배/ 가열식 담배 ((예) 아이코스, 글로, 릴만 해당 됨)",
        "액상형 전자담배 ((예) 저스트포그 등)",
        "하이브리드형 전자담배 ((예) 릴 하이브리드, 글로센스, 풀룸테크 등)",
        "기타 담배(머금는 담배(스누스), 물담배, 시가 등)",
        "담배를 피워본 적이 없다",
    ],
    "음용경험 술": [
        "소주",
        "맥주",
        "저도주 (맥주, 막걸리, 와인 등을 제외한 18도 미만의 술)",
        "막걸리/탁주",
        "양주 (위스키, 보드카, 데킬라, 진 등)",
        "와인",
        "과일칵테일주 (도수가 낮고, 과일 맛을 첨가한 술 - KGB, 후치, 크루저 등이 있음)",
        "일본청주/사케",
        "최근 1년 이내 술을 마시지 않음",
    ],
}

# ===== 5. Streamlit 기본 설정 =====
st.set_page_config(page_title="패널 조회기 (merged_final_data)", layout="wide")
st.title("패널 조회기 (merged_final_data.json 기반)")

# 공통 마스크
mask = pd.Series(True, index=df.index)

# ===== 6. 유틸 함수 =====
def add_select_filter(col_name, label):
    """df 고유값 기반 단일 선택 필터"""
    global mask
    if col_name is None:
        return
    values = sorted(df[col_name].dropna().unique().tolist())
    values = [v for v in values if v not in ["", "nan", "None"]]
    if not values:
        return
    options = ["(전체)"] + values
    selected = st.sidebar.selectbox(label, options)
    if selected != "(전체)":
        mask = mask & (df[col_name] == selected)

def add_select_filter_fixed(col_name, label, options, multi=False, contains=False):
    """코드북 옵션 기반 필터 (웰2)
    multi=True  → multiselect
    contains=True → 문자열 포함(복수 응답) 기준
    """
    global mask
    if col_name is None:
        return

    # 실제 데이터 값에 존재하는 것만 필터 옵션으로 사용 (오타 대비)
    existing_values = set(df[col_name].dropna().unique().tolist())
    valid_opts = [o for o in options if any(o in ev for ev in existing_values)]

    if not valid_opts:
        return

    if multi:
        selected = st.sidebar.multiselect(label, valid_opts)
        if not selected:
            return

        if contains:
            # 선택한 항목 중 하나라도 포함되면 True
            cond = df[col_name].apply(
                lambda x: any(sel in str(x) for sel in selected)
            )
        else:
            cond = df[col_name].isin(selected)

        mask = mask & cond

    else:
        options_show = ["(전체)"] + valid_opts
        selected = st.sidebar.selectbox(label, options_show)
        if selected != "(전체)":
            if contains:
                cond = df[col_name].apply(lambda x: selected in str(x))
            else:
                cond = (df[col_name] == selected)
            mask = mask & cond

# ===== 7. 사이드바: 지역 / 인구통계 필터 =====
st.sidebar.header("① 기본 지역/인구통계 필터")

add_select_filter(COL_LOCATION,  "[지역] 광역시/도")
add_select_filter(COL_DETAILL,   "[지역] 세부 지역(detail_location)")
add_select_filter(COL_GENDER,    "[성별]")
add_select_filter(COL_AGEGROUP,  "[연령대]")

# 나이 / 출생년도 범위
if COL_AGE:
    try:
        df_age = pd.to_numeric(df[COL_AGE], errors="coerce")
        if df_age.notna().any():
            min_age, max_age = int(df_age.min()), int(df_age.max())
            age_range = st.sidebar.slider(
                "[나이] 범위", min_value=min_age, max_value=max_age,
                value=(min_age, max_age)
            )
            mask = mask & df_age.between(age_range[0], age_range[1])
    except Exception:
        pass
elif COL_BIRTHYEAR:
    try:
        df_year = pd.to_numeric(df[COL_BIRTHYEAR], errors="coerce")
        if df_year.notna().any():
            min_y, max_y = int(df_year.min()), int(df_year.max())
            year_range = st.sidebar.slider(
                "[출생년도] 범위", min_value=min_y, max_value=max_y,
                value=(min_y, max_y)
            )
            mask = mask & df_year.between(year_range[0], year_range[1])
    except Exception:
        pass

# ===== 8. 사이드바: Welcome(웰2) 코드북 기반 + 전체 항목 필터 =====
st.sidebar.header("② Welcome 프로파일 필터 (코드북 제한)")

# Q1 결혼여부
add_select_filter_fixed(COL_MARRIAGE, "[Q1] 결혼여부", WELCOME_OPTIONS.get("결혼여부", []))

# Q2 자녀수 (실제 값 기준)
if COL_CHILDREN:
    try:
        ch_vals = sorted(df[COL_CHILDREN].dropna().unique().tolist())
        ch_vals = [v for v in ch_vals if v not in ["nan", "None", ""]]
        if ch_vals:
            options = ["(전체)"] + [str(v) for v in ch_vals]
            selected = st.sidebar.selectbox("[Q2] 자녀수", options)
            if selected != "(전체)":
                mask = mask & (df[COL_CHILDREN].astype(str) == selected)
    except Exception:
        pass

# Q3 가족수
add_select_filter_fixed(COL_FAMILY_SIZE, "[Q3] 가족수", WELCOME_OPTIONS.get("가족수", []))

# Q4 최종학력
add_select_filter_fixed(COL_EDU, "[Q4] 최종학력", WELCOME_OPTIONS.get("최종학력", []))

# Q5 직업
add_select_filter_fixed(COL_JOB, "[Q5] 직업", WELCOME_OPTIONS.get("직업", []))

# Q5_1 직무
add_select_filter_fixed(COL_JOB_DETAIL, "[Q5_1] 직무", WELCOME_OPTIONS.get("직무", []))

# Q6 월평균 개인소득
add_select_filter_fixed(COL_INCOME_PERSON, "[Q6] 월평균 개인소득", WELCOME_OPTIONS.get("월평균 개인소득", []))

# Q7 월평균 가구소득
add_select_filter_fixed(COL_INCOME_HOUSE, "[Q7] 월평균 가구소득", WELCOME_OPTIONS.get("월평균 가구소득", []))

# Q8 보유전제품 (복수 선택, 포함 기준)
add_select_filter_fixed(
    COL_OWN_APPLIANCES,
    "[Q8] 보유 전제품 (복수 선택, 포함 기준)",
    WELCOME_OPTIONS.get("보유전제품", []),
    multi=True,
    contains=True,
)

# Q9_1 보유 휴대폰 단말기 브랜드
add_select_filter_fixed(
    COL_PHONE_BRAND,
    "[Q9_1] 보유 휴대폰 단말기 브랜드",
    WELCOME_OPTIONS.get("보유 휴대폰 단말기 브랜드", []),
)

# Q9_2 보유 휴대폰 모델명 (실제 데이터 값 기준)
add_select_filter(COL_PHONE_MODEL, "[Q9_2] 보유 휴대폰 모델명")

# Q10 보유 차량 여부
add_select_filter_fixed(
    COL_CAR_OWN,
    "[Q10] 보유 차량 여부",
    WELCOME_OPTIONS.get("보유차량여부", []),
)

# Q11_1 자동차 제조사 (실제 데이터 값 기준)
add_select_filter(COL_CAR_MAKER, "[Q11_1] 자동차 제조사")

# Q11_2 자동차 모델 (실제 데이터 값 기준)
add_select_filter(COL_CAR_MODEL, "[Q11_2] 자동차 모델")

# Q12 흡연경험 (복수 선택, 포함 기준)
add_select_filter_fixed(
    COL_SMOKING,
    "[Q12] 흡연경험 (복수 선택, 포함 기준)",
    WELCOME_OPTIONS.get("흡연경험", []),
    multi=True,
    contains=True,
)

# Q12_1 흡연경험 담배브랜드 (단일 선택, 실제 데이터 값 기준)
add_select_filter(COL_SMOKE_BRAND, "[Q12_1] 흡연경험 담배브랜드")


# Q12_2 궐련형 전자담배/가열식 전자담배 이용경험 (실제 값 기준)
add_select_filter(COL_HEAT_NOT_BURN, "[Q12_2] 궐련형/가열식 전자담배 이용경험")


# Q13 음용경험 술 (복수 선택, 포함 기준)
add_select_filter_fixed(
    COL_DRINK,
    "[Q13] 음용경험 술 (복수 선택, 포함 기준)",
    WELCOME_OPTIONS.get("음용경험 술", []),
    multi=True,
    contains=True,
)

# ===== 9. 사이드바: Qpoll 문항 필터 =====
st.sidebar.header("③ Quickpoll (Q001~Q041) 필터")

selected_q = None
selected_answers = []

if len(QUESTION_COLS) > 0:
    def q_label(q):
        meta = QUESTION_META.get(q)
        if meta:
            return f"{q} | [{meta['topic']}] {meta['text']}"
        return q

    q_options = ["(선택 안 함)"] + QUESTION_COLS
    q_labels  = ["(선택 안 함)"] + [q_label(q) for q in QUESTION_COLS]
    q_label_to_code = dict(zip(q_labels, q_options))

    selected_q_label = st.sidebar.selectbox("질문 선택", q_labels)
    selected_q = q_label_to_code[selected_q_label]

    if selected_q != "(선택 안 함)":
        tmp = df[mask]
        answer_vals = sorted(tmp[selected_q].dropna().unique().tolist())
        answer_vals = [v for v in answer_vals if v not in ["", "nan", "None"]]
        selected_answers = st.sidebar.multiselect(
            f"{selected_q} 응답값 선택",
            answer_vals
        )

# ===== 10. 필터 적용 & 결과 =====
filtered = df[mask].copy()

if selected_q and selected_q != "(선택 안 함)" and selected_answers:
    filtered = filtered[filtered[selected_q].isin(selected_answers)]

st.subheader("필터링 결과")

c1, c2, c3 = st.columns(3)
with c1:
    st.metric("선택된 패널 수", len(filtered))
with c2:
    if COL_ID:
        st.write("패널 ID 컬럼:", COL_ID)
with c3:
    if COL_AGE:
        st.write("나이 컬럼:", COL_AGE)
    elif COL_BIRTHYEAR:
        st.write("출생년도 컬럼:", COL_BIRTHYEAR)

# 선택된 Q 메타 정보
if selected_q and selected_q != "(선택 안 함)":
    meta = QUESTION_META.get(selected_q)
    if meta:
        st.info(f"**{selected_q} | [{meta['topic']}]** {meta['text']}")

# ===== 11. 테이블 표시 (나이 포함) =====
st.write("아래 테이블은 기본 프로파일 + 선택한 Q 컬럼만 먼저 보여줘요. 전체 보고 싶으면 체크박스 켜기.")

default_show_cols = [
    COL_ID,
    COL_LOCATION,
    COL_DETAILL,
    COL_GENDER,
    COL_AGEGROUP,
    COL_AGE,
    COL_BIRTHYEAR,
    COL_MARRIAGE,
    COL_CHILDREN,
    COL_FAMILY_SIZE,
    COL_EDU,
    COL_JOB,
    COL_JOB_DETAIL,
    COL_INCOME_PERSON,
    COL_INCOME_HOUSE,
]

if selected_q and selected_q != "(선택 안 함)":
    default_show_cols.append(selected_q)

# None 제거 + 중복 제거
default_show_cols = [c for c in default_show_cols if c]
default_show_cols = list(dict.fromkeys(default_show_cols))

show_all_cols = st.checkbox("전체 컬럼 보기")
if show_all_cols:
    st.dataframe(filtered, use_container_width=True)
else:
    cols_to_show = [c for c in default_show_cols if c in filtered.columns]
    if not cols_to_show:
        cols_to_show = filtered.columns
    st.dataframe(filtered[cols_to_show], use_container_width=True)

# ===== 12. 다운로드 =====
st.subheader("다운로드")

if COL_ID and len(filtered) > 0:
    id_csv = filtered[[COL_ID]].to_csv(index=False)
    st.download_button(
        label="패널 ID 리스트 CSV 다운로드",
        data=id_csv,
        file_name="panel_ids.csv",
        mime="text/csv"
    )

if len(filtered) > 0:
    all_csv = filtered.to_csv(index=False)
    st.download_button(
        label="필터링된 전체 데이터 CSV 다운로드",
        data=all_csv,
        file_name="filtered_panels.csv",
        mime="text/csv"
    )
else:
    st.write("⚠ 현재 조건에 해당하는 패널이 없습니다.")
