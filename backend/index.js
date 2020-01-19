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
const wss_port = env === "development" ? 80 : 433;
const wss = new WebSocket.Server({ port: wss_port });

// TODO: Test client - server connection.
wss.on("connection", function connection(ws) {
	console.log("WebSocket connected to the server!");

	ws.on("message", function incoming(msg) {
		console.log("message", msg);

		try {
			const message = JSON.parse(msg);
			console.log("parsed", message); 

			if (message.vote) {
				lunchParser.votes.push({
					vote: message.vote,
					restaurant: message.restaurant,
					who: message.who
				});

				console.log("votes", lunchParser.votes); // debug
			}
		} catch(e) {
			console.error("Error while parsing message", e);
		}
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
