import React from 'react';
import RNMapView, {
  Marker as RNMarker,
  Polyline as RNPolyline,
  PROVIDER_GOOGLE,
  type MapMarkerProps,
} from 'react-native-maps';
import type { MapRegion } from '../../types/map';

export { PROVIDER_GOOGLE };
export const MapView = RNMapView;
export type { Region } from 'react-native-maps';

export type MapViewHandle = {
  animateToRegion: (region: MapRegion) => void;
  fitToCoordinates: (
    coordinates: { latitude: number; longitude: number }[],
    options?: object,
  ) => void;
};

type MarkerProps = Omit<MapMarkerProps, 'pinColor'> & {
  badgeLabel?: string;
  emphasized?: boolean;
  pinColor?: string;
};

export function Marker({ badgeLabel: _badgeLabel, emphasized: _emphasized, pinColor, ...props }: MarkerProps) {
  return <RNMarker {...props} pinColor={pinColor} />;
}

type PolylineProps = React.ComponentProps<typeof RNPolyline>;

export function Polyline(props: PolylineProps) {
  return <RNPolyline {...props} />;
}
