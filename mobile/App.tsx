import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import HomeScreen from './src/screens/HomeScreen';
import FestivalMerchantMapScreen from './src/screens/FestivalMerchantMapScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import CouponsScreen from './src/screens/CouponsScreen';
import MyScreen from './src/screens/MyScreen';
import PromotionRegisterScreen from './src/screens/PromotionRegisterScreen';
import FestivalDetailScreen from './src/screens/FestivalDetailScreen';
import MerchantSettlementScreen from './src/screens/MerchantSettlementScreen';
import SupportScreen from './src/screens/SupportScreen';
import FeedUploadScreen from './src/screens/FeedUploadScreen';
import FeedViewScreen from './src/screens/FeedViewScreen';
import LoginScreen from './src/screens/LoginScreen';
import AdminScreen from './src/screens/AdminScreen';
import { ensureKoreanWebFont } from './src/utils/koreanFont';
import { installImeGuard } from './src/utils/imeGuard';
import TabGlyph from './src/components/ui/TabGlyph';
import HomeHeaderBar from './src/components/ui/HomeHeaderBar';

ensureKoreanWebFont();
installImeGuard();

const DEV_MERCHANT_ID = '22222222-2222-4222-8222-222222222222';
const DEV_USER_ID = '11111111-1111-4111-8111-111111111111';

export type RootTabParamList = {
  Home: undefined;
  Nearby: { festivalId?: string } | undefined;
  Calendar: undefined;
  Coupons: undefined;
  My: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  PromotionRegister: undefined;
  TourDetail: {
    contentId: string;
    contentTypeId?: string;
    kind?: string;
    tel?: string;
    title?: string;
    city?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    metro?: string;
    imageUrl?: string;
  };
  MerchantSettlement: undefined;
  Support: { topic?: 'notice' | 'help' | 'privacy' };
  FeedUpload: undefined;
  FeedView: { postId: string };
  Login: undefined;
  Admin: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function StackBack() {
  const navigation = useNavigation();
  return (
    <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ paddingHorizontal: 4, paddingVertical: 6 }}>
      <Text style={{ color: '#111827', fontWeight: '800', fontSize: 15 }}>‹ 나가기</Text>
    </Pressable>
  );
}

function HomeNavHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
      <HomeHeaderBar />
    </View>
  );
}

const homeHeaderOptions = {
  header: () => <HomeNavHeader />,
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#E0392A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: false,
        tabBarStyle: { height: 74, paddingBottom: 10, paddingTop: 8 },
        tabBarItemStyle: { flex: 1 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'on&on+',
          ...homeHeaderOptions,
          tabBarIcon: ({ focused }) => <TabGlyph name="home" label="홈" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Nearby"
        options={{
          title: '내주변',
          ...homeHeaderOptions,
          tabBarIcon: ({ focused }) => <TabGlyph name="nearby" label="내주변" focused={focused} />,
        }}
      >
        {({ route }) => (
          <FestivalMerchantMapScreen festivalId={route.params?.festivalId} userId={DEV_USER_ID} />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: '달력',
          ...homeHeaderOptions,
          tabBarIcon: ({ focused }) => <TabGlyph name="calendar" label="달력" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Coupons"
        component={CouponsScreen}
        options={{
          title: '쿠폰함',
          ...homeHeaderOptions,
          tabBarIcon: ({ focused }) => <TabGlyph name="coupons" label="쿠폰" focused={focused} />,
        }}
      />
      <Tab.Screen name="My" component={MyScreen} options={{ title: '마이', tabBarIcon: ({ focused }) => <TabGlyph name="my" label="마이" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function isDeployedWeb() {
  if (typeof window === 'undefined') return !__DEV__;
  const host = window.location.hostname;
  return host === 'kdanji.com' || host === 'www.kdanji.com' || host.endsWith('.vercel.app') || !__DEV__;
}

function AppShell({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  const framed = !isDeployedWeb();
  return (
    <View style={framed ? styles.webPage : styles.webPageLive}>
      {framed ? <Text style={styles.liveBanner}>미리보기 · 나가기 버튼 · 한글 IME 가드</Text> : null}
      <View nativeID="onandon-phone" style={framed ? styles.phone : styles.appContainer} {...(!framed ? { className: 'app-container' } : null)}>{children}</View>
    </View>
  );
}

function startsOnAdmin() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return window.location.pathname.replace(/\/+$/, '') === '/admin';
}

function startsOnSettlement() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return window.location.pathname.replace(/\/+$/, '') === '/merchant/settlement';
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppShell>
        <NavigationContainer>
          <Stack.Navigator initialRouteName={startsOnSettlement() ? 'MerchantSettlement' : startsOnAdmin() ? 'Admin' : 'Tabs'}>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="PromotionRegister"
              options={{ title: '할인 쿠폰 등록', headerBackVisible: false, headerLeft: () => <StackBack /> }}
            >
              {() => <PromotionRegisterScreen merchantId={DEV_MERCHANT_ID} />}
            </Stack.Screen>
            <Stack.Screen
              name="TourDetail"
              options={({ route }) => ({
                title: route.params?.contentTypeId === '39' || route.params?.kind === 'food'
                  ? '맛집 상세'
                  : route.params?.contentTypeId === '12' || route.params?.kind === 'attraction'
                    ? '관광지 상세'
                    : route.params?.contentTypeId === '14' || route.params?.kind === 'culture'
                      ? '문화시설 상세'
                      : '행사 상세',
              })}
            >
              {({ route }) => (
                <FestivalDetailScreen
                  contentId={route.params.contentId}
                  contentTypeId={route.params.contentTypeId}
                  fallbackKind={route.params.kind}
                  fallbackTel={route.params.tel}
                  fallbackTitle={route.params.title}
                  fallbackCity={route.params.city}
                  fallbackAddress={route.params.address}
                  fallbackLatitude={route.params.latitude}
                  fallbackLongitude={route.params.longitude}
                  fallbackMetro={route.params.metro}
                  fallbackImageUrl={route.params.imageUrl}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="MerchantSettlement" options={{ title: '정산 현황' }} component={MerchantSettlementScreen} />
            <Stack.Screen options={({ route }) => ({
              title: route.params?.topic === 'help'
                ? '고객센터'
                : route.params?.topic === 'privacy'
                  ? '개인정보처리방침'
                  : '공지사항',
            })} name="Support">
              {({ route }) => <SupportScreen topic={route.params?.topic} />}
            </Stack.Screen>
            <Stack.Screen
              name="FeedUpload"
              component={FeedUploadScreen}
              options={{ title: '피드 올리기', headerBackVisible: false, headerLeft: () => <StackBack /> }}
            />
            <Stack.Screen name="FeedView" options={{ headerShown: false }}>
              {({ route }) => <FeedViewScreen postId={route.params.postId} />}
            </Stack.Screen>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: '로그인', headerBackVisible: false, headerLeft: () => <StackBack /> }} />
            <Stack.Screen name="Admin" component={AdminScreen} options={{ title: '관리자', headerBackVisible: false, headerLeft: () => <StackBack /> }} />
          </Stack.Navigator>
        </NavigationContainer>
      </AppShell>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webPage: {
    flex: 1,
    minHeight: '100%' as unknown as number,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  liveBanner: {
    backgroundColor: '#B91C1C',
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  phone: {
    width: 390,
    height: 844,
    maxHeight: '100%' as unknown as number,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 10,
    borderColor: '#111827',
  },
  webPageLive: {
    flex: 1,
    width: '100%',
    minHeight: '100%' as unknown as number,
    backgroundColor: '#fff',
  },
  appContainer: {
    width: '100%',
    maxWidth: '100%' as unknown as number,
    minHeight: '100%' as unknown as number,
    flex: 1,
    margin: 0,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 0,
    borderRadius: 0,
  },
});
