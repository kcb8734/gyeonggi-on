import L from 'leaflet';
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
import type { MapRegion } from '../../types/map';

export type Region = MapRegion;
export const PROVIDER_GOOGLE = 'google';

export interface MapViewHandle {
  animateToRegion: (region: MapRegion) => void;
  fitToCoordinates: (
    coordinates: { latitude: number; longitude: number }[],
    options?: object,
  ) => void;
}

interface MarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  badgeLabel?: string;
  onPress?: () => void;
  tracksViewChanges?: boolean;
  children?: ReactNode;
}

export function Marker(_props: MarkerProps) {
  return null;
}

interface MapViewProps {
  style?: ViewStyle | ViewStyle[];
  initialRegion?: MapRegion;
  pointerEvents?: 'auto' | 'none' | 'box-none';
  children?: ReactNode;
  onRegionChangeComplete?: (region: MapRegion) => void;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  provider?: string;
}

function regionToZoom(region: MapRegion): number {
  const delta = Math.max(region.latitudeDelta, region.longitudeDelta);
  if (delta > 0.4) return 9;
  if (delta > 0.15) return 11;
  if (delta > 0.05) return 13;
  return 14;
}

function ensureLeafletCss() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('leaflet-css')) return;
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { style, initialRegion, children, onRegionChangeComplete },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const regionCb = useRef(onRegionChangeComplete);
  regionCb.current = onRegionChangeComplete;
  const region = initialRegion ?? {
    latitude: 37.275,
    longitude: 127.15,
    latitudeDelta: 0.35,
    longitudeDelta: 0.35,
  };

  useImperativeHandle(ref, () => ({
    animateToRegion(next) {
      mapRef.current?.flyTo([next.latitude, next.longitude], regionToZoom(next), { duration: 0.5 });
    },
    fitToCoordinates(coordinates) {
      if (!mapRef.current || coordinates.length === 0) return;
      mapRef.current.fitBounds(L.latLngBounds(coordinates.map((c) => [c.latitude, c.longitude])), {
        padding: [40, 40],
      });
    },
  }));

  useEffect(() => {
    ensureLeafletCss();
    const el = containerRef.current;
    if (!el) return;
    const map = L.map(el, { zoomControl: true }).setView(
      [region.latitude, region.longitude],
      regionToZoom(region),
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    map.on('moveend', () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const delta = zoom >= 14 ? 0.02 : zoom >= 12 ? 0.06 : 0.2;
      regionCb.current?.({
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: delta,
        longitudeDelta: delta,
      });
    });
    const invalidate = () => map.invalidateSize();
    const timer = window.setTimeout(invalidate, 80);
    return () => {
      window.clearTimeout(timer);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    Children.forEach(children, (child) => {
      if (!isValidElement(child) || child.type !== Marker) return;
      const marker = child.props as MarkerProps;
      const colorByName: Record<string, string> = {
        red: '#E0392A',
        green: '#16A34A',
        orange: '#F59E0B',
        blue: '#2563EB',
        violet: '#7C3AED',
        teal: '#0D9488',
        gray: '#6B7280',
      };
      const color = colorByName[marker.pinColor ?? 'red'] ?? marker.pinColor ?? '#E0392A';
      const badge = marker.badgeLabel
        ? `<div style="min-width:22px;height:22px;padding:0 5px;background:${color};color:#fff;border:2px solid #fff;border-radius:11px;font:700 10px/18px sans-serif;text-align:center">${marker.badgeLabel}</div>`
        : `<div style="width:16px;height:16px;background:${color};border:2px solid #fff;border-radius:50%"></div>`;
      const icon = L.divIcon({
        className: 'gyeonggi-pin',
        html: badge,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const pin = L.marker([marker.coordinate.latitude, marker.coordinate.longitude], { icon, title: marker.title });
      if (marker.onPress) pin.on('click', marker.onPress);
      pin.addTo(layer);
    });
  }, [children]);

  return (
    <View style={[styles.wrap, style]}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 180 }} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 180, overflow: 'hidden' },
});
