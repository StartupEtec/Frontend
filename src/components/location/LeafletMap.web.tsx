import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
 * Implementación web de LeafletMap. react-native-webview 14 no tiene soporte
 * para Expo Web (renderiza un componente dummy), así que en la web se usa un
 * iframe con el mismo HTML y el mismo protocolo postMessage.
 */
export const LeafletMap: React.FC<LeafletMapProps> = ({
  markers,
  selectable = false,
  userLocation,
  center,
  zoom = DEFAULT_ZOOM,
  centerKey,
  fitKey = null,
  circles = [],
  onPress,
  onMarkerPress,
  onMarkerDragEnd,
  onMoveEnd,
  style,
  testID = 'leaflet-map',
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);

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
    iframeRef.current?.contentWindow?.postMessage(js, '*');
  }, []);

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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      let message: LeafletMessage;
      try {
        message = JSON.parse(event.data as string) as LeafletMessage;
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
        onPress?.({ latitude: message.latitude, longitude: message.longitude });
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
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pushState, onPress, onMarkerPress, onMarkerDragEnd, onMoveEnd, zoom]);

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
  }, [centerLat, centerLng, zoom, centerKey, inject]);

  useEffect(() => {
    if (readyRef.current && fitKey) inject('window.__leaflet.fitMarkers()');
  }, [fitKey, inject]);

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
    setReloadKey((key) => key + 1);
  }, []);

  return (
    <View
      style={[styles.root, style]}
      testID={testID}
      onLayout={() => {
        if (readyRef.current) inject('window.__leaflet.invalidate()');
      }}
    >
      <iframe
        key={reloadKey}
        ref={iframeRef}
        srcDoc={LEAFLET_HTML}
        title="Mapa Leaflet"
        style={styles.webview}
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
  root: {
    flex: 1,
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderWidth: 0,
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
