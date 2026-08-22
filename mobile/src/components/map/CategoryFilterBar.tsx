import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export default function CategoryFilterBar({ categories, selected, onSelect }: Props) {
  if (categories.length <= 1) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {categories.map((item) => {
          const active = item === selected;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(item)}
            >
              <Text style={[styles.text, active && styles.textActive]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, marginTop: 8 },
  row: { gap: 6, paddingRight: 12 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  text: { fontSize: 12, fontWeight: '600', color: '#374151' },
  textActive: { color: '#fff' },
});
