"use strict";

import { react_restaurants } from "./restaurant";

let votes = [];

// Open a WebSocket connection.
export class WS {
	constructor() {
		this.base_url = window.origin;

		this.http_protocol = this.base_url.match(/^.*?(?=:)/)[0];

		this.ws_protocol = this.http_protocol !== "http" ? "wss" : "ws";

		this.host = this.base_url.match(/\/\/([^:\/]*)/)[1];

		this.port = this.ws_protocol === "ws" ? 80 : 443;

		this.url = `${ this.ws_protocol }://${ this.host }:${ this.port }/ws`;
		console.log("url", this.url); // deubg

		this.connect();
	}

	// Connect to the WebSocket server.
	connect() {
		this.ws = new WebSocket(this.url);

		// Wait for the connection to be open.
		this.ws.onopen = evt => {
			console.log("WebSocket connection is open", evt); // debug

			// Try to find any votes the user has cast and send them to the server. 
			// (In case of connection loss and reconnection)
			votes.forEach(vote => {
				const thumbs = vote.score === 1 ? "up" : "down";

				this.vote(vote.restaurant, thumbs);
			});

			if (votes.length) this.getScores();
		};

		// Listen for incoming messages from the server.
		this.ws.onmessage = msg => {
			// Try to parse the message.
			const data = JSON.parse(msg.data);

			// Server's offered uid.
			if (data.uid) {
				// Check if uid already exists.
				const uid = localStorage.getItem("uid");

				// Set uid if it doesn't exist.
				if (!uid) {
					// Store uid locally.
					localStorage.setItem("uid", data.uid);
				} else {
					// Replace the uid with the existing uid.
					this.ws.send(JSON.stringify({ 
						type: "replace_uid", 
						existing_uid: uid, 
						offered_uid: data.uid 
					}));
				}
			}

			// If the server already has votes the user has cast.
			if (data.existing_votes) {
				const { existing_votes } = data;

				votes = existing_votes;

				react_restaurants.forEach(restaurant => {
					const existing_vote = existing_votes.find(vote => vote.restaurant === restaurant.props.name);
					if (!existing_vote) return;

					const vote = existing_vote.score === 1 ? "up" : "down";
					restaurant.setState({ vote });
				});

				this.getScores();
			}

			// Server is sending the current scores.
			if (data.scores) {
				const { scores } = data;

				react_restaurants.forEach(restaurant => {
					restaurant.setState({ score: scores[restaurant.props.name] });
				});
			}
		};

		// Listen for WebSocket connection closing.
		this.ws.onclose = evt => {
			console.log("WebSocket connection closed", evt); // debug

			// Try to reconnect automatically.
			this.reconnect();
		};

		// Listen for WebSocket errors.
		this.ws.onerror = err => {
			console.error("WebSocket error", err); // debug
		};
	};

	// Try to reconnect to the WebSocket server.
	reconnect() {
		setTimeout(() => {
			if (this.ws.readyState <= WebSocket.OPEN) return;

			console.log("Trying to reconnect", this.ws.readyState); // debug

			// Connect to the WebSocket server.
			this.connect();

			// Ensure that the connection has been made.
			this.reconnect();
		}, 3000);
	};

	// Vote restaurant.
	vote(restaurant, vote) {
		const uid = localStorage.getItem("uid");

		if (vote) {
			const score = vote === "up" ? 1 : -1;

			// Find if there is already a vote with similar score.
			const similar_score = votes.filter(
				vote => vote.score === score
			);

			// If a similar score vote exists, remove it. Allow only 1 upvote and 1 downvote.
			if (similar_score.length) {
				const similar_index = votes.findIndex(
					vote => vote.timestamp === similar_score[0].timestamp
				);

				if (similar_index > -1) {
					const deleted_vote = votes.splice(similar_index, 1)[0];

					const deleted_restaurant = react_restaurants.find(
						restaurant => restaurant.props.name === deleted_vote.restaurant
					);

					deleted_restaurant.setState({ vote: null });
				}
			}

			// Check if the votes already contain a vote for the restaurant.
			const i = votes.findIndex(vote => vote.restaurant === restaurant);

			// Check if the restaurant already has an existing vote and remove it if it exists.
			if (i > -1) votes.splice(i, 1)[0];

			// Create a new vote.
			const new_vote = {
				type: "vote",
				restaurant,
				score,
				uid,
				timestamp: Date.now()
			};

			// If this vote is active, add it to the votes.
			votes.push(new_vote);

			// Up/down-vote
			this.ws.send(JSON.stringify(new_vote));
		} else {
			const i = votes.findIndex(vote => vote.restaurant === restaurant);

			if (i > -1) votes.splice(i, 1);

			// Unvote
			this.ws.send(JSON.stringify({
				type: "remove_vote",
				restaurant,
				uid
			}));
		}
	};

	// Get scores.
	getScores() {
		setTimeout(() => {
			this.ws.send(JSON.stringify({
				type: "get_scores"
			}));
		}, 1500);
	};
};

export const ws = new WS();
