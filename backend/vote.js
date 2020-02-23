const WebSocket = require("ws");
const uuidv4 = require("uuid/v4");
const utils = require("./lunch_parser/utils");
const moment = require("moment");

// The current voting session.
let vote_session = {};

// Registered votes.
let votes = [];

// Registered uids.
const uids = [];

// The WebSocket server.
let wss;

// Global timer used to throttle WebSocket broadcasts.
let broadcast_timeout;

// Check if the current voting session is active.
const isVotingActive = () => {
	const active = vote_session.locks_at && !moment().isAfter(moment(vote_session.locks_at));
	console.log("is voting active", active); // debug
	return active;
};

// Check if the voting has locked.
const isVotingLocked = () => {
	const locked = !hasVotingEnded() && vote_session.locks_at && moment().isAfter(moment(vote_session.locks_at));
	console.log("is voting locked", locked); // debug
	return locked;
};

// Check if the voting has ended.
const hasVotingEnded = () => {
	const ended = vote_session.ends_at && moment().isAfter(moment(vote_session.ends_at));
	console.log("has voting ended", ended); // debug
	return ended;
};

// Lock the current voting session.
const lockVotingSession = () => {
	console.log("lock voting session"); // debug
	broadcastVotes();
};

// End the current voting session.
const endVotingSession = () => {
	console.log("end voting session"); // debug
	// Reset the votes.
	resetVotes();

	// Broadcast votes to reset the client votes.
	broadcastVotes();
};

// Start a voting session.
const startVotingSession = () => {
	resetVotes();

	// Voting session parameters.
	const locks_after = 10;
	const ends_after = 20;

	vote_session = {
		started_at: moment().format(),
		locks_at: moment().add(locks_after, "seconds").format(),
		ends_at: moment().add(ends_after, "seconds").format()
	};

	// Set timeout to lock the voting session.
	setTimeout(() => {
		lockVotingSession();
	}, locks_after * 1000);

	// Set timeout to end the voting session.
	setTimeout(() => {
		endVotingSession();
	}, ends_after * 1000);

	console.log("start voting session", vote_session); // debug

	// Broadcast voting session.
	wss.clients.forEach(client => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(
				JSON.stringify({ 
					vote_session: {
						started_at: vote_session.started_at,
						locks_at: vote_session.locks_at,
						ends_at: vote_session.ends_at,
						timestamp: moment().format()
					} 
				})
			);
		}
	});
};

// Reset votes and scores.
const resetVotes = () => {
	console.log("reset votes before", votes); // debug
	votes = [];
	console.log("reset votes after", votes); // debug
};

// Vote a restaurant.
const vote = (message, ws) => {
	// Check if the voting is locked.
	if (isVotingLocked()) return;

	if (!isVotingActive() || hasVotingEnded()) startVotingSession();

	// Check that the score is a valid number.
	if (isNaN(message.score)) return;

	// Ensure that the message score is 1 or -1.
	if (message.score < 1) message.score = -1;
	else message.score = 1;

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
	console.log("vote index", i); // debug

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

	// Mark that the client has voted.
	ws.voted = true;

	//broadcastVotes();
};

// Remove a vote.
const removeVote = (message, ws) => {
	// Find the vote from votes and remove it.
	const i = votes.findIndex(
		vote => vote.uid === message.uid && vote.restaurant === message.restaurant
	);
	console.log("unvote index", i); // debug

	if (i < 0) return;

	// Remove the vote.
	votes.splice(i, 1);

	//broadcastVotes();
};

// Find client's existing votes and send them to the client.
const sendClientVotes = uid => {
	// Find if there are votes for the uid and send them back to the client.
	const existing_votes = votes.filter(vote => vote.uid === uid);
	console.log("existing votes", existing_votes); // debug

	// Replace the WebSocket client uid.
	if (!existing_votes.length) return;

	const ws = Array.from(wss.clients).find(client => client.uid === uid);
	console.log("ws", ws); // debug

	ws.voted = true;

	ws.send(JSON.stringify({ existing_votes }));
};

// Replace UID.
const replaceUid = (message, ws) => {
	console.log("replace uid", message); // debug

	// Find the existing uid within the uids.
	const i = uids.findIndex(uid => uid === message.offered_uid);
	console.log("offered uid index", i); // debug

	// Remove the offered uid.
	if (i > -1) {
		uids.splice(i, 1);
	}

	// Check if the uid already exists within the uids before adding it.
	const uid_exists = uids.some(uid => uid === message.existing_uid);
	console.log("uid exists?", uid_exists); // debug

	// Add the new uid to the uids and remove the existing uid.
	if (!uid_exists && i > -1) {
		uids.push(message.existing_uid);

		ws.uid = message.existing_uid;
	} 
	console.log("uids", uids); // debug

	// Find if there are votes for the uid and send them back to the client.
	sendClientVotes(ws.uid);
};

// Parse scores.
const parseScores = () => {
	const scores = {};

	utils.restaurants.forEach(restaurant => {
		const restaurant_votes = votes.filter(vote => vote.restaurant === restaurant);

		if (restaurant_votes.length) {
			scores[restaurant] = restaurant_votes.reduce((total, current) => total += current.score, 0);
		}
	});
	console.log("scores", scores); // debug

	return scores;
};

// Get the current scores.
const getScores = (message, ws) => {
	console.log("get scores", message); // debug

	if (isVotingActive()) return;

	// Parse scores.
	const scores = parseScores();

	ws.send(JSON.stringify({ scores }));
};

// Broadcast current scores to all connected WebSocket clients.
const broadcastVotes = () => {
	console.log("broadcast votes", votes); // debug
	clearTimeout(broadcast_timeout);

	broadcast_timeout = setTimeout(() => {
		const scores = parseScores();

		// Check if the client has voted before broadcasting to it.
		const wss_clients = Array.from(wss.clients).filter(
			client => client.voted
		);
		console.log("wss clients", wss_clients.length, wss_clients.map(client => client.uid)); // debug

		wss_clients.forEach(client => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify({ scores }));
			}
		});
	}, 500);	
};

const vote_obj = {
	init(env) {
		// Open WebSocket server.
		const port = env === "development" ? 80 : 1420;
		wss = new WebSocket.Server({ port, path: "/ws" });

		// When a client connects to the WebSocket server.
		wss.on("connection", function connection(ws) {
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
			ws.uid = uuidv4();
			console.log("WebSocket connected to the server!", ws.uid);

			uids.push(ws.uid);
			console.log("uids", uids);

			// Send the user's uid.
			ws.send(JSON.stringify({ uid: ws.uid }));
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
