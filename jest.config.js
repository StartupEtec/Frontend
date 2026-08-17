module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|expo-status-bar|expo-image-picker|expo-file-system|expo-document-picker|@react-native-community/datetimepicker|expo-modules-core|@react-native-async-storage)/)',
  ],
};
