const WebSocket = require("ws");
const uuidv4 = require("uuid/v4");
const votes = [];

const vote = {
	init(env) {
		// Open WebSocket server.
		const wss_port = env === "development" ? 80 : 433;
		const wss = new WebSocket.Server({ port: wss_port });

		// TODO: Test client - server connection.
		wss.on("connection", function connection(ws) {
			console.log("WebSocket connected to the server!");

			const uid = uuidv4();
			console.log("uid", uid);

			ws.on("message", function incoming(msg) {
				try {
					const message = JSON.parse(msg);
					console.log("message", message); 

					// If message contains vote, add it to the votes.
					if (message.type === "vote") {
						// Create the new vote.
						const new_vote = {
							vote: message.vote,
							restaurant: message.restaurant,
							uid: message.uid,
							timestamp: Date.now()
						};

						// Check how many votes the voter already has. Limit the votes to 2.
						const user_votes = votes.filter(vote => vote.uid === message.uid);
						console.log("user votes", user_votes); // debug

						if (user_votes.length === 2) {
							// Remove the oldest vote.
							const oldest_index = votes.findIndex(
								vote => vote.timestamp === user_votes[0].timestamp && vote.uid === user_votes[0].uid
							);
							console.log("oldest index", oldest_index); // debug

							votes.splice(oldest_index, 1);
						}

						// Check if the votes already contain the voter's vote and add it if it doesn't.
						const i = votes.findIndex(
							vote => vote.uid === message.uid && vote.restaurant === message.restaurant
						);
						console.log("i", i); // debug

						console.log("already voted this restaurant", i); // debug
						if (i === -1) {
							// Push the new vote to the votes.
							votes.push(new_vote);
						} else {
							// If vote already exists, then replace the existing vote with the new one.
							votes.splice(i, 1, new_vote);
						}

						console.log("votes", votes); // debug
					}

					if (message.type === "remove_vote") {
						// Find the vote from votes and remove it.
						const i = votes.findIndex(
							vote => vote.uid === message.uid && vote.restaurant === message.restaurant
						);
						console.log("vote index", i); // debug

						if (i < 0) return;

						// Remove the vote.
						votes.splice(i, 1);
						console.log("votes", votes); // debug
					}
				} catch(e) {
					console.error("Error while parsing message", e);
				}
			});

			// Send the user's uid.
			ws.send(JSON.stringify({ uid }));
		});

		wss.on("error", e => {
			console.error("WebSocket error:", e);
		});
	}
};

module.exports = vote;
