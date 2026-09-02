module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // React Native 0.81's own jest mock crashes on components without a
    // `prototype`, which blocks rendering anything in a test. See the header
    // of jest/mockComponent.js. Only RN's jest/mocks/* request this path.
    '^\\.\\./mockComponent$': '<rootDir>/jest/mockComponent.js',
  },
  // lucide-react-native ships ESM as .mjs, which the preset's transform
  // (matching only .js/.jsx/.ts/.tsx) leaves untransformed.
  transform: {
    ...require('jest-expo/jest-preset').transform,
    '^.+\\.mjs$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
};
