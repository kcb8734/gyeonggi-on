import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { CenterDirectorProfile, CenterLocalityRow } from '../../constants/centerDirectors';
import { CARD_MM, buildCenterCardModel, downloadCenterCard, type CenterCardModel } from '../../utils/centerCardDocument';
import ModalExitButton from './ModalExitButton';
import OnAndOnPlusLogo from './OnAndOnPlusLogo';

function ContactLine({ label, value, size }: { label: string; value: string; size: number }) {
  return (
    <View style={styles.kv}>
      <Text style={[styles.key, { fontSize: size, lineHeight: size + 4, width: Math.round(size * 1.7) }]}>{label}</Text>
      <Text style={[styles.val, { fontSize: size, lineHeight: size + 4 }]}>{value}</Text>
    </View>
  );
}

export function CenterCardFaces({ model }: { model: CenterCardModel }) {
  const { width } = useWindowDimensions();
  const frame = Math.min(420, Math.max(280, width - 32));
  const s = frame / (CARD_MM.width * (96 / 25.4));
  const cardW = frame;
  const cardH = Math.round(cardW * CARD_MM.height / CARD_MM.width);
  const pad = Math.max(18, Math.round(cardW * (CARD_MM.pad / CARD_MM.width)));
  const logoH = Math.max(16, Math.round(cardH * 0.123));
  const photoW = Math.round(cardW * (CARD_MM.photoW / CARD_MM.width));
  const photoH = Math.round(cardH * (CARD_MM.photoH / CARD_MM.height));
  const qr = Math.round(cardH * 0.46);
  const type = Math.max(9, Math.round(11 * Math.min(1, s * 1.15)));
  const initial = model.name.slice(0, 1);
  return (
    <View style={styles.faces}>
      <View style={styles.sheet}>
        <Text style={styles.sideLabel}>전면 · 9.2cm × 5.2cm</Text>
        <View style={[styles.card, { width: cardW, height: cardH, padding: pad }]}>
          <View style={styles.topRow}>
            <OnAndOnPlusLogo height={logoH} />
            {model.photoUrl ? (
              <Image source={{ uri: model.photoUrl }} style={[styles.photo, { width: photoW, height: photoH }]} />
            ) : (
              <View style={[styles.photo, { width: photoW, height: photoH }]}>
                <Text style={[styles.photoInitial, { fontSize: Math.round(photoW * 0.28) }]}>{initial}</Text>
              </View>
            )}
          </View>
          <View style={[styles.who, { marginTop: Math.round(cardH * 0.055) }]}>
            <Text style={[styles.name, { fontSize: Math.round(cardH * 0.118) }]}>{model.name}</Text>
            <Text style={[styles.bar, { fontSize: Math.round(cardH * 0.09) }]}>|</Text>
            <Text style={[styles.title, { fontSize: Math.round(cardH * 0.072) }]} numberOfLines={1}>{model.title}</Text>
          </View>
          <Text style={[styles.brand, { fontSize: Math.round(cardH * 0.088), marginTop: 4 }]}>온앤온+</Text>
          <Text style={[styles.dedicated, { fontSize: Math.round(cardH * 0.07) }]} numberOfLines={1}>{model.dedicatedCenter}</Text>
          <View style={styles.rule} />
          <View style={styles.grid}>
            <View style={styles.col}>
              <ContactLine label="M." value={model.phone} size={type} />
              <ContactLine label="A." value={model.address} size={type} />
            </View>
            <View style={styles.col}>
              <ContactLine label="E." value={model.email} size={type} />
              <ContactLine label="W." value={model.website} size={type} />
            </View>
          </View>
        </View>
      </View>
      <View style={styles.sheet}>
        <Text style={styles.sideLabel}>후면 · 지역 QR</Text>
        <View style={[styles.card, { width: cardW, height: cardH, padding: pad }]}>
          <OnAndOnPlusLogo height={logoH} />
          <View style={styles.backRow}>
            <View style={{ flex: 1, paddingRight: 10, justifyContent: 'center' }}>
              <Text style={[styles.slogan, { fontSize: Math.round(cardH * 0.095), lineHeight: Math.round(cardH * 0.14) }]}>
                지자체 축제와{'\n'}소상공인 상생을 잇는{'\n'}온앤온+
              </Text>
            </View>
            <View style={[styles.qrCol, { width: qr + 8 }]}>
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
  const [busy, setBusy] = React.useState(false);
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
            <TouchableOpacity
              style={styles.download}
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await downloadCenterCard(model);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Text style={styles.downloadText}>{busy ? 'JPEG 저장 중...' : '명함 전·후면 JPEG 다운로드 · 인쇄 (9.2×5.2cm, 400dpi)'}</Text>
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
    maxWidth: 460,
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
    borderRadius: 14,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitial: { fontWeight: '800', color: '#6B7280' },
  who: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { fontWeight: '800', color: '#111827' },
  bar: { color: '#D1D5DB', fontWeight: '400' },
  title: { color: '#6B7280', fontWeight: '500', flexShrink: 1 },
  brand: { fontWeight: '800', color: '#111827' },
  dedicated: { marginTop: 3, fontStyle: 'italic', fontWeight: '700', color: '#111827' },
  rule: { height: 1, backgroundColor: '#D1D5DB', marginTop: 10, marginBottom: 8 },
  grid: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 6 },
  kv: { flexDirection: 'row', alignItems: 'flex-start' },
  key: { fontWeight: '800', color: '#111827' },
  val: { flex: 1, color: '#111827', fontWeight: '600' },
  backRow: { flex: 1, flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  slogan: { fontWeight: '800', color: '#374151' },
  qrCol: { alignItems: 'center' },
  url: { marginTop: 6, fontSize: 10, color: '#111827', textAlign: 'center' },
  download: {
    marginTop: 14,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  downloadText: { color: '#fff', fontWeight: '800', fontSize: 13, textAlign: 'center' },
});
