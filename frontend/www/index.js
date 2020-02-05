"use strict";

const createElement = React.createElement;
let dark_mode;

// Set Moment locale to Finnish.
moment.locale("fi");

// Get the week days in the current week.
const monday = moment().startOf("isoweek");
const days = [];
for (let i = 0; i < 5; i++) {
	const date = moment(monday).add(i, "days");
	const day = {
		_date: date.format(),
		date: date.format("DD.MM.YYYY"),
		name: date.format("dddd")
	};
	days.push(day);
}

// Get the selected day.
const today = moment().format("DD.MM.YYYY");
let selected_day = {
	date: moment().format("DD.MM.YYYY")
}; 

let ws;

let votes = [];

// Open a WebSocket connection.
class WS {
	constructor() {
		this.base_url = window.origin;
		console.log("base url", this.base_url);

		this.http_protocol = this.base_url.match(/^.*?(?=:)/)[0];
		console.log("http protocol", this.http_protocol); // debug

		this.ws_protocol = this.http_protocol !== "http" ? "wss" : "ws";

		this.host = this.base_url.match(/\/\/([^:\/]*)/)[1];
		console.log("host", this.host); // debug

		this.url = `${ this.ws_protocol }://${ this.host }`;
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
			console.log("votes", votes); // debug
			votes.forEach(vote => {
				const thumbs = vote.score === 1 ? "up" : "down";
				console.log("VOTE", vote.restaurant, thumbs); // debug

				this.vote(vote.restaurant, thumbs);
			});

			if (votes.length) this.getScores();
		};

		// Listen for incoming messages from the server.
		this.ws.onmessage = msg => {
			console.log("msg", msg); // debug

			// Try to parse the message.
			const data = JSON.parse(msg.data);
			console.log("data", data); // debug

			// Server's offered uid.
			if (data.uid) {
				console.log("contains uid", data.uid); // debug

				// Check if uid already exists.
				const uid = localStorage.getItem("uid");
				console.log("uid", uid);

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
				console.log("existing votes", existing_votes); // debug

				votes = existing_votes;
				console.log("votes", votes, "react restaurants", react_restaurants); // debug

				react_restaurants.forEach(restaurant => {
					const existing_vote = existing_votes.find(vote => vote.restaurant === restaurant.props.name);
					console.log("existing vote", existing_vote); // debug
					if (!existing_vote) return;

					const vote = existing_vote.score === 1 ? "up" : "down";
					restaurant.setState({ vote });
				});

				this.getScores();
			}

			// Server is sending the current scores.
			if (data.scores) {
				const { scores } = data;
				console.log("scores", scores);

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
		console.log("vote", restaurant, vote, "uid", uid, "votes", votes); // debug

		if (vote) {
			const score = vote === "up" ? 1 : -1;

			// Find if there is already a vote with similar score.
			const similar_score = votes.filter(
				vote => vote.score === score
			);
			console.log("similar score", similar_score); // debug

			// If a similar score vote exists, remove it. Allow only 1 upvote and 1 downvote.
			if (similar_score.length) {
				const similar_index = votes.findIndex(
					vote => vote.timestamp === similar_score[0].timestamp
				);
				console.log("similar index", similar_index); // debug

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
			console.log("i", i); // debug

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
			console.log("i", i); // debug

			if (i > -1) votes.splice(i, 1);

			// Unvote
			this.ws.send(JSON.stringify({
				type: "remove_vote",
				restaurant,
				uid
			}));
		}

		votes.forEach(vote => {
			console.log("votes", vote);
		}); // debug
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

// Restaurant parent element
const react_restaurants = [];
class Restaurant extends React.Component {
	constructor(props) {
		super(props);

		this.state = {};

		this.vote = this.vote.bind(this);

		react_restaurants.push(this);
	}

	vote(v) {
		const vote = this.state.vote !== v ? v : null;
		console.log("vote", vote, this.props.name); // debug

		// Send the vote to the server.
		ws.vote(this.props.name, vote);

		this.setState({ vote });
	}

	render() {
		// Get restaurant dishes for the day.
		const lunch = this.props.lunches.find(lunch => lunch.date === selected_day.date);
		const dishes = lunch ? lunch.dishes : [];

		return createElement(
			"div",
			{ className: "restaurant" },
			createElement(
				"span",
				{ className: "name" },
				`${ this.props.name }\n`
			),

			createElement("br"),

			// Create the dishes.
			dishes.map((dish, i) => {
				return createElement(Dish, {
					key:  `${ this.props.name }${ i }`,
					name: dish.name,
					info: dish.info,
					price: dish.price
				})
			}),

			// Create vote buttons.
			createElement(
				"div",
				{ className: "vote-btn-container" },
				createElement(
					VoteButton, 
					{ 
						active: this.state.vote === "up", 
						id: `${ this.props.name }-vote-up`,
						type: "up",
						vote: this.vote
					}
				),
				createElement(
					Score,
					{
						score: this.state.score
					}
				),
				createElement(
					VoteButton, 
					{ 
						active: this.state.vote === "down", 
						id: `${ this.props.name }-vote-down`,
						type: "down",
						vote: this.vote
					}
				)
			)
		);
	}
}

// Dish element for a restaurant.
class Dish extends React.Component {
	constructor(props) {
		super(props)
	}

	render() {
		return createElement(
			"div",
			{ 
				className: "dish", 
				key: this.props.key 
			},
			createElement(
				"span",
				{ className: "name" },
				`${ this.props.name }\n`
			),

			createElement(
				"span",
				{ className: "info" },
				`${ this.props.info ? this.props.info + "\n" : "" }`
			),

			createElement(
				"span",
				{ className: "price" },
				this.props.price
			),

			createElement("br")
		)
	}
}

// Vote button for a restaurant.
class VoteButton extends React.Component {
	constructor(props) {
		super(props);

		this.state = {};

		this.vote = () => {
			this.props.vote(this.props.type);
		}
	}

	render() {
		// Create a vote button.
		return createElement(
			"button",
			{ 
				className: `vote-btn ${ this.props.active ? "active" : "" } icon-btn`, 
				id: this.props.id,
				onClick: this.vote
			},
			createElement(
				"i",
				{ className: "material-icons" },
				`thumb_${ this.props.type }`
			)
		)
	}
}

// Score for the restaurant.
class Score extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		return createElement(
			"span",
			{
				className: "score"
			},
			this.props.score
		)
	}
}

// Render the day.
const renderDay = d => {
	// Find the current day.
	selected_day = days.find(day => day.date === d);

	if (!selected_day) {
		if (moment(d).isAfter(moment(days[days.length - 1]))) {
			selected_day = days[days.length - 1];
		} else {
			selected_day = days[0];
		}
	}

	// Get the day element.
	const day_element = document.querySelector(".today");

	// Render the day element.
	ReactDOM.render(
		createElement(
			"span",
			null,
			`${ selected_day.name } ${ selected_day.date }`
		),
		day_element
	);
};

// Set the current day.
const rendered_restaurants = [];
const setDay = async d => {
	// Render the day.
	renderDay(d);

	// Check if there is cached restaurants.
	let cached_restaurants = localStorage.getItem("cached_restaurants");
	cached_restaurants = cached_restaurants ? JSON.parse(cached_restaurants) : null;

	// Check if the cached restaurants is expired.
	const expired = !cached_restaurants || moment().isAfter(moment(cached_restaurants.date).add(1, "hours"));

	// Fetch the restaurants with lunch menus.
	let restaurants = cached_restaurants;
	if (expired) {
		restaurants = await fetch("/lunches");
		restaurants = await restaurants.json();
		restaurants.date = moment().format();
		localStorage.setItem("cached_restaurants", JSON.stringify(restaurants));
	}
	restaurants = restaurants.data;

	// Get the restaurants container.
	const restaurant_container = document.querySelector(".restaurants");

	// Render the restaurants.
	ReactDOM.render(
		(() => {
			const restaurants_to_render = Object.keys(restaurants).map(key => {
				const restaurant = {
					key,
					name: key,
					lunches: restaurants[key]
				};

				const rendered_restaurant = createElement(Restaurant, restaurant);
				rendered_restaurants.push(rendered_restaurant);
				return rendered_restaurant;
			});

			console.log("restaurants to render", restaurants_to_render); // debug
			return restaurants_to_render;
		})(),

		restaurant_container
	);

	console.log("RENDERED RESTAURANTS", rendered_restaurants); // debug
};

// Get the next day.
const getNextDay = () => {
	let next_day = moment(selected_day._date).add(1, "days");
	if (moment(next_day).isAfter(moment(days[days.length - 1]))) {
		next_day = moment(days[0]._date);
	}

	setDay(next_day.format("DD.MM.YYYY"));
};

// Get the previous day.
const getPreviousDay = () => {
	let previous_day = moment(selected_day._date).subtract(1, "days");
	if (moment(previous_day).isBefore(moment(days[0]._date))) {
		previous_day = moment(days[days.length - 1]._date);
	}

	setDay(previous_day.format("DD.MM.YYYY"));
};

// Listen for key downs.
const keyDown = e => {
	const { key } = e;

	if (key === "ArrowLeft") getPreviousDay();
	else if (key === "ArrowRight") getNextDay();
};

// Toggle dark mode.
const toggleDarkMode = () => {
	dark_mode = !dark_mode;

	const mode = dark_mode ? "dark" : "light";
	setDarkMode(mode);
};

// Set dark mode.
const setDarkMode = (mode = "light") => {
	document.documentElement.style.setProperty("--background-color", `var(--background-color-${ mode }`);
	document.documentElement.style.setProperty("--foreground-color", `var(--foreground-color-${ mode }`);
	document.documentElement.style.setProperty("--btn-inactive", `var(--btn-inactive-${ mode }`);

	localStorage.setItem("dark_mode", mode);
};

// Init stuff.
const init = (async () => {
	// Set dark mode from the local storage.
	const mode = localStorage.getItem("dark_mode") || "light";
	dark_mode = mode === "dark";
	setDarkMode(mode);
	setTimeout(() => {
		document.documentElement.style.setProperty(
			"--background-transition", 
			"background-color cubic-bezier(0.46, 0.03, 0.52, 0.96) 0.15s"
		);
	}, 150);

	// Set the current day.
	setDay(selected_day.date);

	// Bind the previous and next day buttons to the day changing functions.
	const previous_btn = document.querySelector(".previous.day");
	previous_btn.onclick = getPreviousDay;

	const next_btn = document.querySelector(".next.day");
	next_btn.onclick = getNextDay;

	// Bind the dark mode button.
	const dark_mode_btn = document.querySelector(".dark-mode-btn");
	dark_mode_btn.onclick = toggleDarkMode;

	document.body.addEventListener("keydown", keyDown);

	// Init WebSocket connection.
	ws = new WS();
	console.log("ws", ws); // debug
})();
