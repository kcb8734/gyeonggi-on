import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function ModalExitButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.btn}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="나가기"
    >
      <Text style={styles.chevron}>{'>'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(17,24,39,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: -1,
  },
});
