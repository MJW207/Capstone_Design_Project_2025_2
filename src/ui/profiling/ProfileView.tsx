import { Users, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { ProfileBanner } from './ProfileBanner';
import { ProfileKPICard } from './ProfileKPICard';
import { ProfileCategoricalSection } from './ProfileCategoricalSection';
import { ProfileContinuousSection } from './ProfileContinuousSection';
import { ProfileQualityNotice } from './ProfileQualityNotice';
import { useDarkMode, useThemeColors } from '../../lib/DarkModeSystem';

interface ProfileData {
  count: number;
  age_mean?: number;
  age_std?: number;
  age_min?: number;
  age_max?: number;
  gender_distribution?: { [key: string]: number };
  region_lvl1_distribution?: { [key: string]: number };
  Q1_label_distribution?: { [key: string]: number };
  Q6_category_distribution?: { [key: string]: number };
  Q4_label_distribution?: { [key: string]: number };
  Q10_label_distribution?: { [key: string]: number };
  [key: string]: any;
}

interface ProfileViewProps {
  profile: ProfileData;
  sampleSize: number;
}

export function ProfileView({ profile, sampleSize }: ProfileViewProps) {
  const { isDark } = useDarkMode();
  const colors = useThemeColors();

  // 성별 분포 계산
  const genderTotal = profile.gender_distribution
    ? Object.values(profile.gender_distribution).reduce((a, b) => a + b, 0)
    : 0;
  const genderDistribution = profile.gender_distribution || {};
  const maleCount = genderDistribution['M'] || genderDistribution['male'] || 0;
  const femaleCount = genderDistribution['F'] || genderDistribution['female'] || 0;
  const malePct = genderTotal > 0 ? (maleCount / genderTotal) * 100 : 0;
  const femalePct = genderTotal > 0 ? (femaleCount / genderTotal) * 100 : 0;

  // 지역 분포 (상위 3개)
  const regionEntries = profile.region_lvl1_distribution
    ? Object.entries(profile.region_lvl1_distribution)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
    : [];

  return (
    <div className="w-full">
      {/* 상단 안내 배너 */}
      <ProfileBanner sampleSize={sampleSize} />

      {/* 핵심 통계 카드 (KPI) */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <ProfileKPICard
          icon={Users}
          label="분석 대상"
          value={profile.count || sampleSize}
          iconColor="#2563EB"
        />
        {profile.age_mean !== undefined && (
          <ProfileKPICard
            icon={Calendar}
            label="평균 연령"
            value={`${profile.age_mean.toFixed(1)}세`}
            subtitle={
              profile.age_std !== undefined
                ? `±${profile.age_std.toFixed(1)}세`
                : undefined
            }
            iconColor="#16A34A"
          />
        )}
        {genderTotal > 0 && (
          <ProfileKPICard
            icon={TrendingUp}
            label="성별 분포"
            value={`남 ${malePct.toFixed(0)}%`}
            subtitle={`여 ${femalePct.toFixed(0)}%`}
            iconColor="#F59E0B"
          />
        )}
        {regionEntries.length > 0 && (
          <ProfileKPICard
            icon={MapPin}
            label="주요 지역"
            value={regionEntries[0]?.[0] || '-'}
            subtitle={
              regionEntries.length > 1
                ? `${regionEntries[1]?.[0]}, ${regionEntries[2]?.[0]}`
                : undefined
            }
            iconColor="#8B5CF6"
          />
        )}
      </div>

      {/* 범주형 변수 분포 섹션 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {profile.Q1_label_distribution && (
          <ProfileCategoricalSection
            title="결혼 상태"
            distribution={profile.Q1_label_distribution}
            total={profile.count}
          />
        )}
        {profile.Q6_category_distribution && (
          <ProfileCategoricalSection
            title="소득 수준"
            distribution={profile.Q6_category_distribution}
            total={profile.count}
          />
        )}
        {profile.Q4_label_distribution && (
          <ProfileCategoricalSection
            title="학력"
            distribution={profile.Q4_label_distribution}
            total={profile.count}
          />
        )}
        {profile.Q10_label_distribution && (
          <ProfileCategoricalSection
            title="차량 보유"
            distribution={profile.Q10_label_distribution}
            total={profile.count}
          />
        )}
        {profile.region_lvl1_distribution && (
          <ProfileCategoricalSection
            title="지역 분포"
            distribution={profile.region_lvl1_distribution}
            total={profile.count}
          />
        )}
        {profile.gender_distribution && (
          <ProfileCategoricalSection
            title="성별 분포"
            distribution={profile.gender_distribution}
            total={profile.count}
          />
        )}
      </div>

      {/* 연속형 변수 통계 섹션 */}
      {profile.age_mean !== undefined && (
        <div className="mb-6">
          <ProfileContinuousSection
            title="연령 통계"
            mean={profile.age_mean}
            std={profile.age_std}
            min={profile.age_min}
            max={profile.age_max}
            unit="세"
          />
        </div>
      )}

      {/* 데이터 품질 안내 */}
      <ProfileQualityNotice />
    </div>
  );
}

