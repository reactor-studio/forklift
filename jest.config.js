module.exports = {
  roots: ["<rootDir>/src", "<rootDir>/test"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  testPathIgnorePatterns: ["/node_modules/"],
  testRegex: "(/test/.*|(\\.|/)test)\\.ts$",
  moduleFileExtensions: ["ts", "js"],
};
