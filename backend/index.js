const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const lunchParser = require("./lunch_parser");
const env = app.get("env");
const path = require("path");
console.log("env", env);


const frontend_path = path.join("..", "/frontend", "/www");
console.log("front end path", frontend_path); // debug

// Serve the page.
// if (env === "development") app.use(express.static("../frontend"));
/*else*/ app.use(express.static(frontend_path));

// Listen for the lunch list requests.
app.get("/lunches", async (req, res) => {
	console.log("get lunches"); // debug
	let lunches = await lunchParser.getLunches();

	return res.json(lunches);
});

app.listen(port, () => console.log(`Lounas is being served at port ${port}!`));
