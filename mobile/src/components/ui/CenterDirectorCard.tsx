import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
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
  const { width } = useWindowDimensions();
  const frame = Math.min(BASE_W, Math.max(240, width - 32));
  const s = frame / BASE_W;
  const compact = width < 640;
  const stackBack = frame < 340;
  const initial = model.name.slice(0, 1);
  const pad = Math.max(20, Math.round(28 * s));
  const logoH = Math.max(18, Math.round(22 * s));
  const qr = Math.max(56, Math.round((stackBack ? 72 : 86) * s));
  const cardHeight = compact ? undefined : Math.round(BASE_H * s);
  return (
    <View style={styles.faces}>
      <View style={styles.sheet}>
        <Text style={styles.sideLabel}>전면 · 9.2cm × 5.2cm</Text>
        <View style={[styles.card, { width: frame, height: cardHeight, minHeight: Math.round(BASE_H * s), paddingHorizontal: pad, paddingTop: pad, paddingBottom: Math.round(pad * 0.85) }]}>
          <View style={styles.topRow}>
            <OnAndOnPlusLogo height={logoH} />
            {model.photoUrl ? (
              <Image source={{ uri: model.photoUrl }} style={[styles.photo, { width: PHOTO_W * s, height: PHOTO_H * s }]} />
            ) : (
              <View style={[styles.photo, { width: PHOTO_W * s, height: PHOTO_H * s }]}>
                <Text style={[styles.photoInitial, { fontSize: Math.round(22 * s) }]}>{initial}</Text>
              </View>
            )}
          </View>
          <View style={[styles.who, { marginTop: Math.round(10 * s), gap: Math.round(8 * s) }]}>
            <Text style={[styles.name, { fontSize: Math.round(22 * s) }]}>{model.name}</Text>
            <Text style={[styles.bar, { fontSize: Math.round(16 * s) }]}>|</Text>
            <Text style={[styles.title, { fontSize: Math.round(13 * s) }]} numberOfLines={2}>{model.title}</Text>
          </View>
          <Text style={[styles.brand, { fontSize: Math.round(16 * s), marginTop: Math.round(6 * s) }]}>온앤온 +</Text>
          <Text style={[styles.dedicated, { fontSize: Math.round(13 * s) }]} numberOfLines={2}>{model.dedicatedCenter}</Text>
          <View style={styles.rule} />
          <View style={[styles.grid, stackBack && styles.gridStack]}>
            <View style={styles.col}>
              <Text style={[styles.line, { fontSize: Math.max(9, Math.round(11 * s)) }]} numberOfLines={2}>
                <Text style={styles.key}>M. </Text>{model.phone}
              </Text>
              <Text style={[styles.line, { fontSize: Math.max(9, Math.round(11 * s)) }]} numberOfLines={2}>
                <Text style={styles.key}>A. </Text>{model.address}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={[styles.line, { fontSize: Math.max(9, Math.round(11 * s)) }]} numberOfLines={2}>
                <Text style={styles.key}>E. </Text>{model.email}
              </Text>
              <Text style={[styles.line, { fontSize: Math.max(9, Math.round(11 * s)) }]} numberOfLines={2}>
                <Text style={styles.key}>W. </Text>{model.website}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.sheet}>
        <Text style={styles.sideLabel}>후면 · 지역 QR</Text>
        <View style={[styles.card, { width: frame, height: cardHeight, minHeight: Math.round(BASE_H * s), paddingHorizontal: pad, paddingTop: pad, paddingBottom: Math.round(pad * 0.85) }]}>
          <OnAndOnPlusLogo height={logoH} />
          <View style={[styles.backRow, stackBack && styles.backStack, { marginTop: Math.round(12 * s) }]}>
            <View style={{ flex: 1, paddingRight: stackBack ? 0 : 8 }}>
              <Text style={[styles.slogan, { fontSize: Math.round(16 * s), lineHeight: Math.round(24 * s) }]}>
                지자체 축제와{'\n'}소상공인 상생을 잇는{'\n'}온앤온+
              </Text>
            </View>
            <View style={[styles.qrCol, { width: stackBack ? '100%' : qr + 24, marginTop: stackBack ? 12 : 0 }]}>
              <QRCode value={model.qrUrl} size={qr} />
              <Text style={styles.url} numberOfLines={1}>{model.website}</Text>
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
  const { width } = useWindowDimensions();
  const model = row ? buildCenterCardModel(row, director) : null;
  if (!visible || !row || !model) return null;
  const compact = width < 640;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, compact && styles.overlayCompact]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.panel, compact && styles.panelCompact]}>
          <ModalExitButton onPress={onClose} />
          <ScrollView contentContainerStyle={{ padding: compact ? 12 : 16, paddingBottom: 24 }}>
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
  overlayCompact: { padding: 8, justifyContent: 'flex-start', paddingTop: 28 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
  panel: {
    maxHeight: '92%',
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
  },
  panelCompact: { maxHeight: '96%', maxWidth: '100%', borderRadius: 14 },
  kicker: { color: '#0F766E', fontSize: 11, fontWeight: '800' },
  panelTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 4, marginBottom: 12 },
  faces: { gap: 12, width: '100%', alignItems: 'stretch' },
  sheet: { gap: 6, width: '100%' },
  sideLabel: { fontSize: 11, fontWeight: '800', color: '#6B7280' },
  card: {
    maxWidth: '100%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  photo: {
    borderRadius: 12,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitial: { fontWeight: '800', color: '#6B7280' },
  who: { flexDirection: 'row', alignItems: 'baseline' },
  name: { fontWeight: '800', color: '#111827' },
  bar: { color: '#D1D5DB', fontWeight: '400' },
  title: { color: '#6B7280', fontWeight: '600', flexShrink: 1 },
  brand: { fontWeight: '800', color: '#111827' },
  dedicated: { marginTop: 4, fontStyle: 'italic', fontWeight: '600', color: '#111827' },
  rule: { height: 1, backgroundColor: '#D1D5DB', marginTop: 10, marginBottom: 8 },
  grid: { flexDirection: 'row', gap: 12 },
  gridStack: { flexDirection: 'column', gap: 6 },
  col: { flex: 1, gap: 4 },
  line: { color: '#111827', lineHeight: 16 },
  key: { fontWeight: '800' },
  backRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  backStack: { flexDirection: 'column', alignItems: 'flex-start' },
  slogan: { fontWeight: '800', color: '#374151' },
  qrCol: { alignItems: 'center' },
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
