import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { CenterDirectorProfile, CenterLocalityRow } from '../../constants/centerDirectors';
import { buildCenterCardModel, type CenterCardModel } from '../../utils/centerCardDocument';
import { downloadCenterCard } from '../../utils/centerCardDocument';
import ModalExitButton from './ModalExitButton';
import OnAndOnPlusLogo from './OnAndOnPlusLogo';

const BASE_W = 368;
const BASE_H = Math.round(BASE_W * 52 / 92);
const PHOTO_W = Math.round(BASE_W * 20 / 92);
const PHOTO_H = Math.round(BASE_H * 25 / 52);

export function CenterCardFaces({ model }: { model: CenterCardModel }) {
  const initial = model.name.slice(0, 1);
  return (
    <View style={styles.faces}>
      <View style={styles.sheet}>
        <Text style={styles.sideLabel}>전면 · 9.2cm × 5.2cm</Text>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <OnAndOnPlusLogo height={22} />
            {model.photoUrl ? (
              <Image source={{ uri: model.photoUrl }} style={styles.photo} />
            ) : (
              <View style={styles.photo}><Text style={styles.photoInitial}>{initial}</Text></View>
            )}
          </View>
          <View style={styles.who}>
            <Text style={styles.name}>{model.name}</Text>
            <Text style={styles.bar}>|</Text>
            <Text style={styles.title}>{model.title}</Text>
          </View>
          <Text style={styles.brand}>온앤온 +</Text>
          <Text style={styles.dedicated}>{model.dedicatedCenter}</Text>
          <View style={styles.rule} />
          <View style={styles.grid}>
            <View style={styles.col}>
              <Text style={styles.line}><Text style={styles.key}>M. </Text>{model.phone}</Text>
              <Text style={styles.line}><Text style={styles.key}>A. </Text>{model.address}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.line}><Text style={styles.key}>E. </Text>{model.email}</Text>
              <Text style={styles.line}><Text style={styles.key}>W. </Text>{model.website}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.sheet}>
        <Text style={styles.sideLabel}>후면 · 지역 QR</Text>
        <View style={styles.card}>
          <OnAndOnPlusLogo height={22} />
          <View style={styles.backRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.slogan}>지자체 축제와{'\n'}소상공인 상생을 잇는{'\n'}온앤온+</Text>
            </View>
            <View style={styles.qrCol}>
              <QRCode value={model.qrUrl} size={86} />
              <Text style={styles.url}>{model.website}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CenterDirectorCard({
  visible,
  row,
  director,
  onClose,
}: {
  visible: boolean;
  row: CenterLocalityRow | null;
  director?: CenterDirectorProfile;
  onClose: () => void;
}) {
  const model = row ? buildCenterCardModel(row, director) : null;
  if (!visible || !row || !model) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.panel}>
          <ModalExitButton onPress={onClose} />
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            <Text style={styles.kicker}>온앤온+ 공식 디지털 명함</Text>
            <Text style={styles.panelTitle}>{row.regionLabel} {row.label} 센터장</Text>
            <CenterCardFaces model={model} />
            <TouchableOpacity style={styles.download} onPress={() => downloadCenterCard(model)}>
              <Text style={styles.downloadText}>명함 전·후면 다운로드 · 인쇄 (9.2×5.2cm)</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 12 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
  panel: {
    maxHeight: '92%',
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    overflow: 'hidden',
  },
  kicker: { color: '#0F766E', fontSize: 11, fontWeight: '800' },
  panelTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 4, marginBottom: 12 },
  faces: { gap: 12 },
  sheet: { gap: 6 },
  sideLabel: { fontSize: 11, fontWeight: '800', color: '#6B7280' },
  card: {
    width: BASE_W,
    maxWidth: '100%',
    height: BASE_H,
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  photo: {
    width: PHOTO_W,
    height: PHOTO_H,
    borderRadius: 12,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitial: { fontSize: 22, fontWeight: '800', color: '#6B7280' },
  who: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 },
  name: { fontSize: 22, fontWeight: '800', color: '#111827' },
  bar: { color: '#D1D5DB', fontSize: 16, fontWeight: '400' },
  title: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  brand: { marginTop: 6, fontSize: 16, fontWeight: '800', color: '#111827' },
  dedicated: { marginTop: 4, fontSize: 13, fontStyle: 'italic', fontWeight: '600', color: '#111827' },
  rule: { height: 1, backgroundColor: '#D1D5DB', marginTop: 10, marginBottom: 8 },
  grid: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 4 },
  line: { fontSize: 11, color: '#111827', lineHeight: 16 },
  key: { fontWeight: '800' },
  backRow: { flex: 1, flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  slogan: { fontSize: 16, fontWeight: '800', color: '#374151', lineHeight: 24 },
  qrCol: { alignItems: 'center', width: 110 },
  url: { marginTop: 6, fontSize: 10, color: '#111827' },
  download: {
    marginTop: 14,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  downloadText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
