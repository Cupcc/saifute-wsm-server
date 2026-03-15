module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testEnvironment: "node",
  testRegex: ["(.*\\.spec\\.ts$)", "(test/batch-d-slice\\.e2e-spec\\.ts$)"],
  testPathIgnorePatterns: ["test/app\\.e2e-spec\\.ts$"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/main.ts"],
  coverageDirectory: "./coverage",
};
