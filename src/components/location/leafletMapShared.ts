import { Coordinates } from '../../types/location';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  OSM_ATTRIBUTION,
  OSM_MAX_ZOOM,
  OSM_TILE_URL,
} from '../../utils/map';
import { colors } from '../../theme/tokens';

export interface LeafletMarker {
  id: string;
  latitude: number;
  longitude: number;
  color?: string;
  title?: string;
  draggable?: boolean;
}

export interface LeafletMapProps {
  markers: LeafletMarker[];
  selectable?: boolean;
  userLocation?: Coordinates | null;
  center?: Coordinates | null;
  zoom?: number;
  centerKey?: string | number;
  fitKey?: string | null;
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
  onMoveEnd?: (center: Coordinates, zoom: number) => void;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
  testID?: string;
}

export interface LeafletMessage {
  type: 'ready' | 'error' | 'press' | 'markerPress' | 'markerDragEnd' | 'moveend';
  id?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
}

export type LoadStatus = 'loading' | 'ready' | 'error';

/** Tiempo máximo de espera a que Leaflet/OSM carguen antes de mostrar error. */
export const LOAD_TIMEOUT_MS = 12000;

/**
 * HTML del mapa. Leaflet se carga desde CDN (unpkg) y los tiles desde
 * OpenStreetMap. Expone `window.__leaflet` con las operaciones que dispara RN
 * y reporta eventos tanto por `ReactNativeWebView.postMessage` (WebView nativa)
 * como por `window.parent.postMessage` (iframe en Expo Web).
 */
export const LEAFLET_HTML = `<!DOCTYPE html>
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
        var message = JSON.stringify(payload);
        try {
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
        } catch (e) {}
        try {
          if (window.parent && window.parent !== window) window.parent.postMessage(message, '*');
        } catch (e) {}
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
      var lastSize = map.getSize();

      function doInvalidate() {
        var size = map.getSize();
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
            userMarker = L.circleMarker([lat, lng], {
              radius: 7, color: '#ffffff', weight: 3,
              fillColor: '${colors.clientAccent}', fillOpacity: 1
            }).addTo(map);
          } else {
            userMarker.setLatLng([lat, lng]);
          }
        },
        setView: function (lat, lng, zoom) {
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

      window.addEventListener('message', function (event) {
        var command = event.data;
        if (typeof command !== 'string' || command.indexOf('window.__leaflet.') !== 0) return;
        try { eval(command); } catch (e) {}
      });

      send({ type: 'ready' });
      setTimeout(doInvalidate, 300);
      window.addEventListener('resize', doInvalidate);
    })();
  </script>
</body>
</html>`;
