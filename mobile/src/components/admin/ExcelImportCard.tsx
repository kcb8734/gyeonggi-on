import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  analyzeExcelFile,
  crawlExcelMetros,
  downloadExcelTemplate,
  isWebFilePickerAvailable,
  pickExcelFile,
  uploadExcelFile,
} from '../../utils/excelUpload';

type SheetRow = {
  sheet?: string;
  table?: string | null;
  known?: boolean;
  rows?: number;
  valid?: number;
  errorCount?: number;
  errors?: Array<{ row?: number; error?: string }>;
  samples?: string[];
  inserted?: number;
};

type CrawlPlan = { metro: string; label?: string; cities?: string[]; reason?: string; hints?: number; months?: number[] };
type CrawlRun = { metro: string; label?: string; fetched?: number; upserted?: number; persisted?: boolean; source?: string };

const STEPS = [
  { id: 'upload', label: '업로드' },
  { id: 'analyze', label: '분석' },
  { id: 'save', label: '저장' },
  { id: 'crawl', label: '크롤링' },
] as const;

export default function ExcelImportCard() {
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<(typeof STEPS)[number]['id']>('upload');
  const [sheets, setSheets] = useState<SheetRow[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [plan, setPlan] = useState<CrawlPlan[]>([]);
  const [totals, setTotals] = useState<{ valid?: number; errors?: number; rows?: number } | null>(null);
  const [year, setYear] = useState<number | undefined>();
  const [saved, setSaved] = useState(false);
  const [crawlRuns, setCrawlRuns] = useState<CrawlRun[]>([]);
  const fileRef = useRef<File | null>(null);
  const web = isWebFilePickerAvailable();

  const applyAnalysis = (payload: any) => {
    const analysis = payload?.analysis || payload;
    setSheets(Array.isArray(analysis?.sheets) ? analysis.sheets : []);
    setCities(Array.isArray(analysis?.cities) ? analysis.cities : []);
    setPlan(Array.isArray(analysis?.crawlPlan) ? analysis.crawlPlan : []);
    setTotals(analysis?.totals || null);
    if (analysis?.year) setYear(Number(analysis.year));
  };

  const handleTemplate = async () => {
    setError('');
    try {
      await downloadExcelTemplate();
      setMessage('템플릿을 내려받았습니다. 지자체/축제/가맹점 시트를 채워 올리세요.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '템플릿 다운로드에 실패했습니다.');
    }
  };

  const handlePick = async () => {
    setError('');
    setMessage('');
    setSaved(false);
    setCrawlRuns([]);
    if (!web) {
      setError('웹 관리자(https://www.kdanji.com/admin)에서 엑셀 파일을 올릴 수 있습니다.');
      return;
    }
    const file = await pickExcelFile();
    if (!file) return;
    fileRef.current = file;
    setFileName(file.name);
    setStep('upload');
    setBusy('analyze');
    try {
      const result = await analyzeExcelFile(file);
      applyAnalysis(result.data || result);
      setStep('analyze');
      setMessage(result.message || '엑셀 분석을 마쳤습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '엑셀 분석에 실패했습니다.');
    } finally {
      setBusy('');
    }
  };

  const handleSave = async () => {
    const file = fileRef.current;
    if (!file) {
      setError('먼저 엑셀 파일을 선택하세요.');
      return false;
    }
    setBusy('save');
    setError('');
    try {
      const result = await uploadExcelFile(file, { dryRun: false });
      const data = result.data || result;
      applyAnalysis(data);
      setSaved(true);
      setStep('save');
      setMessage(result.message || '백엔드에 저장했습니다.');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '백엔드 저장에 실패했습니다.');
      return false;
    } finally {
      setBusy('');
    }
  };

  const handleCrawl = async () => {
    setBusy('crawl');
    setError('');
    try {
      const metros = plan.map((item) => item.metro);
      const months = [...new Set(plan.flatMap((item) => item.months || []))];
      const result = await crawlExcelMetros(metros, { months, year });
      const data = result.data || result;
      setCrawlRuns(Array.isArray(data.runs) ? data.runs : []);
      setStep('crawl');
      setMessage(result.message || data.message || '구석구석 달력 크롤링을 마쳤습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '크롤링에 실패했습니다.');
    } finally {
      setBusy('');
    }
  };

  const handleSaveAndCrawl = async () => {
    const ok = await handleSave();
    if (ok) await handleCrawl();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>엑셀 업로드 · 분석 · 저장 · 크롤링</Text>
      <Text style={styles.hint}>
        엑셀을 올리면 조사표 E열 축제명, G열 장소, I·J열 시군구, L·M·N열(년·월·일) 시작일, O·P·Q열(년·월·일) 종료일을 읽어 PostgreSQL에 저장합니다. 부족한 축제 정보는 대한민국 구석구석 일자별 달력에서 크롤링합니다.
      </Text>
      <View style={styles.steps}>
        {STEPS.map((item, index) => {
          const on = STEPS.findIndex((row) => row.id === step) >= index;
          return (
            <View key={item.id} style={[styles.step, on && styles.stepOn]}>
              <Text style={[styles.stepNum, on && styles.stepNumOn]}>{index + 1}</Text>
              <Text style={[styles.stepLabel, on && styles.stepLabelOn]}>{item.label}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={styles.ghostBtn} onPress={handleTemplate} disabled={Boolean(busy)}>
          <Text style={styles.ghostText}>템플릿 받기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.excelBtn} onPress={handlePick} disabled={Boolean(busy)}>
          <Text style={styles.excelText}>{busy === 'analyze' ? '분석 중…' : (fileName ? '파일 다시 선택' : '엑셀 파일 선택')}</Text>
        </TouchableOpacity>
      </View>
      {fileName ? <Text style={styles.file}>{fileName}</Text> : null}

      {totals ? (
        <View style={styles.kpiRow}>
          <Text style={styles.kpi}>행 {totals.rows ?? 0}</Text>
          <Text style={styles.kpi}>유효 {totals.valid ?? 0}</Text>
          <Text style={styles.kpiWarn}>오류 {totals.errors ?? 0}</Text>
          <Text style={styles.kpi}>권역 {plan.length}</Text>
        </View>
      ) : null}

      {sheets.map((row) => (
        <View key={`${row.sheet}-${row.table}`} style={styles.sheetBox}>
          <Text style={styles.sheetTitle}>
            {row.sheet} → {row.tableLabel || row.table || (row.skipped ? '건너뜀' : '미지원')} · {row.valid ?? row.inserted ?? 0}/{row.rows ?? 0}건
          </Text>
          {row.reason ? <Text style={styles.sample}>{row.reason}</Text> : null}
          {row.samples?.length ? <Text style={styles.sample}>{(row.samples || []).join(' · ')}</Text> : null}
          {(row.errors || []).slice(0, 3).map((item) => (
            <Text key={`${row.sheet}-${item.row}`} style={styles.errLine}>{item.row}행: {item.error}</Text>
          ))}
        </View>
      ))}

      {cities.length ? <Text style={styles.file}>시군: {cities.slice(0, 12).join(', ')}</Text> : null}

      {plan.length ? (
        <View style={styles.planBox}>
          <Text style={styles.sheetTitle}>필요한 크롤링</Text>
          {plan.map((item) => (
            <Text key={item.metro} style={styles.sample}>
              {item.label || item.metro} — {item.reason}
              {item.cities?.length ? ` (${item.cities.slice(0, 6).join(', ')})` : ''}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.row}>
        <TouchableOpacity style={styles.ghostBtn} onPress={handleSave} disabled={Boolean(busy) || !fileName}>
          <Text style={styles.ghostText}>{busy === 'save' ? '저장 중…' : '백엔드에 저장'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.excelBtn} onPress={handleSaveAndCrawl} disabled={Boolean(busy) || !fileName}>
          <Text style={styles.excelText}>{busy ? '처리 중…' : '저장 후 크롤링'}</Text>
        </TouchableOpacity>
      </View>
      {saved ? (
        <TouchableOpacity style={styles.ghostBtn} onPress={handleCrawl} disabled={Boolean(busy)}>
          <Text style={styles.ghostText}>{busy === 'crawl' ? '크롤링 중…' : 'TourAPI 크롤링만 실행'}</Text>
        </TouchableOpacity>
      ) : null}

      {crawlRuns.map((row) => (
        <Text key={row.metro} style={styles.sheet}>
          {row.label || row.metro}: 수집 {row.fetched ?? 0} · 저장 {row.upserted ?? 0} · {row.source || ''}
        </Text>
      ))}
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 8 },
  hint: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 10, lineHeight: 18 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  stepOn: { backgroundColor: '#111827' },
  stepNum: { fontSize: 11, fontWeight: '800', color: '#6B7280' },
  stepNumOn: { color: '#fff' },
  stepLabel: { fontSize: 11, fontWeight: '800', color: '#374151' },
  stepLabelOn: { color: '#fff' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  excelBtn: { backgroundColor: '#111827', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  excelText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  ghostBtn: { backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  ghostText: { color: '#111827', fontSize: 12, fontWeight: '800' },
  file: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  kpi: { backgroundColor: '#ECFDF5', color: '#047857', fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  kpiWarn: { backgroundColor: '#FEF2F2', color: '#B91C1C', fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  sheetBox: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8, marginBottom: 8 },
  sheetTitle: { fontSize: 12, fontWeight: '800', color: '#111827' },
  sample: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginTop: 3, lineHeight: 16 },
  errLine: { fontSize: 11, fontWeight: '600', color: '#B91C1C', marginTop: 3 },
  planBox: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginBottom: 10 },
  ok: { marginTop: 6, fontSize: 12, fontWeight: '700', color: '#047857' },
  error: { marginTop: 6, fontSize: 12, fontWeight: '700', color: '#B91C1C' },
  sheet: { marginTop: 4, fontSize: 12, fontWeight: '600', color: '#374151' },
});
