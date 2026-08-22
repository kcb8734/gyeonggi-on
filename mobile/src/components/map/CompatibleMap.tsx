import React from 'react';
import RNMapView, { Marker as RNMarker, PROVIDER_GOOGLE, type MapMarkerProps } from 'react-native-maps';

export { PROVIDER_GOOGLE };
export const MapView = RNMapView;
export type { Region } from 'react-native-maps';

type MarkerProps = Omit<MapMarkerProps, 'pinColor'> & {
  badgeLabel?: string;
  pinColor?: string;
};

export function Marker({ badgeLabel: _badgeLabel, pinColor, ...props }: MarkerProps) {
  return <RNMarker {...props} pinColor={pinColor} />;
}
