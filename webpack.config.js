import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    mode: 'development',
    entry: './js/main.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true
    },
    plugins: [
        new webpack.DefinePlugin({
            'BUILD_TIMESTAMP': JSON.stringify(new Date().toISOString())
        })
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, '/'),
            watch: true
        },
        compress: true,
        port: 8000,
        hot: false,
        liveReload: false,
        client: {
            overlay: true,
            progress: true
        },
        devMiddleware: {
            writeToDisk: true
        }
    },
    watch: true,
    watchOptions: {
        ignored: /node_modules/,
        aggregateTimeout: 300,
        poll: 1000
    },
    resolve: {
        fallback: {
            "fs": false,
            "path": false
        }
    }
}; 