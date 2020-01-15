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
const ws = new WebSocket.Server({ port: 8080 });

// TODO: Test client - server connection.
ws.on("open", function open() {
	console.log("WebSocket server is open!");
	ws.send("test message");
});

ws.on("message", function incoming(data) {
	console.log("data", data);
});

ws.on("error", e => {
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
