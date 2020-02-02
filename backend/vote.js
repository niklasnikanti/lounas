const WebSocket = require("ws");
const uuidv4 = require("uuid/v4");
const votes = [];
const uids = [];

// Vote a restaurant.
const vote = message => {
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
};

// Remove a vote.
const removeVote = message => {
	// Find the vote from votes and remove it.
	const i = votes.findIndex(
		vote => vote.uid === message.uid && vote.restaurant === message.restaurant
	);
	console.log("vote index", i); // debug

	if (i < 0) return;

	// Remove the vote.
	votes.splice(i, 1);
	console.log("votes", votes); // debug
};

// Replace UID.
const replaceUid = (message, ws) => {
	console.log("replace uid", message); // debug

	// Find the existing uid within the uids.
	const i = uids.findIndex(uid => uid === message.offered_uid);
	console.log("offered uid index", i); // debug

	if (i > -1) uids.splice(i, 1);

	// Check if the uid already exists within the uids before adding it.
	const uid_exists = uids.some(uid => uid === message.existing_uid);
	console.log("uid exists?", uid_exists); // debug

	// Add the new uid to the uids.
	if (!uid_exists) uids.push(message.existing_uid);
	console.log("uids", uids); // debug

	// Find if there are votes for the uid and send them back to the client.
	const existing_votes = votes.filter(vote => vote.uid === message.existing_uid);
	console.log("existing votes", existing_votes); // debug

	if (existing_votes.length) ws.send(JSON.stringify({ existing_votes }));
};

const vote_obj = {
	init(env) {
		// Open WebSocket server.
		const wss_port = env === "development" ? 80 : 433;
		const wss = new WebSocket.Server({ port: wss_port });

		// When a client connects to the WebSocket server.
		wss.on("connection", function connection(ws) {
			console.log("WebSocket connected to the server!");

			ws.on("message", function incoming(msg) {
				try {
					const message = JSON.parse(msg);
					console.log("message", message); 

					// If message contains vote, add it to the votes.
					if (message.type === "vote") vote(message);

					else if (message.type === "remove_vote") removeVote(message);

					else if (message.type === "replace_uid") replaceUid(message, ws);
				} catch(e) {
					console.error("Error while parsing message", e);
				}
			});

			// Generate a new uid.
			const uid = uuidv4();
			console.log("uid", uid);

			uids.push(uid);
			console.log("uids", uids);

			// Send the user's uid.
			ws.send(JSON.stringify({ uid }));
		});

		wss.on("error", e => {
			console.error("WebSocket error:", e);
		});
	}
};

module.exports = vote_obj;
