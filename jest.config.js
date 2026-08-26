export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.ts$": "$1" },
  transform: { "^.+\\.ts$": ["ts-jest", { useESM: true }] },
};
