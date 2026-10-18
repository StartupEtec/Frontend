module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-webview|expo|@expo|expo-status-bar|expo-image-picker|expo-camera|expo-file-system|expo-document-picker|expo-location|@react-native-community/datetimepicker|expo-modules-core|@react-native-async-storage)/)',
  ],
};
