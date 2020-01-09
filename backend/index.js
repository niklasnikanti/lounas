const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const lunchParser = require("./lunch_parser");
const env = app.get("env");
console.log("env", env);

// Serve the page.
// if (env === "development") app.use(express.static("../frontend"));
/*else*/ app.use(express.static("../frontend/www"));

// Listen for the lunch list requests.
app.get("/lunches", async (req, res) => {
	console.log("get lunches"); // debug
	let lunches = await lunchParser.getLunches();

	return res.json(lunches);
});

app.listen(port, () => console.log(`Lounas is being served at port ${port}!`));
