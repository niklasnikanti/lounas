const WebSocket = require("ws");
const uuidv4 = require("uuid/v4");
const utils = require("./lunch_parser/utils");
let votes = [];
const uids = [];
const scores = {};
let wss;
let broadcast_timeout;

// Vote a restaurant.
const vote = (message, ws) => {
	// Find if there is already a vote with similar score.
	const similar_score = votes.filter(
		vote => vote.uid === message.uid && vote.score === message.score
	);
	console.log("similar score", similar_score); // debug

	// If a similar score vote exists, remove it. Allow only 1 upvote and 1 downvote.
	if (similar_score.length) {
		const similar_index = votes.findIndex(
			vote => vote.timestamp === similar_score[0].timestamp
		);
		console.log("similar index", similar_index); // debug

		if (similar_index > -1) votes.splice(similar_index, 1);
	}

	// Check if the votes already contain the voter's vote and add it if it doesn't.
	const i = votes.findIndex(
		vote => vote.uid === message.uid && vote.restaurant === message.restaurant
	);
	console.log("i", i); // debug

	// If the user already voted for the resturant, delete the existing vote.
	if (i > -1) votes.splice(i, 1);

	// Create the new vote.
	const new_vote = {
		score: message.score,
		restaurant: message.restaurant,
		uid: message.uid,
		timestamp: Date.now()
	};

	// Push the new vote to the votes.
	votes.push(new_vote);
	console.log("votes", votes); // debug

	broadcastVotes();
};

// Remove a vote.
const removeVote = (message, ws) => {
	// Find the vote from votes and remove it.
	const i = votes.findIndex(
		vote => vote.uid === message.uid && vote.restaurant === message.restaurant
	);
	console.log("vote index", i); // debug

	if (i < 0) return;

	// Remove the vote.
	votes.splice(i, 1);
	console.log("votes", votes); // debug

	// Clients to send the message to.
	const clients = Array.from(wss.clients).filter(
		client => votes.some(vote => vote.uid === client.uid)
	);
	clients.push(ws);

	broadcastVotes(clients);
};

// Replace UID.
const replaceUid = (message, ws) => {
	console.log("replace uid", message); // debug

	// Find the existing uid within the uids.
	const i = uids.findIndex(uid => uid === message.offered_uid);
	console.log("offered uid index", i); // debug

	// Check if the uid already exists within the uids before adding it.
	const uid_exists = uids.some(uid => uid === message.existing_uid);
	console.log("uid exists?", uid_exists); // debug

	// Add the new uid to the uids and remove the existing uid.
	if (!uid_exists && i > -1) {
		uids.splice(i, 1);

		uids.push(message.existing_uid);

		ws.uid = message.existing_uid;
	}
	console.log("uids", uids); // debug

	// Find if there are votes for the uid and send them back to the client.
	const existing_votes = votes.filter(vote => vote.uid === message.existing_uid);
	console.log("existing votes", existing_votes); // debug

	// Replace the WebSocket client uid.
	if (existing_votes.length) ws.send(JSON.stringify({ existing_votes }));
};

// Parse scores.
const parseScores = () => {
	Object.keys(scores).forEach(restaurant => {
		const restaurant_votes = votes.filter(vote => vote.restaurant === restaurant);
		console.log("restaurant votes", restaurant, restaurant_votes); // debug

		scores[restaurant] = restaurant_votes.reduce((total, current) => total += current.score, 0);
	});
};

// Reset votes and scores.
const resetVotes = () => {
	console.log("reset scores before", scores); // debug
	Object.keys(scores).forEach(restaurant => {
		scores[restaurant] = 0;
	});
	console.log("reset scores after", scores); // debug

	console.log("reset votes before", votes); // debug
	votes = [];
	console.log("reset votes after", votes); // debug
};

// Get the current scores.
const getScores = (message, ws) => {
	console.log("get scores", message); // debug

	// Parse scores.
	parseScores();

	ws.send(JSON.stringify({ scores }));
};

// Broadcast current scores to all connected WebSocket clients.
const broadcastVotes = clients => {
	console.log("broadcast votes", votes); // debug
	clearTimeout(broadcast_timeout);

	broadcast_timeout = setTimeout(() => {
		parseScores();

		const wss_clients = clients || Array.from(wss.clients).filter(
			client => votes.some(vote => vote.uid === client.uid)
		);
		console.log("wss clients", wss_clients.length); // debug

		wss_clients.forEach(client => {
			if (client.readyState === WebSocket.OPEN) {
				// Check if the client has voted before broadcasting to it.
				const has_voted = votes.some(vote => vote.uid === client.uid);
				console.log("has voted", has_voted, client.uid); // debug
				if (has_voted) {
					client.send(JSON.stringify({ scores }));
				}
			}
		});
	}, 500);	
};

const vote_obj = {
	init(env) {
		// Init the scores object.
		utils.restaurants.forEach(restaurant => {
			scores[restaurant] = 0;
		});

		// Open WebSocket server.
		const wss_port = env === "development" ? 80 : 1690;
		wss = new WebSocket.Server({ port: wss_port });
		console.log("wss", wss);

		// When a client connects to the WebSocket server.
		wss.on("connection", function connection(ws) {
			console.log("WebSocket connected to the server!", ws.uid);

			ws.on("message", function incoming(msg) {
				try {
					const message = JSON.parse(msg);
					console.log("message", message); 

					// If message contains vote, add it to the votes.
					if (message.type === "vote") vote(message, ws);

					// Remove vote from the given restaurant.
					else if (message.type === "remove_vote") removeVote(message, ws);

					// Replace an uid with the given uid.
					else if (message.type === "replace_uid") replaceUid(message, ws);

					// Get the current scores.
					else if (message.type === "get_scores") getScores(message, ws);
				} catch(e) {
					console.error("Error while parsing message", e);
				}
			});

			// Generate a new uid.
			const uid = ws.uid = uuidv4();
			console.log("uid", uid);

			uids.push(uid);
			console.log("uids", uids);

			// Send the user's uid.
			ws.send(JSON.stringify({ uid }));
		});

		wss.on("error", e => {
			console.error("WebSocket error:", e);
		});
	},

	// Reset votes and scores.
	resetVotes() {
		resetVotes();
	}
};

module.exports = vote_obj;
