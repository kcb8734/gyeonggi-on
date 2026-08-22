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
import TourDetailScreen from './src/screens/TourDetailScreen';

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
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 11, fontWeight: '800', color: focused ? '#111827' : '#9CA3AF' }}>{label}</Text>;
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#111827',
        tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 8 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Korea-On', tabBarLabel: '홈', tabBarIcon: ({ focused }) => <TabIcon label="홈" focused={focused} /> }} />
      <Tab.Screen
        name="Nearby"
        options={{ title: '내주변', tabBarLabel: '내주변', tabBarIcon: ({ focused }) => <TabIcon label="지도" focused={focused} /> }}
      >
        {({ route }) => (
          <FestivalMerchantMapScreen festivalId={route.params?.festivalId} userId={DEV_USER_ID} />
        )}
      </Tab.Screen>
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: '달력', tabBarLabel: '달력', tabBarIcon: ({ focused }) => <TabIcon label="일정" focused={focused} /> }} />
      <Tab.Screen name="Coupons" component={CouponsScreen} options={{ title: '쿠폰', tabBarLabel: '쿠폰', tabBarIcon: ({ focused }) => <TabIcon label="쿠폰" focused={focused} /> }} />
      <Tab.Screen name="My" component={MyScreen} options={{ title: '마이', tabBarLabel: '마이', tabBarIcon: ({ focused }) => <TabIcon label="마이" focused={focused} /> }} />
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
            <Stack.Screen name="TourDetail" options={{ title: '상세 보기' }}>
              {({ route }) => (
                <TourDetailScreen
                  contentId={route.params.contentId}
                  contentTypeId={route.params.contentTypeId}
                />
              )}
            </Stack.Screen>
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
