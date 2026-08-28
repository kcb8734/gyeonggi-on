import React, {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import type { MapRegion } from '../../types/map';
import { validLatLng } from '../../utils/mapCamera';
import { OSM_LEAFLET_HTML } from './osmLeafletHtml';

export const PROVIDER_GOOGLE = 'google';
export type Region = MapRegion;

export type MapViewHandle = {
  animateToRegion: (region: MapRegion) => void;
  fitToCoordinates: (
    coordinates: { latitude: number; longitude: number }[],
    options?: { padding?: number | [number, number]; edgePadding?: { top?: number; right?: number; bottom?: number; left?: number } },
  ) => void;
  invalidateSize?: () => void;
};

interface MarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  badgeLabel?: string;
  emphasized?: boolean;
  zIndex?: number;
  onPress?: () => void;
  tracksViewChanges?: boolean;
  interactive?: boolean;
  children?: ReactNode;
}

export function Marker(_props: MarkerProps) {
  return null;
}
(Marker as { isMapMarker?: boolean }).isMapMarker = true;

interface PolylineProps {
  coordinates: { latitude: number; longitude: number }[];
  strokeColor?: string;
  strokeWidth?: number;
  lineDashPattern?: number[];
}

export function Polyline(_props: PolylineProps) {
  return null;
}
(Polyline as { isMapPolyline?: boolean }).isMapPolyline = true;

interface MapViewProps {
  style?: ViewStyle | ViewStyle[];
  initialRegion?: MapRegion;
  region?: MapRegion;
  pointerEvents?: 'auto' | 'none' | 'box-none';
  children?: ReactNode;
  onRegionChangeComplete?: (region: MapRegion) => void;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  provider?: string;
}

function isMarkerChild(child: { type: unknown }) {
  const type = child.type as { isMapMarker?: boolean };
  return type === Marker || Boolean(type?.isMapMarker);
}

function isPolylineChild(child: { type: unknown }) {
  const type = child.type as { isMapPolyline?: boolean };
  return type === Polyline || Boolean(type?.isMapPolyline);
}

function fitPad(options?: {
  padding?: number | [number, number];
  edgePadding?: { top?: number; right?: number; bottom?: number; left?: number };
}) {
  if (options?.edgePadding) return options.edgePadding.top ?? 40;
  if (Array.isArray(options?.padding)) return options.padding[0];
  if (typeof options?.padding === 'number') return options.padding;
  return 40;
}

type Overlay =
  | {
    type: 'marker';
    id: number;
    latitude: number;
    longitude: number;
    pinColor?: string;
    badgeLabel?: string;
    title?: string;
    emphasized?: boolean;
    zIndex?: number;
    interactive?: boolean;
  }
  | {
    type: 'line';
    points: { latitude: number; longitude: number }[];
    color?: string;
    weight?: number;
    dash?: number[];
  };

function collectOverlays(children: ReactNode): { overlays: Overlay[]; presses: Array<(() => void) | undefined> } {
  const overlays: Overlay[] = [];
  const presses: Array<(() => void) | undefined> = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (isPolylineChild(child)) {
      const line = child.props as PolylineProps;
      const points = (line.coordinates ?? []).filter((point) => validLatLng(point.latitude, point.longitude));
      if (points.length < 2) return;
      overlays.push({
        type: 'line',
        points,
        color: line.strokeColor,
        weight: line.strokeWidth,
        dash: line.lineDashPattern,
      });
      return;
    }
    if (!isMarkerChild(child)) return;
    const marker = child.props as MarkerProps;
    if (!validLatLng(marker.coordinate?.latitude, marker.coordinate?.longitude)) return;
    const id = overlays.length;
    presses[id] = marker.onPress;
    overlays.push({
      type: 'marker',
      id,
      latitude: marker.coordinate.latitude,
      longitude: marker.coordinate.longitude,
      pinColor: marker.pinColor,
      badgeLabel: marker.badgeLabel,
      title: marker.title,
      emphasized: marker.emphasized,
      zIndex: marker.zIndex,
      interactive: marker.interactive,
    });
  });
  return { overlays, presses };
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { style, initialRegion, region, children, onRegionChangeComplete, pointerEvents },
  ref,
) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const pending = useRef<string[]>([]);
  const pressesRef = useRef<Array<(() => void) | undefined>>([]);
  const regionCb = useRef(onRegionChangeComplete);
  regionCb.current = onRegionChangeComplete;
  const fallback = initialRegion ?? region ?? {
    latitude: 37.4138,
    longitude: 127.5183,
    latitudeDelta: 1.6,
    longitudeDelta: 1.6,
  };

  const run = (js: string) => {
    if (!readyRef.current) {
      pending.current.push(js);
      return;
    }
    webRef.current?.injectJavaScript(`${js}; true;`);
  };

  const paint = (nextChildren: ReactNode) => {
    const collected = collectOverlays(nextChildren);
    pressesRef.current = collected.presses;
    run(`window.__onandonPaint && window.__onandonPaint(${JSON.stringify(collected.overlays)})`);
  };

  useImperativeHandle(ref, () => ({
    animateToRegion(next) {
      run(`window.__onandonSetView && window.__onandonSetView(${next.latitude},${next.longitude},${next.latitudeDelta || 0.2})`);
    },
    fitToCoordinates(coordinates, options) {
      const valid = coordinates.filter((point) => validLatLng(point.latitude, point.longitude));
      run(`window.__onandonFit && window.__onandonFit(${JSON.stringify(valid)},${fitPad(options)})`);
    },
    invalidateSize() {
      run('window.__onandonInvalidate && window.__onandonInvalidate()');
    },
  }));

  useEffect(() => {
    paint(children);
  }, [children]);

  useEffect(() => {
    const next = region ?? fallback;
    run(`window.__onandonSetView && window.__onandonSetView(${next.latitude},${next.longitude},${next.latitudeDelta || 0.2})`);
  }, [region?.latitude, region?.longitude, region?.latitudeDelta]);

  return (
    <View style={[styles.wrap, style]} pointerEvents={pointerEvents ?? 'auto'}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: OSM_LEAFLET_HTML, baseUrl: 'https://www.kdanji.com' }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        scrollEnabled={pointerEvents !== 'none'}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data) as {
              type?: string;
              id?: number;
              latitude?: number;
              longitude?: number;
              latitudeDelta?: number;
              longitudeDelta?: number;
            };
            if (payload.type === 'ready') {
              readyRef.current = true;
              const start = region ?? fallback;
              webRef.current?.injectJavaScript(
                `window.__onandonSetView && window.__onandonSetView(${start.latitude},${start.longitude},${start.latitudeDelta || 0.2}); true;`,
              );
              pending.current.forEach((js) => webRef.current?.injectJavaScript(`${js}; true;`));
              pending.current = [];
              paint(children);
              return;
            }
            if (payload.type === 'press' && typeof payload.id === 'number') {
              pressesRef.current[payload.id]?.();
              return;
            }
            if (payload.type === 'region' && payload.latitude != null && payload.longitude != null) {
              regionCb.current?.({
                latitude: payload.latitude,
                longitude: payload.longitude,
                latitudeDelta: payload.latitudeDelta ?? 0.2,
                longitudeDelta: payload.longitudeDelta ?? 0.2,
              });
            }
          } catch {
            // ignore malformed map messages
          }
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 160, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
