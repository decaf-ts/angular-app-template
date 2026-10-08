import type { Config } from '@jest/types';
import { createRequire } from 'module';
import path from 'path';

const requireConfig = createRequire(path.join(process.cwd(), 'jest.config.ts'));
const conf = requireConfig(requireConfig.resolve('./jest.config.ts')).default as Config.InitialOptions;
const config: Config.InitialOptions = {
  ...conf,
  rootDir: '../..',
  collectCoverage: true,
  coverageDirectory: './workdocs/reports/coverage',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './workdocs/reports/junit',
        outputName: 'junit-report.xml',
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './workdocs/reports/html',
        filename: 'test-report.html',
        openReport: true,
        expand: true,
        pageTitle: 'angular-template Test Report',
        stripSkippedTest: true,
        darkTheme: true,
        enableMergeData: true,
        dataMergeLevel: 2,
      },
    ],
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 85,
      lines: 80,
      statements: 88,
    },
  },
};

export default config;
