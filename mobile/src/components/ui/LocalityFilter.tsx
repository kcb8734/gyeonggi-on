import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import IsolatedImeField from './IsolatedImeField';
import { getLocalities, type Locality, type MetroRegion } from '../../constants/regions';

const ALL = '전체';

interface Props {
  metro: MetroRegion;
  value: string | null;
  onChange: (localityId: string | null) => void;
}

export default function LocalityFilter({ metro, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = React.useRef('');
  const items = useMemo(() => {
    const all = getLocalities(metro.id);
    const q = query.trim();
    if (!q) return all;
    return all.filter((item) => item.label.includes(q) || item.nameTokens.some((token) => token.includes(q)));
  }, [metro.id, query]);
  const selected = getLocalities(metro.id).find((item) => item.id === value) ?? null;

  const pick = (next: Locality | null) => {
    onChange(next?.id ?? null);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{metro.label} 세부 지역</Text>
          <Text style={styles.value}>{selected ? selected.label : `${ALL} · ${metro.covers}`}</Text>
        </View>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>{metro.label} 시·군·구</Text>
            <Text style={styles.sheetLead}>{metro.covers} · 가나다순으로 찾고 고를 수 있습니다</Text>
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <IsolatedImeField
                valueRef={searchRef}
                placeholder="시·군·구 검색 (가나다순)"
                onLiveChange={setQuery}
              />
            </View>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={[styles.item, !selected && styles.itemOn]} onPress={() => pick(null)}>
                <Text style={[styles.itemText, !selected && styles.itemTextOn]}>{ALL}</Text>
              </TouchableOpacity>
              {items.map((item) => {
                const on = selected?.id === item.id;
                return (
                  <TouchableOpacity key={item.id} style={[styles.item, on && styles.itemOn]} onPress={() => pick(item)}>
                    <Text style={[styles.itemText, on && styles.itemTextOn]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginTop: 8 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  kicker: { fontSize: 11, fontWeight: '800', color: '#6B7280' },
  value: { fontSize: 14, fontWeight: '800', color: '#111827', marginTop: 2 },
  chevron: { fontSize: 16, color: '#6B7280', marginLeft: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '72%',
    paddingTop: 16,
    paddingBottom: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', paddingHorizontal: 16 },
  sheetLead: { fontSize: 12, color: '#6B7280', paddingHorizontal: 16, marginTop: 4, marginBottom: 10 },
  list: { paddingHorizontal: 12 },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  itemOn: { backgroundColor: '#111827' },
  itemText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  itemTextOn: { color: '#fff' },
});
