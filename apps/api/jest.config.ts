import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^@pibs/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { strict: false } }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/**/*.routes.ts',
    '!src/lib/prisma.ts',
    '!src/lib/socket.ts',
    '!src/lib/swagger.ts',
  ],
  coverageThreshold: {
    global: { lines: 50 },
  },
  clearMocks: true,
};

export default config;
