import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { Coordinates } from "../../types/location";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  OSM_ATTRIBUTION,
  OSM_MAX_ZOOM,
  OSM_TILE_URL,
} from "../../utils/map";
import { colors, borderRadius, spacing, typography } from "../../theme/tokens";

export interface LeafletMarker {
  id: string;
  latitude: number;
  longitude: number;
  /** Color del pin (hex). */
  color?: string;
  /** Etiqueta que se muestra al tocar el pin. */
  title?: string;
  /** Permite arrastrar el pin y reportar la nueva posición. */
  draggable?: boolean;
}

interface LeafletMapProps {
  markers: LeafletMarker[];
  /** Un toque sobre el mapa reporta onPress (modo selección). */
  selectable?: boolean;
  /** Punto azul de "mi ubicación". */
  userLocation?: Coordinates | null;
  /** Centro/zoom forzado (se recentra al cambiar). */
  center?: Coordinates | null;
  zoom?: number;
  /**
   * Cambia este valor para forzar un recentrado aunque `center` no cambie
   * (por ejemplo, al presionar "centrar en mi ubicación").
   */
  centerKey?: string | number;
  /**
   * Cadena que identifica el conjunto de markers. Al cambiar, se reencuadra
   * (fitBounds) para que todos entren en pantalla.
   */
  fitKey?: string | null;
  /** Círculos a dibujar (un círculo por objeto). */
  circles?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    radiusKm: number;
    color?: string;
    fillOpacity?: number;
  }>;
  onPress?: (coordinates: Coordinates) => void;
  onMarkerPress?: (id: string) => void;
  onMarkerDragEnd?: (id: string, coordinates: Coordinates) => void;
  /**
   * El usuario terminó de mover o hacer zoom en el mapa. Reporta el centro
   * visible y el zoom actuales (la pantalla de búsqueda los usa para
   * re-consultar trabajadores en la zona visible).
   */
  onMoveEnd?: (center: Coordinates, zoom: number) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface LeafletMessage {
  type:
    "ready" | "error" | "press" | "markerPress" | "markerDragEnd" | "moveend";
  id?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
}

type LoadStatus = "loading" | "ready" | "error";

/** Tiempo máximo de espera a que Leaflet/OSM carguen antes de mostrar error. */
const LOAD_TIMEOUT_MS = 12000;

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
  testID = "leaflet-map",
}) => {
  const webRef = useRef<WebView | null>(null);
  const readyRef = useRef(false);
  const [status, setStatus] = useState<LoadStatus>("loading");

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
    })),
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
          color: c.color ?? "#f97316",
          fillOpacity: c.fillOpacity ?? 0.2,
        })),
      ),
    [circles],
  );

  const inject = useCallback((js: string) => {
    webRef.current?.injectJavaScript(`try { ${js} } catch (e) {} true;`);
  }, []);

  // Reenvía todo el estado actual (tras cargar o recargar la WebView).
  const pushState = useCallback(() => {
    inject(`window.__leaflet.setSelectable(${selectable ? "true" : "false"})`);
    inject(`window.__leaflet.setMarkers(${markersJson})`);
    inject(`window.__leaflet.setCircles(${circlesJson})`);
    inject(`window.__leaflet.setUserLocation(${userLat}, ${userLng})`);
    if (centerLat != null && centerLng != null) {
      inject(`window.__leaflet.setView(${centerLat}, ${centerLng}, ${zoom})`);
    } else if (fitKey) {
      inject("window.__leaflet.fitMarkers()");
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

      if (message.type === "ready") {
        readyRef.current = true;
        setStatus("ready");
        pushState();
        return;
      }

      if (message.type === "error") {
        setStatus("error");
        return;
      }

      if (
        message.type === "press" &&
        typeof message.latitude === "number" &&
        typeof message.longitude === "number"
      ) {
        onPress?.({
          latitude: message.latitude,
          longitude: message.longitude,
        });
        return;
      }

      if (message.type === "markerPress" && typeof message.id === "string") {
        onMarkerPress?.(message.id);
        return;
      }

      if (
        message.type === "markerDragEnd" &&
        typeof message.id === "string" &&
        typeof message.latitude === "number" &&
        typeof message.longitude === "number"
      ) {
        onMarkerDragEnd?.(message.id, {
          latitude: message.latitude,
          longitude: message.longitude,
        });
        return;
      }

      if (
        message.type === "moveend" &&
        typeof message.latitude === "number" &&
        typeof message.longitude === "number"
      ) {
        onMoveEnd?.(
          { latitude: message.latitude, longitude: message.longitude },
          typeof message.zoom === "number" ? message.zoom : zoom,
        );
      }
    },
    [pushState, onPress, onMarkerPress, onMarkerDragEnd, onMoveEnd, zoom],
  );

  useEffect(() => {
    if (readyRef.current) {
      inject(
        `window.__leaflet.setSelectable(${selectable ? "true" : "false"})`,
      );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLng, zoom, centerKey, inject]);

  useEffect(() => {
    if (readyRef.current && fitKey) inject("window.__leaflet.fitMarkers()");
  }, [fitKey, inject]);

  // Si Leaflet/OSM no terminan de cargar a tiempo, se muestra un error con
  // opción de reintentar en lugar de dejar el spinner para siempre.
  useEffect(() => {
    if (status !== "loading") return;
    const timer = setTimeout(() => {
      if (!readyRef.current) setStatus("error");
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const handleRetry = useCallback(() => {
    readyRef.current = false;
    setStatus("loading");
    webRef.current?.reload();
  }, []);

  // Fuente estable: si el objeto `source` cambia de identidad en cada render,
  // la WebView puede recargarse y perder el mapa.
  const source = useMemo(
    () => ({ html: LEAFLET_HTML, baseUrl: "https://tile.openstreetmap.org" }),
    [],
  );

  return (
    <View style={[styles.root, style]} testID={testID}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={source}
        onMessage={handleMessage}
        onLayout={() => {
          if (readyRef.current) inject("window.__leaflet.invalidate()");
        }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled={false}
        overScrollMode="never"
        style={styles.webview}
        testID={`${testID}-webview`}
      />
      {status === "loading" && (
        <View pointerEvents="none" style={styles.overlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      {status === "error" && (
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.md,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
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

/**
 * HTML del mapa. Leaflet se carga desde CDN (unpkg) y los tiles desde
 * OpenStreetMap. Expone `window.__leaflet` con las operaciones que dispara RN
 * y reporta eventos por `ReactNativeWebView.postMessage`.
 */
const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #eef1f5; }
    .app-pin {
      width: 22px; height: 22px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #ffffff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var TILE_URL = ${JSON.stringify(OSM_TILE_URL)};
      var MAX_ZOOM = ${OSM_MAX_ZOOM};
      var ATTRIBUTION = '${OSM_ATTRIBUTION.replace(/'/g, "\\'")}';
      var DEFAULT_LAT = ${DEFAULT_CENTER.latitude};
      var DEFAULT_LNG = ${DEFAULT_CENTER.longitude};

      function send(payload) {
        try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
      }

      if (typeof L === 'undefined') {
        send({ type: 'error' });
        return;
      }

      var map = L.map('map', { zoomControl: true, attributionControl: true })
        .setView([DEFAULT_LAT, DEFAULT_LNG], ${DEFAULT_ZOOM});

      L.tileLayer(TILE_URL, { maxZoom: MAX_ZOOM, attribution: ATTRIBUTION }).addTo(map);

      var markers = {};
      var circles = {};
      var userMarker = null;
      var selectable = false;
      // Último tamaño válido de la WebView, para no recalcular sin cambios.
      var lastSize = map.getSize();

      function doInvalidate() {
        var size = map.getSize();
        // Tamaño inválido (pantalla oculta con display:none) o sin cambios:
        // invalidateSize en ese estado emite moveend/pan innecesarios que se
        // ven como temblor y disparan búsquedas de más.
        if (size.x === 0 || size.y === 0) return;
        if (size.x === lastSize.x && size.y === lastSize.y) return;
        lastSize = { x: size.x, y: size.y };
        map.invalidateSize({ animate: false });
      }

      function pinIcon(color) {
        return L.divIcon({
          className: '',
          html: '<div class="app-pin" style="background:' + color + '"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 22]
        });
      }

      function removeMarker(id) {
        if (markers[id]) { map.removeLayer(markers[id]); delete markers[id]; }
      }

      function addMarker(m) {
        var options = { draggable: !!m.draggable, title: m.title || '' };
        if (m.color) options.icon = pinIcon(m.color);
        var marker = L.marker([m.latitude, m.longitude], options).addTo(map);
        // Estado propio para poder reconciliar pins sin re-crearlos.
        marker.__color = m.color || null;
        marker.__draggable = !!m.draggable;
        marker.on('click', function () { send({ type: 'markerPress', id: m.id }); });
        if (m.draggable) {
          marker.on('dragend', function () {
            var position = marker.getLatLng();
            send({ type: 'markerDragEnd', id: m.id, latitude: position.lat, longitude: position.lng });
          });
        }
        markers[m.id] = marker;
      }

      function removeCircle(id) {
        if (circles[id]) { map.removeLayer(circles[id]); delete circles[id]; }
      }

      function addCircle(c) {
        var radiusM = (c.radiusKm || 0) * 1000;
        if (radiusM <= 0) return;
        var circle = L.circle([c.latitude, c.longitude], {
          radius: radiusM,
          color: c.color || '#f97316',
          weight: 2,
          fillColor: c.color || '#f97316',
          fillOpacity: c.fillOpacity != null ? c.fillOpacity : 0.2,
          interactive: false
        }).addTo(map);
        circles[c.id] = circle;
      }

      map.on('click', function (e) {
        if (selectable) send({ type: 'press', latitude: e.latlng.lat, longitude: e.latlng.lng });
      });

      // Reporta el fin de cada gesto de pan/zoom DEL USUARIO con el centro y
      // zoom visibles (la pantalla de búsqueda re-consulta al mover el mapa).
      //
      // Solo se emite cuando el movimiento trae originalEvent (gesto real):
      // los movimientos programáticos (setView de un recentrado/filtro) y los
      // re-centrados internos de Leaflet (invalidateSize, re-encuadre al
      // cargar tiles) no lo llevan. Sin este filtro, cada setMarkers/setView
      // re-emitía un moveend con el centro redondeado por píxel, que
      // re-disparaba la búsqueda y volvía a mover el mapa: un bucle de
      // zoom-in/zoom-out y parpadeo constante.
      var userMoved = false;
      map.on('movestart', function (e) {
        if (e.originalEvent) userMoved = true;
      });
      map.on('moveend', function (e) {
        if (!e.originalEvent && !userMoved) return;
        userMoved = false;
        var center = map.getCenter();
        send({ type: 'moveend', latitude: center.lat, longitude: center.lng, zoom: map.getZoom() });
      });

      window.__leaflet = {
        setSelectable: function (value) { selectable = !!value; },
        setMarkers: function (list) {
          // Reconciliación diferencial: los pines que siguen presentes se
          // reutilizan (solo se ajusta posición/color) en lugar de borrar y
          // re-crear todo el conjunto. Así, cada recarga de resultados no
          // hace parpadear los pines del mapa.
          var next = {};
          (list || []).forEach(function (m) {
            var existing = markers[m.id];
            var color = m.color || null;
            if (existing && existing.__draggable === !!m.draggable) {
              var position = L.latLng(m.latitude, m.longitude);
              if (!existing.getLatLng().equals(position)) existing.setLatLng(position);
              if (existing.__color !== color) {
                existing.__color = color;
                existing.setIcon(color ? pinIcon(color) : new L.Icon.Default());
              }
              if (m.title) existing.options.title = m.title;
              next[m.id] = existing;
              return;
            }
            if (existing) removeMarker(m.id);
            addMarker(m);
            next[m.id] = markers[m.id];
          });
          Object.keys(markers).forEach(function (id) {
            if (!next[id]) removeMarker(id);
          });
          markers = next;
        },
        setCircles: function (list) {
          Object.keys(circles).forEach(removeCircle);
          (list || []).forEach(addCircle);
        },
        setUserLocation: function (lat, lng) {
          if (lat === null || lat === undefined || lng === null || lng === undefined) {
            if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
            return;
          }
          if (!userMarker) {
            // Punto azul (= colors.clientAccent) para el usuario; los pines
            // verdes de trabajadores los pasa RN en el prop markers.
            userMarker = L.circleMarker([lat, lng], {
              radius: 7, color: '#ffffff', weight: 3,
              fillColor: '${colors.clientAccent}', fillOpacity: 1
            }).addTo(map);
          } else {
            userMarker.setLatLng([lat, lng]);
          }
        },
        setView: function (lat, lng, zoom) {
          // Guard anti-temblor: si el mapa ya está (casi) en ese punto y zoom,
          // no se vuelve a centrar. El umbral de ~25 m absorbe el redondeo por
          // píxel de Leaflet y los micro-paneos: sin esto, cada moveend
          // re-inyectaba setView, Leaflet emitía otro moveend con el centro
          // redondeado y el ciclo se veía como temblor. La animación está
          // desactivada: un pan animado encima de tiles cargando se nota
          // como salto (y su moveend re-disparaba la búsqueda).
          if (map.getZoom() === zoom && map.getCenter().distanceTo(L.latLng(lat, lng)) < 25) {
            return;
          }
          map.setView([lat, lng], zoom, { animate: false });
        },
        fitMarkers: function () {
          var points = Object.keys(markers).map(function (id) { return markers[id].getLatLng(); });
          if (points.length === 0) return;
          if (points.length === 1) { map.setView(points[0], 15, { animate: true }); return; }
          map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
        },
        invalidate: doInvalidate
      };

      send({ type: 'ready' });

      // La WebView puede reportar 'ready' antes de tener su tamaño final; un
      // invalidateSize asegura que Leaflet calcule bien el viewport y pinte los
      // mosaicos (evita el cuadro en blanco). El guard de tamaño hace que solo
      // se ejecute si el tamaño realmente cambió.
      setTimeout(doInvalidate, 300);
      window.addEventListener('resize', doInvalidate);
    })();
  </script>
</body>
</html>`;

export default LeafletMap;
