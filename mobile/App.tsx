import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import PromotionRegisterScreen from './src/screens/PromotionRegisterScreen';
import FestivalMerchantMapScreen from './src/screens/FestivalMerchantMapScreen';

// 개발용 임시 ID (실제 앱에서는 로그인 세션에서 주입)
const DEV_MERCHANT_ID = 'dev-merchant-id';
const DEV_FESTIVAL_ID = 'dev-festival-id';
const DEV_USER_ID = 'dev-user-id';

export type RootStackParamList = {
  PromotionRegister: undefined;
  FestivalMap: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="FestivalMap">
          <Stack.Screen
            name="FestivalMap"
            options={{ title: '축제 & 제휴업소 지도' }}
          >
            {() => <FestivalMerchantMapScreen festivalId={DEV_FESTIVAL_ID} userId={DEV_USER_ID} />}
          </Stack.Screen>
          <Stack.Screen
            name="PromotionRegister"
            options={{ title: '자율 할인 등록' }}
          >
            {() => <PromotionRegisterScreen merchantId={DEV_MERCHANT_ID} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
