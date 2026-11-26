import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { DEFAULT_ZOOM } from '../../utils/map';
import { colors, borderRadius, spacing, typography } from '../../theme/tokens';
import {
  LeafletMapProps,
  LeafletMessage,
  LoadStatus,
  LOAD_TIMEOUT_MS,
  LEAFLET_HTML,
} from './leafletMapShared';

export type { LeafletMarker, LeafletMapProps } from './leafletMapShared';

/**
 * react-native-webview 14.0.1 declara `class WebView<P = undefined> extends
 * Component<WebViewProps & P>`: con el genérico por defecto, `WebViewProps &
 * undefined` colapsa a `never` y JSX rechaza cualquier prop. Re-tipamos el
 * componente con sus props reales; el runtime no cambia.
 */
const MapWebView = WebView as unknown as React.ComponentType<
  WebViewProps & React.RefAttributes<WebView>
>;

/**
 * Mapa interactivo basado en WebView + Leaflet con mosaicos de OpenStreetMap.
 *
 * Se usa en lugar de `react-native-maps` porque, desde Expo SDK 55, Expo Go ya
 * no soporta Google Maps en Android (el mapa queda en negro) y en Android el
 * SDK de Google exige una API key incluso para tiles propios. Leaflet + OSM no
 * requiere API key y funciona en Expo Go (Android, iOS y web).
 *
 * La comunicación React Native ↔ WebView se hace por `injectJavaScript` (RN →
 * mapa) y `postMessage` (mapa → RN).
 */
export const LeafletMap: React.FC<LeafletMapProps> = ({
  markers,
  selectable = false,
  userLocation,
  center,
  zoom = DEFAULT_ZOOM,
  centerKey,
  fitKey = null,
  /** Círculos a dibujar (un círculo por objeto). */
  circles = [],
  onPress,
  onMarkerPress,
  onMarkerDragEnd,
  onMoveEnd,
  style,
  testID = 'leaflet-map',
}) => {
  const webRef = useRef<WebView | null>(null);
  const readyRef = useRef(false);
  const [status, setStatus] = useState<LoadStatus>('loading');

  // Serializa los markers; al ser un string, el efecto solo se dispara cuando
  // el contenido cambia (no en cada render por una nueva identidad de array).
  const markersJson = JSON.stringify(
    markers.map((marker) => ({
      id: marker.id,
      latitude: marker.latitude,
      longitude: marker.longitude,
      color: marker.color ?? null,
      title: marker.title ?? null,
      draggable: Boolean(marker.draggable),
    }))
  );

  const userLat = userLocation?.latitude ?? null;
  const userLng = userLocation?.longitude ?? null;
  const centerLat = center?.latitude ?? null;
  const centerLng = center?.longitude ?? null;

  const circlesJson = useMemo(
    () =>
      JSON.stringify(
        circles.map((c) => ({
          id: c.id,
          latitude: c.latitude,
          longitude: c.longitude,
          radiusKm: c.radiusKm,
          color: c.color ?? '#f97316',
          fillOpacity: c.fillOpacity ?? 0.2,
        }))
      ),
    [circles]
  );

  const inject = useCallback((js: string) => {
    webRef.current?.injectJavaScript(`try { ${js} } catch (e) {} true;`);
  }, []);

  // Reenvía todo el estado actual (tras cargar o recargar la WebView).
  const pushState = useCallback(() => {
    inject(`window.__leaflet.setSelectable(${selectable ? 'true' : 'false'})`);
    inject(`window.__leaflet.setMarkers(${markersJson})`);
    inject(`window.__leaflet.setCircles(${circlesJson})`);
    inject(`window.__leaflet.setUserLocation(${userLat}, ${userLng})`);
    if (centerLat != null && centerLng != null) {
      inject(`window.__leaflet.setView(${centerLat}, ${centerLng}, ${zoom})`);
    } else if (fitKey) {
      inject('window.__leaflet.fitMarkers()');
    }
  }, [
    inject,
    selectable,
    markersJson,
    circlesJson,
    userLat,
    userLng,
    centerLat,
    centerLng,
    zoom,
    fitKey,
  ]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: LeafletMessage;
      try {
        message = JSON.parse(event.nativeEvent.data) as LeafletMessage;
      } catch {
        return;
      }

      if (message.type === 'ready') {
        readyRef.current = true;
        setStatus('ready');
        pushState();
        return;
      }

      if (message.type === 'error') {
        setStatus('error');
        return;
      }

      if (
        message.type === 'press' &&
        typeof message.latitude === 'number' &&
        typeof message.longitude === 'number'
      ) {
        onPress?.({
          latitude: message.latitude,
          longitude: message.longitude,
        });
        return;
      }

      if (message.type === 'markerPress' && typeof message.id === 'string') {
        onMarkerPress?.(message.id);
        return;
      }

      if (
        message.type === 'markerDragEnd' &&
        typeof message.id === 'string' &&
        typeof message.latitude === 'number' &&
        typeof message.longitude === 'number'
      ) {
        onMarkerDragEnd?.(message.id, {
          latitude: message.latitude,
          longitude: message.longitude,
        });
        return;
      }

      if (
        message.type === 'moveend' &&
        typeof message.latitude === 'number' &&
        typeof message.longitude === 'number'
      ) {
        onMoveEnd?.(
          { latitude: message.latitude, longitude: message.longitude },
          typeof message.zoom === 'number' ? message.zoom : zoom
        );
      }
    },
    [pushState, onPress, onMarkerPress, onMarkerDragEnd, onMoveEnd, zoom]
  );

  useEffect(() => {
    if (readyRef.current) {
      inject(`window.__leaflet.setSelectable(${selectable ? 'true' : 'false'})`);
    }
  }, [selectable, inject]);

  useEffect(() => {
    if (readyRef.current) inject(`window.__leaflet.setMarkers(${markersJson})`);
  }, [markersJson, inject]);

  useEffect(() => {
    if (readyRef.current) inject(`window.__leaflet.setCircles(${circlesJson})`);
  }, [circlesJson, inject]);

  useEffect(() => {
    if (readyRef.current) {
      inject(`window.__leaflet.setUserLocation(${userLat}, ${userLng})`);
    }
  }, [userLat, userLng, inject]);

  useEffect(() => {
    if (readyRef.current && centerLat != null && centerLng != null) {
      inject(`window.__leaflet.setView(${centerLat}, ${centerLng}, ${zoom})`);
    }
    // `centerKey` permite forzar el recentrado con las mismas coordenadas.
  }, [centerLat, centerLng, zoom, centerKey, inject]);

  useEffect(() => {
    if (readyRef.current && fitKey) inject('window.__leaflet.fitMarkers()');
  }, [fitKey, inject]);

  // Si Leaflet/OSM no terminan de cargar a tiempo, se muestra un error con
  // opción de reintentar en lugar de dejar el spinner para siempre.
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => {
      if (!readyRef.current) setStatus('error');
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const handleRetry = useCallback(() => {
    readyRef.current = false;
    setStatus('loading');
    webRef.current?.reload();
  }, []);

  // Fuente estable: si el objeto `source` cambia de identidad en cada render,
  // la WebView puede recargarse y perder el mapa.
  const source = useMemo(
    () => ({ html: LEAFLET_HTML, baseUrl: 'https://tile.openstreetmap.org' }),
    []
  );

  return (
    <View style={[styles.root, style]} testID={testID}>
      <MapWebView
        ref={webRef}
        originWhitelist={['*']}
        source={source}
        onMessage={handleMessage}
        onLayout={() => {
          if (readyRef.current) inject('window.__leaflet.invalidate()');
        }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled={false}
        overScrollMode="never"
        style={styles.webview}
        testID={`${testID}-webview`}
      />
      {status === 'loading' && (
        <View pointerEvents="none" style={styles.overlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      {status === 'error' && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>No pudimos cargar el mapa.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            testID={`${testID}-retry`}
            accessibilityRole="button"
            accessibilityLabel="Reintentar cargar el mapa"
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // La raíz debe ocupar el alto del contenedor. Sin esto, la `WebView` (flex: 1)
  // queda con altura 0 y el mapa no pinta (se ve el fondo del contenedor).
  root: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.md,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default LeafletMap;
