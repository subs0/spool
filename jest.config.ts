module.exports = {
    preset: "ts-jest",
    testEnvironment: "node", // "jsdom",
    testMatch: [ "**/**/*.test.(js|ts|tsx)" ],
    //  moduleFileExtensions: ["js", "ts", "jsx", "tsx", "json", "node"],
    verbose: true,
    transform: {
        "^.+\\.js$": "babel-jest",
        "^.+\\.(ts|tsx)$": "ts-jest"
    },
    transformIgnorePatterns: [ "node_modules/?!(@-0)" ],
    watchPathIgnorePatterns: [ "^.+\\.repl.(ts|js)$" ]
}
