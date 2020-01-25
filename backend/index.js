const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const lunchParser = require("./lunch_parser");
const env = app.get("env");
const path = require("path");
const vote = require("./vote");
console.log("env", env);

// Security best practices.
app.disable("x-powered-by");

// Start the voting server.
vote.init(env);

const frontend_path = path.join("..", "frontend", "www");
console.log("front end path", frontend_path); // debug

// Serve the app.
// if (env === "development") app.use(express.static("../frontend"));
/*else*/ app.use(express.static(frontend_path));

// Listen for the lunch list requests.
app.get("/lunches", async (req, res) => {
	console.log("get lunches"); // debug
	let lunches = await lunchParser.getLunches();

	return res.json(lunches);
});

app.listen(port, () => console.log(`Lounas is being served at port ${port}!`));
