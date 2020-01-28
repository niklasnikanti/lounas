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

			this.ws.send(JSON.stringify({ msg: "hey" }));
		};

		// Listen for incoming messages from the server.
		this.ws.onmessage = msg => {
			console.log("msg", msg); // debug

			// Try to parse the message.
			const data = JSON.parse(msg.data);
			console.log("data", data); // debug

			if (data.uid) {
				console.log("contains uid", data.uid); // debug

				// Check if uid already exists.
				const uid = localStorage.getItem("uid");
				console.log("uid", uid);

				// Set uid if it doesn't exist.
				if (!uid) {
					// Store uid locally.
					localStorage.setItem("uid", data.uid);
				}
				
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
			console.log("reconnect", this.ws.readyState, WebSocket.OPEN); // debug
			if (this.ws.readyState > WebSocket.OPEN) {
				// Connect to the WebSocket server.
				this.connect();

				// Ensure that the connection has been made.s
				this.reconnect();
			}
		}, 3000);
	};

	// Upvote restaurant.
	upvote(restaurant) {
		const uid = localStorage.getItem("uid");
		console.log("upvote", restaurant, "uid", uid); // debug

		this.ws.send(JSON.stringify({
			type: "vote",
			restaurant,
			vote: 1,
			uid
		}));
	};

	// Downvote restaurant.
	downvote(restaurant) {
		const uid = localStorage.getItem("uid");
		console.log("downvote", restaurant, "uid", uid); // debug

		this.ws.send(JSON.stringify({
			type: "vote",
			restaurant,
			vote: -1,
			uid
		}));
	};

	// Remove upvote from restaurant.
	removeVote(restaurant) {
		const uid = localStorage.getItem("uid");
		console.log("remove vote", restaurant, "uid", uid); // debug

		this.ws.send(JSON.stringify({
			type: "remove_vote",
			restaurant,
			uid
		}));
	}
};

// Restaurant parent element
class Restaurant extends React.Component {
	constructor(props) {
		super(props);
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
					{ name: this.props.name, type: "up", id: `${ this.props.name }-vote-up` }
				),
				createElement(
					VoteButton, 
					{ name: this.props.name, type: "down", id: `${ this.props.name }-vote-down` }
				)
			)
		);
	}
}

// Dish element for a restaurant.
class Dish extends Restaurant {
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
class VoteButton extends Restaurant {
	constructor(props) {
		super(props);

		this.state = {};

		this.vote = () => {
			const active = !this.state.active;
			console.log("vote", this); // debug

			if (this.props.type === "up") {
				if (active) this.upvote();
				else this.removeVote();
			}
			else {
				if (active) this.downvote();
				else this.removeVote();
			}

			const new_vote = {
				vote: this.props.type === "up" ? 1 : -1,
				restaurant: this.props.name,
				timestamp: Date.now(),
				id: this.props.id
			};

			const i = votes.findIndex(vote => vote.restaurant === new_vote.restaurant);
			console.log("i", i); // debug

			const existing_vote = votes[i];
			console.log("existing vote", existing_vote); // debug
			if (existing_vote) {
				// Find the vote button element.
				// const element = document.getElementById(existing_vote.id);
				// console.log("element", element); // debug

				// element.classList.remove("active");
				votes.splice(i, 1);
			}

			// If this vote is active, add it to the votes.
			if (active) {
				votes.push(new_vote);
			}

			console.log("votes", votes); // debug

			// const element = document.getElementById(this.props.id);
			// if (active) element.classList.add("active");
			// else element.classList.remove("active");

			// Set the button's state.
			this.setState({ active });

			// TODO: Sync frontend voting with the backend.
			// eg. If restaurant is already upvoted and then downvoted, remove the upvote in the frontend.
			// eg. If the user has already 2 votes and voting, remove the oldest vote.
		}

		this.upvote = () => {
			upvote(this.props.name);
		};

		this.downvote = () => {
			downvote(this.props.name);
		};

		this.removeVote = () => {
			removeVote(this.props.name);
		}
	}

	render() {
		console.log("rendering vote button", this.props); // debug

		// Create a vote button.
		return createElement(
			"button",
			{ 
				className: `vote-btn ${ this.props.type } ${ this.state.active ? "active" : "" } icon-btn`, 
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

				return createElement(Restaurant, restaurant);
			});

			console.log("restaurants to render", restaurants_to_render); // debug
			return restaurants_to_render;
		})(),

		restaurant_container
	);
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

	localStorage.setItem("dark_mode", mode);
};

// Upvote restaurant.
const upvote = restaurant => {
	console.log("upvote", restaurant); // debug
	ws.upvote(restaurant);
};

// Downvote restaurant.
const downvote = restaurant => {
	console.log("downvote", restaurant); // debug
	ws.downvote(restaurant);
};

// Remove vote from restaurant.
const removeVote = restaurant => {
	console.log("remove vote", restaurant); // debug
	ws.removeVote(restaurant);
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
