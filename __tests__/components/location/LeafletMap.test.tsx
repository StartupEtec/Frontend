import React from "react";
import { StyleSheet } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";
import {
  LeafletMap,
  LeafletMarker,
} from "../../../src/components/location/LeafletMap";
import { __injectJavaScript } from "react-native-webview";

beforeEach(() => {
  (__injectJavaScript as jest.Mock).mockClear();
});

const markers: LeafletMarker[] = [
  { id: "loc-1", latitude: -34.6, longitude: -58.38, color: "#0f62fe" },
];

const sendMessage = (node: any, payload: unknown) => {
  fireEvent(node, "message", {
    nativeEvent: { data: JSON.stringify(payload) },
  });
};

describe("LeafletMap", () => {
  it("renders a web view", () => {
    const { getByTestId } = render(
      <LeafletMap markers={markers} testID="map" />,
    );
    expect(getByTestId("map-webview")).toBeTruthy();
  });

  it("fills its container so the map has height", () => {
    // Regresión: sin `flex: 1` en la raíz, la WebView queda con altura 0 y el
    // mapa no pinta (solo se ve el fondo del contenedor).
    const { getByTestId } = render(
      <LeafletMap markers={markers} testID="map" />,
    );
    const style = StyleSheet.flatten(getByTestId("map").props.style);
    expect(style).toMatchObject({ flex: 1 });
  });

  it("injects coverage circles on load and when they change", () => {
    const { getByTestId } = render(
      <LeafletMap
        markers={markers}
        circles={[
          { id: "c1", latitude: -34.6, longitude: -58.4, radiusKm: 2.5 },
        ]}
        testID="map"
      />,
    );
    sendMessage(getByTestId("map-webview"), { type: "ready" });
    expect(__injectJavaScript).toHaveBeenCalledWith(
      expect.stringContaining("setCircles"),
    );
  });

  it("reports a map press", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <LeafletMap markers={[]} onPress={onPress} testID="map" />,
    );

    sendMessage(getByTestId("map-webview"), {
      type: "press",
      latitude: -34.6,
      longitude: -58.38,
    });

    expect(onPress).toHaveBeenCalledWith({
      latitude: -34.6,
      longitude: -58.38,
    });
  });

  it("reports a marker press", () => {
    const onMarkerPress = jest.fn();
    const { getByTestId } = render(
      <LeafletMap
        markers={markers}
        onMarkerPress={onMarkerPress}
        testID="map"
      />,
    );

    sendMessage(getByTestId("map-webview"), {
      type: "markerPress",
      id: "loc-1",
    });

    expect(onMarkerPress).toHaveBeenCalledWith("loc-1");
  });

  it("reports a marker drag end", () => {
    const onMarkerDragEnd = jest.fn();
    const { getByTestId } = render(
      <LeafletMap
        markers={markers}
        onMarkerDragEnd={onMarkerDragEnd}
        testID="map"
      />,
    );

    sendMessage(getByTestId("map-webview"), {
      type: "markerDragEnd",
      id: "loc-1",
      latitude: -33.1,
      longitude: -60.2,
    });

    expect(onMarkerDragEnd).toHaveBeenCalledWith("loc-1", {
      latitude: -33.1,
      longitude: -60.2,
    });
  });

  it("reports the end of a pan or zoom gesture with center and zoom", () => {
    const onMoveEnd = jest.fn();
    const { getByTestId } = render(
      <LeafletMap markers={[]} onMoveEnd={onMoveEnd} testID="map" />,
    );

    sendMessage(getByTestId("map-webview"), {
      type: "moveend",
      latitude: -34.61,
      longitude: -58.39,
      zoom: 13,
    });

    expect(onMoveEnd).toHaveBeenCalledWith(
      { latitude: -34.61, longitude: -58.39 },
      13,
    );
  });

  it("falls back to the current zoom when moveend does not report it", () => {
    const onMoveEnd = jest.fn();
    const { getByTestId } = render(
      <LeafletMap markers={[]} zoom={14} onMoveEnd={onMoveEnd} testID="map" />,
    );

    sendMessage(getByTestId("map-webview"), {
      type: "moveend",
      latitude: -34.61,
      longitude: -58.39,
    });

    expect(onMoveEnd).toHaveBeenCalledWith(
      { latitude: -34.61, longitude: -58.39 },
      14,
    );
  });

  it("listens for moveend in the map HTML", () => {
    const { getByTestId } = render(<LeafletMap markers={[]} testID="map" />);

    const source = getByTestId("map-webview").props.source as {
      html: string;
    };
    expect(source.html).toContain("map.on('moveend'");
    expect(source.html).toContain("type: 'moveend'");
  });

  it("ignores malformed or unknown messages", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <LeafletMap markers={[]} onPress={onPress} testID="map" />,
    );
    const webview = getByTestId("map-webview");

    fireEvent(webview, "message", { nativeEvent: { data: "not-json" } });
    sendMessage(webview, { type: "unknown" });
    sendMessage(webview, { type: "press" });

    expect(onPress).not.toHaveBeenCalled();
  });

  it("handles the ready handshake without crashing", () => {
    const { getByTestId } = render(
      <LeafletMap markers={markers} testID="map" />,
    );
    sendMessage(getByTestId("map-webview"), { type: "ready" });
    expect(getByTestId("map-webview")).toBeTruthy();
  });

  it("shows an error state and allows retrying", () => {
    const { getByTestId, queryByTestId } = render(
      <LeafletMap markers={markers} testID="map" />,
    );

    expect(queryByTestId("map-retry")).toBeNull();
    sendMessage(getByTestId("map-webview"), { type: "error" });

    const retry = getByTestId("map-retry");
    expect(retry).toBeTruthy();

    fireEvent.press(retry);
    // Vuelve al estado de carga (el spinner) mientras recarga la WebView.
    expect(queryByTestId("map-retry")).toBeNull();
  });
});
