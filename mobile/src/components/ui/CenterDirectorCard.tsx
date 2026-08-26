import React from 'react';
import { Image, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CenterDirectorProfile, CenterLocalityRow } from '../../constants/centerDirectors';
import ModalExitButton from './ModalExitButton';

export default function CenterDirectorCard({
  visible,
  row,
  onClose,
}: {
  visible: boolean;
  row: CenterLocalityRow | null;
  onClose: () => void;
}) {
  const director: CenterDirectorProfile | undefined = row?.director;
  if (!visible || !row || !director) return null;
  const initial = director.name.slice(0, 1);
  const tel = `tel:${director.phone.replace(/[^0-9]/g, '')}`;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          <ModalExitButton onPress={onClose} />
          <Text style={styles.kicker}>온앤온+ 공식 디지털 명함</Text>
          <Text style={styles.region}>{row.regionLabel} · {row.label}</Text>
          {director.photoUrl ? (
            <Image source={{ uri: director.photoUrl }} style={styles.photo} />
          ) : (
            <View style={styles.photo}><Text style={styles.initial}>{initial}</Text></View>
          )}
          <Text style={styles.name}>{director.name}</Text>
          <Text style={styles.title}>{director.title}</Text>
          <Text style={styles.intro}>{director.intro}</Text>
          <TouchableOpacity onPress={() => Linking.openURL(tel)}>
            <Text style={styles.meta}>전화 {director.phone}</Text>
          </TouchableOpacity>
          <Text style={styles.meta}>메일 {director.email}</Text>
          <View style={styles.stamp}>
            <Text style={styles.stampText}>SELECTED · on&on+</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 20 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
  card: {
    backgroundColor: '#0F766E',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  kicker: { color: '#99F6E4', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  region: { color: '#CCFBF1', fontSize: 12, fontWeight: '700', marginTop: 4 },
  photo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#115E59',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderWidth: 3,
    borderColor: '#5EEAD4',
  },
  initial: { color: '#fff', fontSize: 32, fontWeight: '800' },
  name: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 12 },
  title: { color: '#FDE68A', fontSize: 14, fontWeight: '800', marginTop: 4 },
  intro: { color: '#ECFDF5', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 12 },
  meta: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 8 },
  stamp: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#5EEAD4',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stampText: { color: '#99F6E4', fontSize: 10, fontWeight: '800' },
});
