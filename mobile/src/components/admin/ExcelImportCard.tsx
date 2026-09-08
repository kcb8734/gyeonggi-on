import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  downloadExcelTemplate,
  isWebFilePickerAvailable,
  pickExcelFile,
  uploadExcelFile,
} from '../../utils/excelUpload';

type SheetResult = { sheet?: string; table?: string; inserted?: number; rows?: number };

export default function ExcelImportCard() {
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sheets, setSheets] = useState<SheetResult[]>([]);
  const fileRef = useRef<File | null>(null);

  const web = isWebFilePickerAvailable();

  const handleTemplate = async () => {
    setError('');
    setMessage('');
    try {
      await downloadExcelTemplate();
      setMessage('템플릿을 내려받았습니다. 지자체/축제/가맹점/프로모션 시트에 데이터를 채워 올리세요.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '템플릿 다운로드에 실패했습니다.');
    }
  };

  const handlePick = async () => {
    setError('');
    setMessage('');
    if (!web) {
      setError('웹 관리자(https://www.kdanji.com/admin)에서 엑셀 파일을 올릴 수 있습니다.');
      return;
    }
    const file = await pickExcelFile();
    if (!file) return;
    setFileName(file.name);
    setSheets([]);
    fileRef.current = file;
  };

  const runUpload = async (dryRun: boolean) => {
    const file = fileRef.current;
    if (!file) {
      setError('먼저 엑셀 파일을 선택하세요.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await uploadExcelFile(file, { dryRun });
      const data = result.data || result;
      setSheets(Array.isArray(data.sheets) ? data.sheets : []);
      setMessage(result.message || data.message || (dryRun ? '미리보기가 완료되었습니다.' : '적재가 완료되었습니다.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : '엑셀 업로드에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>엑셀 일괄 등록</Text>
      <Text style={styles.hint}>
        지자체·축제·가맹점·프로모션 시트가 있는 .xlsx 파일을 올리면 PostgreSQL에 적재합니다. 한글 헤더 템플릿을 받아 채워도 됩니다.
      </Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.ghostBtn} onPress={handleTemplate} disabled={busy}>
          <Text style={styles.ghostText}>템플릿 받기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.excelBtn} onPress={handlePick} disabled={busy}>
          <Text style={styles.excelText}>{fileName ? '파일 다시 선택' : '엑셀 파일 선택'}</Text>
        </TouchableOpacity>
      </View>
      {fileName ? <Text style={styles.file}>{fileName}</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => runUpload(true)} disabled={busy}>
          <Text style={styles.ghostText}>{busy ? '처리 중…' : '미리보기'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.excelBtn} onPress={() => runUpload(false)} disabled={busy}>
          <Text style={styles.excelText}>{busy ? '처리 중…' : 'DB에 적재'}</Text>
        </TouchableOpacity>
      </View>
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {sheets.map((row) => (
        <Text key={`${row.sheet}-${row.table}`} style={styles.sheet}>
          {row.sheet} → {row.table}: {row.inserted ?? row.rows ?? 0}건
        </Text>
      ))}
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  excelBtn: { backgroundColor: '#111827', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  excelText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  ghostBtn: { backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  ghostText: { color: '#111827', fontSize: 12, fontWeight: '800' },
  file: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  ok: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#047857' },
  error: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#B91C1C' },
  sheet: { marginTop: 4, fontSize: 12, fontWeight: '600', color: '#374151' },
});
