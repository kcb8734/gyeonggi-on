import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { FestivalPin } from '../../types/map';

interface Props {
  festivals: FestivalPin[];
  selectedFestivalId: string | null;
  onSelect: (festivalId: string) => void;
}

export default function FestivalChipBar({ festivals, selectedFestivalId, onSelect }: Props) {
  if (festivals.length === 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {festivals.map((festival) => {
          const selected = festival.id === selectedFestivalId;
          return (
            <TouchableOpacity
              key={festival.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onSelect(festival.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
                {festival.title}
              </Text>
              {festival.location_name ? (
                <Text style={[styles.chipSub, selected && styles.chipSubSelected]} numberOfLines={1}>
                  {festival.location_name}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12 },
  row: { gap: 8, paddingVertical: 4, paddingRight: 12 },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chipSelected: {
    backgroundColor: '#2D6CDF',
    borderColor: '#2D6CDF',
  },
  chipText: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  chipTextSelected: { color: '#fff' },
  chipSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  chipSubSelected: { color: '#E8EEFB' },
});
