import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function CircleChevron({
  mark,
  onPress,
}: {
  mark: '<' | '>';
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.btn}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="나가기"
    >
      <Text style={styles.chevron}>{mark}</Text>
    </TouchableOpacity>
  );
}

/** 모달 우상단 원형 나가기. `<` / `>` 둘 다 닫기. */
export default function ModalExitButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <CircleChevron mark="<" onPress={onPress} />
      <CircleChevron mark=">" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
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
