import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { fetchFestivalAiSummary, type FestivalAiQuery, type FestivalAiSummary } from '../../api/festivalAi';

type Props = FestivalAiQuery & {
  officialOverview?: string;
  embedded?: boolean;
};

export default function FestivalAiSummaryCard({
  title,
  place,
  startDate,
  endDate,
  metro,
  category,
  overview,
  officialOverview,
  embedded,
}: Props) {
  const [data, setData] = React.useState<FestivalAiSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const name = String(title || '').trim();
    if (!name) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchFestivalAiSummary({
      title: name,
      place,
      startDate,
      endDate,
      metro,
      category,
      overview: officialOverview || overview,
    }).then((result) => {
      if (cancelled) return;
      setData(result);
      if (!result) setError('요약을 불러오지 못했습니다');
    }).catch(() => {
      if (!cancelled) {
        setData(null);
        setError('요약을 불러오지 못했습니다');
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [title, place, startDate, endDate, metro, category, overview, officialOverview]);

  const replaceOverview = !String(officialOverview || '').trim();
  const sourceLabel = data?.source === 'gemini' ? 'Gemini 요약' : 'AI 안내 요약';

  return (
    <View style={styles.wrap} accessibilityLabel="축제 AI 요약">
      {replaceOverview ? (
        <View style={styles.block}>
          {embedded ? null : (
            <View style={styles.head}>
              <Text style={styles.kicker}>{loading ? '상세 개요' : sourceLabel}</Text>
              {loading ? <ActivityIndicator size="small" color="#6D28D9" /> : null}
            </View>
          )}
          {embedded && loading ? (
            <View style={styles.head}>
              <Text style={styles.kicker}>{sourceLabel}</Text>
              <ActivityIndicator size="small" color="#6D28D9" />
            </View>
          ) : null}
          {loading ? (
            <Text style={styles.pending}>한국관광공사 상세 개요가 없어 Gemini 요약을 준비하고 있습니다</Text>
          ) : (
            <Text style={styles.body}>{data?.overview || error || '상세 개요를 아직 만들지 못했습니다'}</Text>
          )}
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.kicker}>주요 행사 내용 및 핵심 포인트 3가지</Text>
          {loading ? <ActivityIndicator size="small" color="#6D28D9" /> : null}
        </View>
        {loading ? (
          <Text style={styles.pending}>방문 포인트를 정리하고 있습니다</Text>
        ) : (data?.highlights || []).map((item, index) => (
          <Text key={`${index}-${item.slice(0, 12)}`} style={styles.point}>
            {index + 1}. {item}
          </Text>
        ))}
        {!loading && !data?.highlights?.length && error ? (
          <Text style={styles.pending}>{error}</Text>
        ) : null}

        <Text style={[styles.kicker, styles.tipLabel]}>방문객 맞춤형 팁</Text>
        {loading ? (
          <Text style={styles.pending}>방문 팁을 준비하고 있습니다</Text>
        ) : (
          <Text style={styles.body}>{data?.tips || ''}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, gap: 10 },
  block: { gap: 6 },
  card: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  kicker: { fontSize: 12, fontWeight: '800', color: '#6D28D9' },
  tipLabel: { marginTop: 12 },
  pending: { fontSize: 13, lineHeight: 20, color: '#6B7280', marginTop: 6 },
  body: { fontSize: 14, lineHeight: 21, color: '#374151', marginTop: 6 },
  point: { fontSize: 14, lineHeight: 21, color: '#374151', marginTop: 6 },
});
