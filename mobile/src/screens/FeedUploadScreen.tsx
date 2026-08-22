import React, { createElement, useRef, useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { addFeedPost } from '../stores/feedStore';
import { getAuthUser } from '../stores/authStore';
import { pickFromCamera, pickFromGallery } from '../utils/pickImage';
import { KOREAN_FONT_FAMILY } from '../utils/koreanFont';

const PRESETS = [
  'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=600&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
  'https://images.unsplash.com/photo-1515165562839-978bbcf01262?w=600&q=80',
];

export default function FeedUploadScreen() {
  const navigation = useNavigation<any>();
  const captionRef = useRef('');
  const festivalRef = useRef('');
  const [imageUrl, setImageUrl] = useState(PRESETS[0]);

  const submit = () => {
    const caption = captionRef.current.trim();
    if (!caption) {
      Alert.alert('알림', '한 줄 소개를 입력해주세요.');
      return;
    }
    addFeedPost({
      caption,
      festival: festivalRef.current.trim() || undefined,
      imageUrl,
      author: getAuthUser()?.nickname,
    });
    Alert.alert('업로드 완료', '홈 피드에 바로 올라갔습니다.');
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
      <Text style={styles.title}>축제 피드 올리기</Text>
      <Text style={styles.lead}>현장에서 찍은 순간을 틱톡형 카드로 공유하세요.</Text>
      <Image source={{ uri: imageUrl }} style={styles.preview} />
      <View style={styles.pickRow}>
        <TouchableOpacity style={styles.pickBtn} onPress={async () => {
          const uri = await pickFromCamera();
          if (uri) setImageUrl(uri);
        }}>
          <Text style={styles.pickText}>사진 촬영</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickBtn} onPress={async () => {
          const uri = await pickFromGallery();
          if (uri) setImageUrl(uri);
        }}>
          <Text style={styles.pickText}>갤러리에서 선택</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.label}>썸네일 선택</Text>
      <View style={styles.presets}>
        {PRESETS.map((url) => (
          <TouchableOpacity key={url} onPress={() => setImageUrl(url)}>
            <Image source={{ uri: url }} style={[styles.preset, imageUrl === url && styles.presetOn]} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>한 줄 소개</Text>
      {hangulField(captionRef, '예: 화성행궁 야경 실화냐', true)}
      <Text style={styles.label}>축제 이름 (선택)</Text>
      {hangulField(festivalRef, '예: 수원 국가유산야행')}
      <TouchableOpacity style={styles.submit} onPress={submit}>
        <Text style={styles.submitText}>피드에 올리기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function hangulField(ref: React.MutableRefObject<string>, placeholder: string, multiline = false) {
  if (Platform.OS === 'web') {
    return createElement(multiline ? 'textarea' : 'input', {
      type: multiline ? undefined : 'text',
      lang: 'ko',
      defaultValue: '',
      placeholder,
      rows: multiline ? 4 : undefined,
      autoComplete: 'off',
      autoCorrect: 'off',
      spellCheck: false,
      onInput: (event: { currentTarget: { value: string } }) => {
        ref.current = event.currentTarget.value;
      },
      style: {
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#fff',
        borderRadius: 8,
        border: '1px solid #DDD',
        padding: 12,
        minHeight: multiline ? 96 : undefined,
        fontSize: 16,
        fontFamily: KOREAN_FONT_FAMILY,
        outline: 'none',
        resize: multiline ? 'vertical' : 'none',
      },
    });
  }

  return (
    <TextInput
      defaultValue=""
      placeholder={placeholder}
      multiline={multiline}
      onChangeText={(value) => {
        ref.current = value;
      }}
      style={[styles.nativeInput, multiline && styles.nativeMultiline]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F8FA' },
  title: { fontSize: 22, fontWeight: '800' },
  lead: { fontSize: 13, color: '#6B7280', marginTop: 6, marginBottom: 14 },
  preview: { width: '100%', height: 220, borderRadius: 16, backgroundColor: '#E5E7EB' },
  label: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  pickRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pickBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  presets: { flexDirection: 'row', gap: 8 },
  preset: { width: 64, height: 64, borderRadius: 10 },
  presetOn: { borderWidth: 3, borderColor: '#111827' },
  submit: { backgroundColor: '#111827', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  submitText: { color: '#fff', fontWeight: '800' },
  nativeInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 12,
    fontSize: 16,
    fontFamily: KOREAN_FONT_FAMILY,
    color: '#111827',
  },
  nativeMultiline: { minHeight: 96, textAlignVertical: 'top' },
});
