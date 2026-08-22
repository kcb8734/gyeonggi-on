import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PromotionRegisterScreen from './src/screens/PromotionRegisterScreen';
import FestivalMerchantMapScreen from './src/screens/FestivalMerchantMapScreen';

// backend/seed.sql 과 동일한 개발용 고정 UUID
const DEV_MERCHANT_ID = '22222222-2222-4222-8222-222222222222';
const DEV_USER_ID = '11111111-1111-4111-8111-111111111111';

export type RootStackParamList = {
  PromotionRegister: undefined;
  FestivalMap: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="FestivalMap">
          <Stack.Screen
            name="FestivalMap"
            options={{ title: '축제 & 제휴업소 지도', headerShadowVisible: false }}
          >
            {() => <FestivalMerchantMapScreen userId={DEV_USER_ID} />}
          </Stack.Screen>
          <Stack.Screen
            name="PromotionRegister"
            options={{ title: '자율 할인 등록' }}
          >
            {() => <PromotionRegisterScreen merchantId={DEV_MERCHANT_ID} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
