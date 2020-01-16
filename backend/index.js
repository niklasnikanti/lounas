const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const lunchParser = require("./lunch_parser");
const env = app.get("env");
const path = require("path");
const WebSocket = require("ws");
console.log("env", env);

// Security best practices.
app.disable("x-powered-by");

const frontend_path = path.join("..", "frontend", "www");
console.log("front end path", frontend_path); // debug

// Open WebSocket server.
const wss = new WebSocket.Server({ port: 8080 });

// TODO: Test client - server connection.
wss.on("connection", function connection(ws) {
	console.log("WebSocket connected to the server!");

	ws.on("message", function incoming(message) {
		console.log("message", message);
	});
});

wss.on("error", e => {
	console.error("WebSocket error:", e);
});

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
