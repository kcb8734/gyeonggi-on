import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function MapLegend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendRow}>
        <View style={[styles.dot, { backgroundColor: '#E0392A' }]} />
        <Text style={styles.legendText}>축제</Text>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.dot, { backgroundColor: '#16A34A' }]} />
        <Text style={styles.legendText}>제휴업소</Text>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
        <Text style={styles.legendText}>맛집</Text>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.dot, { backgroundColor: '#7C3AED' }]} />
        <Text style={styles.legendText}>관광지</Text>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.dot, { backgroundColor: '#2563EB' }]} />
        <Text style={styles.legendText}>문화</Text>
      </View>
    </View>
  );
}

export function MapErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>{message}</Text>
      <TouchableOpacity onPress={onRetry}>
        <Text style={styles.retry}>다시 시도</Text>
      </TouchableOpacity>
    </View>
  );
}

export function MapLoadingOverlay({ visible, label }: { visible: boolean; label: string }) {
  if (!visible) return null;
  return (
    <View style={styles.loading} pointerEvents="none">
      <ActivityIndicator color="#2D6CDF" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function RecenterButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.fabText}>내 위치</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  legend: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  banner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  bannerText: { flex: 1, color: '#991B1B', fontSize: 13, fontWeight: '600' },
  retry: { color: '#2D6CDF', fontWeight: '700', fontSize: 13 },
  loading: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadingText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  fab: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  fabText: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
});
