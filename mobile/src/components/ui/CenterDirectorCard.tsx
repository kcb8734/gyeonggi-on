import React from 'react';
import { Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { isJongnoCenter, JONGNO_DIRECTOR_PHOTO } from '../../assets/jongnoDirectorPhoto';
import type { CenterDirectorProfile, CenterLocalityRow } from '../../constants/centerDirectors';
import { CARD_COLORS, CARD_MM, CARD_PRINT_CM, buildCenterCardFaceDocument, buildCenterCardModel, type CenterCardModel } from '../../utils/centerCardDocument';
import { shareCenterCardFace } from '../../utils/centerCardShare';
import ModalExitButton from './ModalExitButton';
import OnAndOnPlusLogo from './OnAndOnPlusLogo';
import CenterCardHtmlFrame from './CenterCardHtmlFrame';

function ContactLine({ label, value, size }: { label: string; value: string; size: number }) {
  return (
    <View style={styles.kv}>
      <Text style={[styles.key, { fontSize: size, lineHeight: size + 1, width: Math.round(size * 1.7) }]}>{label}</Text>
      <Text style={[styles.val, { fontSize: size, lineHeight: size + 1 }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function CenterCardFaces({
  model,
  frontRef,
  backRef,
}: {
  model: CenterCardModel;
  frontRef?: React.Ref<View>;
  backRef?: React.Ref<View>;
}) {
  const { width } = useWindowDimensions();
  const frame = Math.min(420, Math.max(280, width - 32));
  const s = frame / (CARD_MM.width * (96 / 25.4));
  const cardW = frame;
  const cardH = Math.round(cardW * CARD_MM.height / CARD_MM.width);
  const pad = Math.max(22, Math.round(cardW * (CARD_MM.pad / CARD_MM.width)));
  const logoH = Math.max(16, Math.round(cardH * 0.123));
  const photoW = Math.round(cardW * (CARD_MM.photoW / CARD_MM.width));
  const photoH = Math.round(cardH * (CARD_MM.photoH / CARD_MM.height));
  const qr = Math.round(cardH * 0.46);
  const mm = (value: number) => Math.round(cardW * (value / CARD_MM.width));
  const type = Math.max(10, Math.round(12 * Math.min(1, s * 1.15)));
  const initial = model.name.slice(0, 1);
  const sizeLabel = `9.2cm × 5.2cm`;
  if (Platform.OS === 'web') {
    return (
      <View style={styles.faces}>
        <View style={styles.sheet}>
          <Text style={styles.sideLabel}>전면 · 9.2cm × 5.2cm</Text>
          <CenterCardHtmlFrame html={buildCenterCardFaceDocument(model, 'front')} width={cardW} height={cardH} />
        </View>
        <View style={styles.sheet}>
          <Text style={styles.sideLabel}>후면 · {sizeLabel}</Text>
          <CenterCardHtmlFrame html={buildCenterCardFaceDocument(model, 'back')} width={cardW} height={cardH} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.faces}>
      <View style={styles.sheet}>
        <Text style={styles.sideLabel}>전면 · 9.2cm × 5.2cm</Text>
        <View
          ref={frontRef}
          collapsable={false}
          style={[styles.card, { width: cardW, height: cardH, padding: pad, justifyContent: 'flex-start' }]}
        >
          <View style={styles.topRow}>
            <View style={styles.copyCol}>
              <OnAndOnPlusLogo height={logoH} />
              <View style={[styles.who, { marginTop: Math.round(cardH * 0.1) }]}>
                <Text style={[styles.name, { fontSize: Math.round(cardH * 0.088), lineHeight: Math.round(cardH * 0.088) }]}>{model.name}</Text>
                <Text style={[styles.bar, { fontSize: Math.round(cardH * 0.078) }]}>|</Text>
                <Text style={[styles.title, { fontSize: Math.round(cardH * 0.066), color: CARD_COLORS.title }]} numberOfLines={1}>{model.title}</Text>
              </View>
              <View style={[styles.brandBlock, { marginTop: mm(CARD_MM.nameToBrand) }]}>
                <Text style={[styles.brand, { fontSize: Math.round(cardH * 0.078), color: CARD_COLORS.brand, lineHeight: Math.round(cardH * 0.078) }]}>온앤온+</Text>
                <Text style={[styles.dedicated, { fontSize: Math.round(cardH * 0.068), color: CARD_COLORS.brand, lineHeight: Math.round(cardH * 0.068), marginTop: mm(CARD_MM.brandLineGap) }]} numberOfLines={1}>{model.dedicatedCenter}</Text>
              </View>
            </View>
            {isJongnoCenter(model) ? (
              <Image source={JONGNO_DIRECTOR_PHOTO} style={[styles.photo, { width: photoW, height: photoH }]} />
            ) : model.photoUrl ? (
              <Image source={{ uri: model.photoUrl }} style={[styles.photo, { width: photoW, height: photoH }]} />
            ) : (
              <View style={[styles.photo, { width: photoW, height: photoH }]}>
                <Text style={[styles.photoInitial, { fontSize: Math.round(photoW * 0.28) }]}>{initial}</Text>
              </View>
            )}
          </View>
          <View style={[styles.rule, { marginTop: mm(CARD_MM.brandAboveRule) }]} />
          <View style={[styles.grid, { paddingTop: mm(CARD_MM.contactBelowRule) }]}>
            <View style={styles.contactRow}>
              <View style={styles.col}>
                <ContactLine label="M." value={model.phone} size={type} />
              </View>
              <View style={styles.col}>
                <ContactLine label="E." value={model.email} size={type} />
              </View>
            </View>
            <ContactLine label="A." value={model.address} size={type} />
          </View>
        </View>
      </View>
      <View style={styles.sheet}>
        <Text style={styles.sideLabel}>후면 · {sizeLabel}</Text>
        <View
          ref={backRef}
          collapsable={false}
          style={[styles.card, { width: cardW, height: cardH, padding: pad }]}
        >
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
  const [busy, setBusy] = React.useState<'front' | 'back' | null>(null);
  const frontRef = React.useRef<View>(null);
  const backRef = React.useRef<View>(null);
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
            <CenterCardFaces model={model} frontRef={frontRef} backRef={backRef} />
            <View style={styles.downloadRow}>
              <TouchableOpacity
                style={styles.download}
                disabled={Boolean(busy)}
                onPress={async () => {
                  setBusy('front');
                  try {
                    const ok = await shareCenterCardFace(model, 'front', frontRef);
                    if (!ok) Alert.alert('저장 실패', '명함 전면 이미지를 만들지 못했습니다.');
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                <Text style={styles.downloadText}>{busy === 'front' ? '전면 저장 중...' : `전면 JPEG 다운로드 · ${CARD_PRINT_CM.width}cm × ${CARD_PRINT_CM.height}cm`}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.download}
                disabled={Boolean(busy)}
                onPress={async () => {
                  setBusy('back');
                  try {
                    const ok = await shareCenterCardFace(model, 'back', backRef);
                    if (!ok) Alert.alert('저장 실패', '명함 후면 이미지를 만들지 못했습니다.');
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                <Text style={styles.downloadText}>{busy === 'back' ? '후면 저장 중...' : `후면 JPEG 다운로드 · ${CARD_PRINT_CM.width}cm × ${CARD_PRINT_CM.height}cm`}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.downloadHint}>저장 크기 가로 {CARD_PRINT_CM.width}cm × 세로 {CARD_PRINT_CM.height}cm (실물 명함)</Text>
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
    flexDirection: 'column',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  copyCol: { flex: 1, minWidth: 0, paddingRight: 6, justifyContent: 'flex-start' },
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
  title: { color: CARD_COLORS.title, fontWeight: '500', flexShrink: 1 },
  brandBlock: { marginTop: 0, paddingTop: 0 },
  brand: { fontWeight: '800', color: CARD_COLORS.brand },
  dedicated: { marginTop: 0, fontStyle: 'italic', fontWeight: '700', color: CARD_COLORS.brand },
  rule: { height: 1, backgroundColor: '#D1D5DB', marginTop: 0, marginBottom: 0 },
  grid: { gap: 1, justifyContent: 'flex-start' },
  contactRow: { flexDirection: 'row', gap: 8 },
  col: { flex: 1, gap: 0 },
  kv: { flexDirection: 'row', alignItems: 'flex-start' },
  key: { fontWeight: '800', color: '#111827' },
  val: { flex: 1, color: '#111827', fontWeight: '600' },
  backRow: { flex: 1, flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  slogan: { fontWeight: '800', color: '#374151' },
  qrCol: { alignItems: 'center' },
  url: { marginTop: 6, fontSize: 10, color: '#111827', textAlign: 'center' },
  downloadRow: { marginTop: 14, gap: 8 },
  download: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  downloadText: { color: '#fff', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  downloadHint: { marginTop: 8, fontSize: 11, fontWeight: '700', color: '#6B7280', textAlign: 'center' },
});
