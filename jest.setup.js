jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true })
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true })
  ),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');

  class CameraView extends React.Component {
    takePictureAsync = jest.fn(() =>
      Promise.resolve({
        uri: 'file:///mock/camera-photo.jpg',
        width: 100,
        height: 100,
      })
    );

    render() {
      return React.createElement(View, this.props);
    }
  }

  const granted = { granted: true, status: 'granted' };

  return {
    CameraView,
    useCameraPermissions: () => [granted, jest.fn(() => Promise.resolve(granted))],
  };
});

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(() =>
    Promise.resolve({ exists: true, size: 1024 })
  ),
  uploadAsync: jest.fn(() =>
    Promise.resolve({ status: 201, body: JSON.stringify({ message: 'OK', url: '/uploads/profiles/mock.jpg' }) })
  ),
  FileSystemUploadType: { BINARY_CONTENT: 0, MULTIPART: 1 },
  UploadType: { BINARY_CONTENT: 0, MULTIPART: 1 },
  File: jest.fn().mockImplementation((uri) => ({
    uri,
    upload: jest.fn(() =>
      Promise.resolve({ status: 201, body: JSON.stringify({ message: 'OK', url: '/uploads/profiles/mock.jpg' }), headers: {} })
    ),
  })),
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  getInfoAsync: jest.fn(() =>
    Promise.resolve({ exists: true, size: 1024 })
  ),
  uploadAsync: jest.fn(() =>
    Promise.resolve({ status: 201, body: JSON.stringify({ message: 'OK', url: '/uploads/profiles/mock.jpg' }) })
  ),
  copyAsync: jest.fn(() => Promise.resolve()),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  FileSystemUploadType: { BINARY_CONTENT: 0, MULTIPART: 1 },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() =>
    Promise.resolve({ canceled: true, assets: [] })
  ),
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props) => React.createElement('DateTimePicker', props),
  };
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');

  const injectJavaScript = jest.fn();
  const MockWebView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      injectJavaScript,
      postMessage: jest.fn(),
      reload: jest.fn(),
    }));
    return React.createElement(View, props);
  });
  MockWebView.displayName = 'WebView';

  return {
    __esModule: true,
    default: MockWebView,
    WebView: MockWebView,
    __injectJavaScript: injectJavaScript,
  };
});

jest.mock('expo-location', () => ({
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6 },
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true })
  ),
  getForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: { latitude: -34.6037, longitude: -58.3816, accuracy: 10 },
      timestamp: Date.now(),
    })
  ),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Feather: ({ name, testID, ...props }) =>
      React.createElement(Text, { ...props, testID }, name),
  };
});
