import { useEffect, useMemo, useState } from "react";
import { Users, Zap, Circle, Sparkles, RefreshCcw } from "lucide-react";
import { CountUp } from "../ui/count-up";
import "../../styles/summary.css";

type Props = {
  total: number;
  qPlusW: number;
  wOnly: number;
  prevTotal?: number; // 비교용 (없으면 표시 안함)
  demographics?: { femaleRate?: number; avgAge?: number };
  topRegions?: Array<{ name: string; rate: number }>; // [{name:'서울',rate:45}, ...]
  tags?: string[]; // ['맛집','여행','운동']
};

export function SummaryBar({
  total,
  qPlusW,
  wOnly,
  prevTotal,
  demographics,
  topRegions = [],
  tags = [],
}: Props) {
  const [progress, setProgress] = useState(0);
  const qRate = total ? Math.round((qPlusW / total) * 100) : 0;
  const wRate = total ? Math.round((wOnly / total) * 100) : 0;
  const diff = prevTotal != null ? total - prevTotal : null;

  useEffect(() => {
    const id = setTimeout(() => setProgress(qRate), 50);
    return () => clearTimeout(id);
  }, [qRate]);

  const resultTone = total === 0 ? "zero" : total < 100 ? "mid" : "high";

  return (
    <section className="pi-summary-grid">
      {/* 1) 총 결과 Hero */}
      <article className="card hero">
        <header className="hero__head">
          <span className="icon icon--users">
            <Users size={18} />
          </span>
          <h4>총 검색 결과</h4>
        </header>

        <div className="hero__count">
          <CountUp end={total} duration={0.8} className={`hero__num tone-${resultTone}`} />
          <span className="hero__unit">명</span>
        </div>

        <div className="hero__underline" />

        {diff != null && (
          <div className="hero__delta">
            {diff >= 0 ? "↑" : "↓"} <b>{Math.abs(diff)}</b> vs 이전 검색
          </div>
        )}

        <div className="hero__chips">
          <span className="pill pill--q">🔷 Quickpoll</span>
          <span className="pill pill--w">⚪ W-only</span>
        </div>

        <div className="orb orb--blue" aria-hidden />
      </article>

      {/* 2) Q+W */}
      <article className="card stat stat--q">
        <header className="stat__head">
          <span className="icon icon--zap">
            <Zap size={16} />
          </span>
          <h5>Q+W</h5>
        </header>

        <div className="stat__value">
          <span className="num num--q">
            <CountUp end={qPlusW} duration={0.6} />
          </span>
        </div>

        <div className="progress">
          <div className="bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="stat__meta">{qRate}% 응답률</div>
      </article>

      {/* 3) AI 인사이트 */}
      <InsightsPanel
        demographics={demographics}
        topRegions={topRegions}
        q={{ n: qPlusW, rate: qRate }}
        w={{ n: wOnly, rate: wRate }}
        tags={tags}
      />

      {/* 4) W-only (아래줄 좌측 병합) */}
      <article className="card stat stat--w">
        <header className="stat__head">
          <span className="icon icon--circle">
            <Circle size={16} />
          </span>
          <h5>W only</h5>
        </header>

        <div className="stat__value">
          <span className="num num--w">
            <CountUp end={wOnly} duration={0.6} />
          </span>
        </div>

        <div className="dash" />

        <div className="stat__meta">{wRate}% 비율</div>
      </article>
    </section>
  );
}

/* 우측 AI 인사이트 */
function InsightsPanel({
  demographics,
  topRegions,
  q,
  w,
  tags,
}: {
  demographics?: { femaleRate?: number; avgAge?: number };
  topRegions: Array<{ name: string; rate: number }>;
  q: { n: number; rate: number };
  w: { n: number; rate: number };
  tags: string[];
}) {
  const female = demographics?.femaleRate ?? null;
  const age = demographics?.avgAge ?? null;

  return (
    <article className="card insight">
      <header className="insight__head">
        <div className="title">
          <span className="icon icon--spark">
            <Sparkles size={16} />
          </span>
          <h4>AI 인사이트</h4>
        </div>
        <div className="tools">
          <button className="tool" aria-label="도움말">
            ?
          </button>
          <button className="tool" aria-label="새로고침">
            <RefreshCcw size={14} />
          </button>
        </div>
      </header>

      <div className="insight__body">
        {/* 응답 구성 */}
        <section className="insight__block">
          <h6>응답 구성</h6>
          <div className="mini-cards">
            <div className="mini mini--q">
              <div className="kpi">
                <b>{q.n.toLocaleString()}명</b>
                <span>{q.rate}%</span>
              </div>
              <div className="label">Quick</div>
            </div>
            <div className="mini mini--w">
              <div className="kpi">
                <b>{w.n.toLocaleString()}명</b>
                <span>{w.rate}%</span>
              </div>
              <div className="label">W-only</div>
            </div>
          </div>
        </section>

        {/* 인구통계 */}
        {(female != null || age != null) && (
          <section className="insight__block">
            <h6>인구통계</h6>
            {female != null && (
              <div className="meter">
                <div className="meta">
                  <span>여성 비율</span>
                  <b>{female}%</b>
                </div>
                <div className="track">
                  <div className="fill fill--pink" style={{ width: `${female}%` }} />
                </div>
              </div>
            )}
            {age != null && (
              <div className="age">
                <span className="label">평균 연령</span>
                <b className="age-val">{age}세</b>
              </div>
            )}
          </section>
        )}

        {/* 주요 지역 */}
        {topRegions?.length > 0 && (
          <section className="insight__block">
            <h6>주요 지역</h6>
            <div className="chips">
              {topRegions.slice(0, 3).map((r, i) => (
                <span key={r.name} className={`chip chip--rank-${i + 1}`}>
                  {i === 0 ? "🔷" : i === 1 ? "🔶" : "⚪"} {r.name} {r.rate}%
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 관심사 태그 */}
        {tags?.length > 0 && (
          <section className="insight__block">
            <h6>관심사 태그</h6>
            <div className="tags">
              {tags.slice(0, 6).map((t) => (
                <span key={t} className={`tag tag--${tagTone(t)}`}>
                  #{t}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="orb orb--purple" aria-hidden />
    </article>
  );
}

function tagTone(t: string) {
  const map = { 맛집: "red", 여행: "green", 운동: "blue" } as Record<string, string>;
  return map[t] ?? "blue";
}

