const path = require('path')
const webpack = require('webpack')

module.exports = {
    mode: 'production',
    // mode: 'development',
    entry: './src/index.ts',

    output:{
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
    },

    resolve: {
        extensions: ['.ts', '.js']
    },

    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    },
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(__dirname, 'tsconfig.json')
                        }
                    }
                ]
            }
        ]
    },

    plugins:[
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
            'process.env.END_POINT': JSON.stringify(process.env.END_POINT)
        })
    ],

    // deal with "Can't resolve 'fs' in xxx"
    node: {
        fs: "empty"
    },
}