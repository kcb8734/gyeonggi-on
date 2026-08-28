import React from 'react';
import { View } from 'react-native';

export default function CenterCardHtmlFrame({
  width,
  height,
}: {
  html: string;
  width: number;
  height: number;
}) {
  return <View style={{ width, height }} />;
}
