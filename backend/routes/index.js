const lunchParser = require("../lunch_parser");

// Available routes for the app.
const available_routes = [
	app => {
		// Listen for the lunch list requests.
		app.get("/lunches", async (req, res) => {
			console.log("get lunches"); // debug
			let lunches = await lunchParser.getLunches();

			return res.json(lunches);
		})
	}
];

// Register the enabled routes.
const routes = app => {
	available_routes.forEach(route => route(app))
};

module.exports = routes;
