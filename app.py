import streamlit as st
import pandas as pd
from pathlib import Path
import re

# ===== 1. 데이터 로드 + answers 펼치기 =====
DATA_PATH = Path(__file__).parent / "merged_final_data.json"

@st.cache_data
def load_data():
    # 기본 가정: JSON은 레코드 리스트 형태 (to_json(orient="records") 기준)
    df = pd.read_json(DATA_PATH)

    # ---- answers 컬럼에서 Q001~ 같은 것들 펼치기 ----
    if "answers" in df.columns:
        q_keys = set()

        # 1) 전체 질문 코드 수집
        for a in df["answers"]:
            if isinstance(a, dict):
                q_keys.update(a.keys())

        # 2) 각 질문 코드별로 answer 값 뽑아서 새로운 컬럼 생성
        for q in sorted(q_keys):
            def extract_answer(ans):
                if not isinstance(ans, dict):
                    return None
                item = ans.get(q)
                if not isinstance(item, dict):
                    return None
                val = item.get("answer")
                # 만약 리스트(복수선택)면 콤마로 이어서 문자열로
                if isinstance(val, list):
                    return ", ".join(map(str, val))
                return val
            df[q] = df["answers"].apply(extract_answer)

    # 문자열/범주형으로 보이는 것들 기본적으로 string 처리 (NaN 대비)
    for col in df.columns:
        if df[col].dtype == "object":
            df[col] = df[col].astype(str)

    return df

df = load_data()

# ===== 2. 컬럼 이름 매핑(한글/영문 혼용 대비) =====
def pick_col(candidates):
    """df에 존재하는 첫 번째 컬럼명을 리턴. 없으면 None."""
    for c in candidates:
        if c in df.columns:
            return c
    return None

COL_ID        = pick_col(["mb_sn", "panel_id", "id"])
COL_LOCATION  = pick_col(["location", "지역", "거주지역"])
COL_GENDER    = pick_col(["gender", "성별"])
COL_AGEGROUP  = pick_col(["age_group", "연령대"])
COL_AGE       = pick_col(["age", "나이"])
COL_BIRTHYEAR = pick_col(["birth_year", "출생년도", "출생연도"])
COL_JOB       = pick_col(["직업", "job"])
COL_MARRIAGE  = pick_col(["결혼여부", "marriage"])
COL_DETAILL = pick_col(["detail_location", "세부지역", "detailLocation", "detail_loc"])


# Q001, Q002 같은 질문 컬럼 자동 탐색 (정규식으로 Q + 숫자 3자리)
QUESTION_COLS = [c for c in df.columns if re.match(r"^Q\d{3}$", c)]

# (옵션) 질문 메타정보 – 토픽/질문 문장 (원하면 더 채워도 됨)
QUESTION_META = {
    "Q001": {"topic": "스트레스", "text": "다음 중 가장 스트레스를 많이 느끼는 상황은 무엇인가요?"},
    "Q002": {"topic": "스트레스", "text": "스트레스를 해소하는 방법으로 주로 사용하는 것은 무엇인가요?"},
    "Q003": {"topic": "미용", "text": "현재 본인의 피부 상태에 얼마나 만족하시나요?"},
    "Q004": {"topic": "미용", "text": "한 달 기준으로 스킨케어 제품에 평균적으로 얼마나 소비하시나요?"},
    "Q005": {"topic": "미용", "text": "스킨케어 제품을 구매할 때 가장 중요하게 고려하는 요소는 무엇인가요?"},
    "Q006": {"topic": "AI 서비스", "text": "사용해 본 AI 챗봇 서비스는 무엇인가요? (복수 선택)"},
    "Q007": {"topic": "AI 서비스", "text": "사용해 본 AI 챗봇 서비스 중 주로 사용하는 것은 무엇인가요?"},
    "Q008": {"topic": "AI 서비스", "text": "AI 챗봇 서비스를 주로 어떤 용도로 활용하셨거나, 앞으로 활용하고 싶으신가요?"},
    "Q009": {"topic": "AI 서비스", "text": "다음 두 서비스 중, 어느 서비스에 더 호감이 가나요?"},
    "Q010": {"topic": "미디어", "text": "현재 이용 중인 OTT 서비스는 몇 개인가요?"},
    "Q011": {"topic": "소비", "text": "전통시장을 얼마나 자주 방문하시나요?"},
    "Q012": {"topic": "소비", "text": "가장 선호하는 설 선물 유형은 무엇인가요?"},
    "Q013": {"topic": "경험", "text": "초등학생 시절 겨울방학 때 가장 기억에 남는 일은 무엇인가요?"},
    "Q014": {"topic": "경험", "text": "반려동물을 키우는 중이시거나 혹은 키워보신 적이 있으신가요?"},
    "Q015": {"topic": "스트레스", "text": "이사할 때 가장 스트레스 받는 부분은 어떤걸까요?"},
    "Q016": {"topic": "소비", "text": "본인을 위해 소비하는 것 중 가장 기분 좋아지는 소비는 무엇인가요?"},
    "Q017": {"topic": "미디어", "text": "요즘 가장 많이 사용하는 앱은 무엇인가요?"},
    "Q018": {"topic": "소비", "text": "빠른 배송 서비스를 주로 어떤 제품을 구매할 때 이용하시나요?"},
    "Q019": {"topic": "계절", "text": "다가오는 여름철 가장 걱정되는 점이 무엇인가요?"},
    "Q020": {"topic": "라이프스타일", "text": "버리기 아까운 물건이 있을 때, 주로 어떻게 하시나요?"},
    "Q021": {"topic": "라이프스타일", "text": "아침에 기상하기 위해 어떤 방식으로 알람을 설정해두시나요?"},
    "Q022": {"topic": "라이프스타일", "text": "외부 식당에서 혼자 식사하는 빈도는 어느 정도인가요?"},
    "Q023": {"topic": "건강", "text": "가장 중요하다고 생각하는 행복한 노년의 조건은 무엇인가요?"},
    "Q024": {"topic": "경험", "text": "지금까지 해본 다이어트 중 가장 효과 있었던 방법은 무엇인가요?"},
    "Q025": {"topic": "식음료 습관", "text": "야식을 먹을 때 보통 어떤 방법으로 드시나요?"},
    "Q026": {"topic": "식음료 습관", "text": "여름철 최애 간식은 무엇인가요?"},
    "Q027": {"topic": "소비", "text": "최근 가장 지출을 많이 한 곳은 어디입니까?"},
    "Q028": {"topic": "라이프스타일", "text": "본인을 미니멀리스트와 맥시멀리스트 중 어디에 더 가깝다고 생각하시나요?"},
    "Q029": {"topic": "여행", "text": "여행갈 때 어떤 스타일에 더 가까우신가요?"},
    "Q030": {"topic": "소비", "text": "포인트 적립 혜택을 얼마나 신경 쓰시나요?"},
    "Q031": {"topic": "식음료 습관", "text": "초콜릿을 주로 언제 드시나요?"},
    "Q032": {"topic": "계절", "text": "갑작스런 비로 우산이 없을 때 어떻게 하시나요?"},
    "Q033": {"topic": "경험", "text": "휴대폰 갤러리에 가장 많이 저장되어 있는 사진은 무엇인가요?"},
    "Q034": {"topic": "여행", "text": "여름철 물놀이 장소로 가장 선호하는 곳은 어디입니까?"},
    "Q035": {"topic": "건강", "text": "평소 체력 관리를 위해 어떤 활동을 하고 계신가요?"},
    "Q036": {"topic": "여행", "text": "올해 해외여행을 간다면 어디로 가고 싶나요?"},
    "Q037": {"topic": "계절", "text": "여름철 땀 때문에 겪는 불편함은 어떤 것이 있는지 모두 선택해주세요."},
    "Q038": {"topic": "AI 서비스", "text": "요즘 어떤 분야에서 AI 서비스를 활용하고 계신가요?"},
    "Q039": {"topic": "라이프스타일", "text": "일회용 비닐봉투 사용을 줄이기 위해 어떤 노력을 하고 계신가요?"},
    "Q040": {"topic": "라이프스타일", "text": "개인정보보호를 위해 어떤 습관이 있으신가요?"},
    "Q041": {"topic": "계절", "text": "절대 포기할 수 없는 여름 패션 필수템은 무엇인가요?"},
}

# ===== 3. 페이지 세팅 =====
st.set_page_config(page_title="패널 조회기 (merged_final_data)", layout="wide")
st.title("패널 조회기 (merged_final_data.json 기반)")

# ===== 4. 사이드바: 기본 필터 =====
st.sidebar.header("기본 필터")

mask = pd.Series(True, index=df.index)

def add_select_filter(col_name, label):
    global mask
    if col_name is None:
        return
    values = sorted(df[col_name].dropna().unique().tolist())
    values = [v for v in values if v not in ["", "nan", "None"]]
    options = ["(전체)"] + values
    selected = st.sidebar.selectbox(label, options)
    if selected != "(전체)":
        mask = mask & (df[col_name] == selected)

add_select_filter(COL_LOCATION, "지역")
add_select_filter(COL_DETAILL, "세부 지역 (detail_location)")
add_select_filter(COL_GENDER, "성별")
add_select_filter(COL_AGEGROUP, "연령대")
add_select_filter(COL_JOB, "직업")
add_select_filter(COL_MARRIAGE, "결혼여부")


# 나이/출생년도 범위 필터
if COL_AGE:
    try:
        df_age = pd.to_numeric(df[COL_AGE], errors="coerce")
        min_age, max_age = int(df_age.min()), int(df_age.max())
        age_range = st.sidebar.slider("나이 범위", min_value=min_age, max_value=max_age, value=(min_age, max_age))
        mask = mask & df_age.between(age_range[0], age_range[1])
    except Exception:
        pass
elif COL_BIRTHYEAR:
    try:
        df_year = pd.to_numeric(df[COL_BIRTHYEAR], errors="coerce")
        min_y, max_y = int(df_year.min()), int(df_year.max())
        year_range = st.sidebar.slider("출생년도 범위", min_value=min_y, max_value=max_y, value=(min_y, max_y))
        mask = mask & df_year.between(year_range[0], year_range[1])
    except Exception:
        pass

# ===== 5. 사이드바: Qpoll 필터 =====
st.sidebar.header("문항(Q) 필터")

selected_q = None
selected_answers = []

if len(QUESTION_COLS) > 0:
    # 토픽/코드 같이 보이도록 라벨 구성
    def q_label(q):
        meta = QUESTION_META.get(q)
        if meta:
            return f"{q} | [{meta['topic']}] {meta['text']}"
        return q

    q_options = ["(선택 안 함)"] + QUESTION_COLS
    q_labels = ["(선택 안 함)"] + [q_label(q) for q in QUESTION_COLS]
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

# ===== 6. 필터 적용 & 결과 표시 =====
filtered = df[mask].copy()

if selected_q and selected_q != "(선택 안 함)" and selected_answers:
    filtered = filtered[filtered[selected_q].isin(selected_answers)]

st.subheader("필터링 결과")

count_col1, count_col2 = st.columns(2)
with count_col1:
    st.metric("선택된 패널 수", len(filtered))

if COL_ID:
    with count_col2:
        st.write("패널 ID 컬럼:", COL_ID)

# 질문 메타 간단 표시
if selected_q and selected_q != "(선택 안 함)":
    meta = QUESTION_META.get(selected_q)
    if meta:
        st.info(f"**{selected_q} | [{meta['topic']}]** {meta['text']}")

# 보여줄 기본 컬럼
default_show_cols = [c for c in [COL_ID, COL_LOCATION, COL_GENDER, COL_AGEGROUP, COL_JOB, COL_MARRIAGE] if c]
if selected_q and selected_q != "(선택 안 함)":
    default_show_cols.append(selected_q)
default_show_cols = list(dict.fromkeys(default_show_cols))  # 중복 제거

st.write("아래 테이블은 기본 컬럼 + 선택한 Q 컬럼만 먼저 보여줘요. 전체 보고 싶으면 체크박스 켜기.")

show_all_cols = st.checkbox("전체 컬럼 보기")
if show_all_cols:
    st.dataframe(filtered, use_container_width=True)
else:
    cols_to_show = [c for c in default_show_cols if c in filtered.columns]
    if len(cols_to_show) == 0:
        cols_to_show = filtered.columns
    st.dataframe(filtered[cols_to_show], use_container_width=True)

# ===== 7. 다운로드 =====
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
