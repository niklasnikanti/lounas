const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	entry: "./src/index.js",
	output: {
		filename: "index.js",
		path: path.resolve(__dirname, "www")
	},
	mode: "production",
	watch: false,
	plugins: [
		new CleanWebpackPlugin(),
		new CopyPlugin({
			patterns: [
				{
					from: "src/index.html",
					to: "index.html"
				},
				{
					from: "src/styles.css",
					to: "styles.css"
				}
			]
		})
	]
};
