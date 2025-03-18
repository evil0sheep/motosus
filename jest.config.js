export default {
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    testEnvironment: 'node',
    moduleFileExtensions: ['js'],
    transformIgnorePatterns: [
        'node_modules/(?!(matter-js)/)'
    ]
}; 