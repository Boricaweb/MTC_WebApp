/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'app.js',
        'google-sheets.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'text-summary', 'lcov'],
    verbose: true
};
