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
import { validLatLng } from '../../utils/mapCamera';

export type Region = MapRegion;
export const PROVIDER_GOOGLE = 'google';

export interface MapViewHandle {
  animateToRegion: (region: MapRegion) => void;
  fitToCoordinates: (
    coordinates: { latitude: number; longitude: number }[],
    options?: { padding?: number | [number, number]; edgePadding?: { top?: number; right?: number; bottom?: number; left?: number } },
  ) => void;
}

interface MarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  badgeLabel?: string;
  emphasized?: boolean;
  onPress?: () => void;
  tracksViewChanges?: boolean;
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

function regionToZoom(region: MapRegion): number {
  const delta = Math.max(region.latitudeDelta, region.longitudeDelta);
  if (delta > 1.2) return 8;
  if (delta > 0.6) return 9;
  if (delta > 0.35) return 10;
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

const COLOR: Record<string, string> = {
  red: '#E0392A',
  green: '#16A34A',
  orange: '#F59E0B',
  blue: '#2563EB',
  violet: '#7C3AED',
  teal: '#0D9488',
  gray: '#6B7280',
};

function isMarkerChild(child: { type: unknown }) {
  const type = child.type as { isMapMarker?: boolean };
  return type === Marker || Boolean(type?.isMapMarker);
}

function isPolylineChild(child: { type: unknown }) {
  const type = child.type as { isMapPolyline?: boolean };
  return type === Polyline || Boolean(type?.isMapPolyline);
}

function fitPadding(options?: {
  padding?: number | [number, number];
  edgePadding?: { top?: number; right?: number; bottom?: number; left?: number };
}) {
  if (options?.edgePadding) {
    return [options.edgePadding.top ?? 40, options.edgePadding.right ?? 40] as [number, number];
  }
  if (Array.isArray(options?.padding)) return options.padding;
  if (typeof options?.padding === 'number') return [options.padding, options.padding] as [number, number];
  return [40, 40] as [number, number];
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { style, initialRegion, region, children, onRegionChangeComplete },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const regionCb = useRef(onRegionChangeComplete);
  const childrenRef = useRef(children);
  const pendingFly = useRef<MapRegion | null>(null);
  const pendingFit = useRef<{ latitude: number; longitude: number }[] | null>(null);
  const appliedKey = useRef('');
  regionCb.current = onRegionChangeComplete;
  childrenRef.current = children;
  const fallback = initialRegion ?? region ?? {
    latitude: 37.4138,
    longitude: 127.5183,
    latitudeDelta: 1.6,
    longitudeDelta: 1.6,
  };

  const paintOverlays = () => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    Children.forEach(childrenRef.current, (child) => {
      if (!isValidElement(child)) return;
      if (isPolylineChild(child)) {
        const line = child.props as PolylineProps;
        const latlngs = (line.coordinates ?? [])
          .filter((point) => validLatLng(point.latitude, point.longitude))
          .map((point) => [point.latitude, point.longitude] as [number, number]);
        if (latlngs.length < 2) return;
        L.polyline(latlngs, {
          color: line.strokeColor || '#0047FF',
          weight: line.strokeWidth || 4,
          dashArray: (line.lineDashPattern ?? [6, 8]).join(', '),
          opacity: 0.8,
          lineCap: 'round',
        }).addTo(layer);
        return;
      }
      if (!isMarkerChild(child)) return;
      const marker = child.props as MarkerProps;
      if (!validLatLng(marker.coordinate?.latitude, marker.coordinate?.longitude)) return;
      const color = COLOR[marker.pinColor ?? 'red'] ?? marker.pinColor ?? '#E0392A';
      const size = marker.emphasized ? 28 : 22;
      const badge = marker.badgeLabel
        ? `<div style="min-width:${size}px;height:${size}px;padding:0 6px;background:${color};color:#fff;border:2px solid #fff;border-radius:${size / 2}px;box-shadow:0 2px 6px rgba(0,0,0,.25);font:800 ${marker.emphasized ? 12 : 10}px/${size - 4}px sans-serif;text-align:center">${marker.badgeLabel}</div>`
        : `<div style="width:16px;height:16px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`;
      const icon = L.divIcon({
        className: 'onandon-pin',
        html: badge,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const pin = L.marker([marker.coordinate.latitude, marker.coordinate.longitude], { icon, title: marker.title });
      if (marker.onPress) pin.on('click', marker.onPress);
      pin.addTo(layer);
    });
  };

  const fly = (next: MapRegion, animate = true) => {
    const map = mapRef.current;
    if (!map) {
      pendingFly.current = next;
      return;
    }
    const zoom = regionToZoom(next);
    if (animate) map.flyTo([next.latitude, next.longitude], zoom, { duration: 0.45 });
    else map.setView([next.latitude, next.longitude], zoom);
  };

  const fit = (coordinates: { latitude: number; longitude: number }[], padding: [number, number] = [40, 40]) => {
    const valid = coordinates.filter((point) => validLatLng(point.latitude, point.longitude));
    const map = mapRef.current;
    if (!valid.length) return;
    if (!map) {
      pendingFit.current = valid;
      return;
    }
    if (valid.length === 1) {
      map.setView([valid[0].latitude, valid[0].longitude], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(valid.map((point) => [point.latitude, point.longitude])), { padding });
  };

  useImperativeHandle(ref, () => ({
    animateToRegion(next) {
      fly(next, true);
    },
    fitToCoordinates(coordinates, options) {
      fit(coordinates, fitPadding(options));
    },
  }));

  useEffect(() => {
    ensureLeafletCss();
    const el = containerRef.current;
    if (!el) return;
    const start = region ?? fallback;
    const map = L.map(el, { zoomControl: true }).setView(
      [start.latitude, start.longitude],
      regionToZoom(start),
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    appliedKey.current = `${start.latitude.toFixed(4)},${start.longitude.toFixed(4)}`;
    map.on('moveend', () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const delta = zoom >= 14 ? 0.02 : zoom >= 12 ? 0.06 : zoom >= 10 ? 0.2 : 0.8;
      regionCb.current?.({
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: delta,
        longitudeDelta: delta,
      });
    });
    paintOverlays();
    if (pendingFit.current) {
      fit(pendingFit.current);
      pendingFit.current = null;
    } else if (pendingFly.current) {
      fly(pendingFly.current, false);
      pendingFly.current = null;
    }
    const invalidate = () => {
      map.invalidateSize();
      paintOverlays();
    };
    const timer = window.setTimeout(invalidate, 120);
    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    paintOverlays();
  }, [children]);

  useEffect(() => {
    const next = region ?? initialRegion;
    if (!next || !mapRef.current) return;
    const key = `${next.latitude.toFixed(4)},${next.longitude.toFixed(4)},${Number(next.latitudeDelta).toFixed(3)}`;
    if (appliedKey.current === key) return;
    appliedKey.current = key;
    fly(next, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region?.latitude, region?.longitude, region?.latitudeDelta, initialRegion?.latitude, initialRegion?.longitude, initialRegion?.latitudeDelta]);

  return (
    <View style={[styles.wrap, style]}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 180 }} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 180, overflow: 'hidden' },
});
