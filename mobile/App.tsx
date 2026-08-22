import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { ensureKoreanWebFont } from './src/utils/koreanFont';

ensureKoreanWebFont();

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
  TourDetail: { contentId: string; contentTypeId?: string };
  MerchantSettlement: undefined;
  Support: { topic?: 'notice' | 'help' };
  FeedUpload: undefined;
  FeedView: { postId: string };
  Login: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 16 }}>{emoji}</Text>
      <Text style={{ fontSize: 10, fontWeight: '800', color: focused ? '#111827' : '#9CA3AF' }}>{label}</Text>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#111827',
        tabBarShowLabel: false,
        tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 8 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'on&on',
          headerTitle: () => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#111827', letterSpacing: 0.3 }}>on&on</Text>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#6B7280' }}>온앤온</Text>
            </View>
          ),
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="홈" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Nearby"
        options={{ title: '내주변', tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" label="내주변" focused={focused} /> }}
      >
        {({ route }) => (
          <FestivalMerchantMapScreen festivalId={route.params?.festivalId} userId={DEV_USER_ID} />
        )}
      </Tab.Screen>
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: '달력', tabBarIcon: ({ focused }) => <TabIcon emoji="📅" label="달력" focused={focused} /> }} />
      <Tab.Screen name="Coupons" component={CouponsScreen} options={{ title: '쿠폰함', tabBarIcon: ({ focused }) => <TabIcon emoji="🎟️" label="쿠폰" focused={focused} /> }} />
      <Tab.Screen name="My" component={MyScreen} options={{ title: '마이', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="마이" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={styles.webPage}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppShell>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="PromotionRegister" options={{ title: '자율 할인 등록' }}>
              {() => <PromotionRegisterScreen merchantId={DEV_MERCHANT_ID} />}
            </Stack.Screen>
            <Stack.Screen name="TourDetail" options={{ title: '행사 상세' }}>
              {({ route }) => (
                <FestivalDetailScreen
                  contentId={route.params.contentId}
                  contentTypeId={route.params.contentTypeId}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="MerchantSettlement" options={{ title: '정산 현황' }} component={MerchantSettlementScreen} />
            <Stack.Screen name="Support" options={({ route }) => ({ title: route.params?.topic === 'help' ? '고객센터' : '공지사항' })}>
              {({ route }) => <SupportScreen topic={route.params?.topic} />}
            </Stack.Screen>
            <Stack.Screen name="FeedUpload" component={FeedUploadScreen} options={{ title: '피드 올리기' }} />
            <Stack.Screen name="FeedView" options={{ title: '피드 보기', headerTransparent: true, headerTintColor: '#fff' }}>
              {({ route }) => <FeedViewScreen postId={route.params.postId} />}
            </Stack.Screen>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />
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
});
