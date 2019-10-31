const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: ['./app/javascripts/app.js'],
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'js/app.js'
    },
    plugins: [
        new CopyWebpackPlugin([
            // Copy our app's index.html to the build folder.
            {
                from: './app/index.html',
                to: "index.html"
            },
            {
                from: './app/images',
                to: "images"
            },
            {
                from: './app/stylesheets',
                to: "css"
            },
            {
                from: './app/javascripts/language.js',
                to: "js/language.js"
            },
            {
                from: './app/javascripts/language.json',
                to: "js/language.json"
            },
            {
                from: './app/statuspage',
                to: "statuspage"
            }
        ]),
        new CopyWebpackPlugin([
            { // Doing another instance, because ./app/images/ is dirty in the other instance.
                from: './app/images/logo-open-edx.png',
                to: "statuspage/logo-open-edx.png"
            }
        ]),
    ],
    module: {
        rules: [{
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
        }],
        loaders: [{
                test: /\.json$/,
                use: 'json-loader'
            },
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015'],
                    plugins: ['transform-runtime']
                }
            }
        ]
    }
}