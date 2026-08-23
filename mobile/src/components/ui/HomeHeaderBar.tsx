import React, { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import { REGION_PRESETS } from '../../constants/regionTour';
import { useAppState } from '../../stores/appStore';
import { useAuthUser } from '../../stores/authStore';
import { useSelectedRegionPreset, setRegion } from '../../stores/regionStore';
import ModalExitButton from './ModalExitButton';

const LOGO = require('../../../assets/onandon-logo.png');

function ProfileGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.2" r="3.2" fill="#fff" />
      <Path d="M5.6 18.8c.7-3.2 3.2-4.9 6.4-4.9s5.7 1.7 6.4 4.9" fill="#fff" />
    </Svg>
  );
}

export default function HomeHeaderBar() {
  const navigation = useNavigation<any>();
  const user = useAuthUser();
  const { points } = useAppState();
  const region = useSelectedRegionPreset();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="on&on" />
        <TouchableOpacity style={styles.regionBtn} onPress={() => setOpen(true)} activeOpacity={0.85}>
          <Text style={styles.regionText} numberOfLines={1}>{region.label}</Text>
          <Text style={styles.caret}>▾</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.side}
        onPress={() => navigation.navigate('My')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="마이페이지로 이동"
      >
        <View style={styles.shortcut}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <ProfileGlyph />
            </View>
          )}
          <Text style={styles.pts} numberOfLines={1}>
            {user ? `${points.toLocaleString('ko-KR')} P` : '로그인 필요'}
          </Text>
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ModalExitButton onPress={() => setOpen(false)} />
            <Text style={styles.sheetTitle}>권역 선택</Text>
            <Text style={styles.sheetLead}>선택하면 홈·내주변·달력·쿠폰함이 해당 권역으로 바뀝니다.</Text>
            <ScrollView>
              {REGION_PRESETS.map((item) => {
                const active = item.id === region.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.option, active && styles.optionOn]}
                    onPress={() => {
                      setRegion({ code: item.code, name: item.name, id: item.id, label: item.label });
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionTitle, active && styles.optionTitleOn]}>{item.label}</Text>
                    <Text style={styles.optionMeta}>{item.name} · {item.officialMatching ? '지자체 매칭' : '소상공인 자율 할인'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    minHeight: 44,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  logo: { width: 86, height: 32 },
  regionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 110,
  },
  regionText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  caret: { color: '#FDE68A', fontWeight: '900', marginLeft: 4 },
  side: {
    minWidth: 96,
    maxWidth: 120,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 8,
    maxWidth: 112,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#111827' },
  pts: { fontSize: 10, fontWeight: '800', color: '#111827', flexShrink: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingTop: 44,
    maxHeight: '78%' as unknown as number,
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  sheetLead: { fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 10, fontWeight: '600' },
  option: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  optionOn: { borderColor: '#111827', backgroundColor: '#ECFDF5' },
  optionTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  optionTitleOn: { color: '#065F46' },
  optionMeta: { fontSize: 12, color: '#6B7280', marginTop: 3, fontWeight: '600' },
});
