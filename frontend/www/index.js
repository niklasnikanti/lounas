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

// Open a WebSocket connection.
class WS {
	constructor() {
		this.base_url = window.origin;
		console.log("base url", this.base_url);

		this.http_protocol = this.base_url.match(/^.*?(?=:)/)[0];
		console.log("http protocol", this.http_protocol); // debug

		this.ws_protocol = this.http_protocol !== "http" ? "wss" : "ws";

		this.host = this.base_url.match(/(?<=:\/\/)[^:/]*/)[0];
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
		this.ws.send(JSON.stringify({
			restaurant,
			vote: 1,
			who: "me"
		}))
	};

	// Downvote restaurant.
	downvote(restaurant) {
		this.ws.send(JSON.stringify({
			restaurant,
			vote: -1,
			who: "me"
		}))
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
		const dishes = lunch.dishes;

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

		this.vote = () => {
			this.props.active = !this.props.active;
			console.log("vote", this); // debug

			if (this.props.type === "up") this.upvote();
			else this.downvote();

			// Get the button element.
			const element = document.getElementById(this.props.id);
			if (this.props.active) element.classList.add("active");
			else element.classList.remove("active");
		}

		this.upvote = () => {
			upvote(this.props.name);
		};

		this.downvote = () => {
			downvote(this.props.name);
		};
	}

	render() {
		console.log("rendering vote button", this.props); // debug

		// Create a vote button.
		return createElement(
			"button",
			{ 
				className: `vote-btn ${ this.props.type } icon-btn`, 
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
	const lounas_cached_restaurants = localStorage.getItem("lounas_cached_restaurants");
	const cached_restaurants = lounas_cached_restaurants ? JSON.parse(lounas_cached_restaurants) : null;

	// Check if the cached restaurants is expired.
	const expired = !cached_restaurants || moment(cached_restaurants.date).isBefore(moment().subtract(1, "hours"));

	// Fetch the restaurants with lunch menus.
	let restaurants = cached_restaurants;
	if (expired) {
		restaurants = await fetch(`${origin}/lunches`);
		restaurants = await restaurants.json();
		restaurants.date = moment().format();
		localStorage.setItem("lounas_cached_restaurants", JSON.stringify(restaurants));
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

	localStorage.setItem("lounas_dark_mode", mode);
};

const upvote = restaurant => {
	console.log("upvote", restaurant); // debug

	ws.upvote(restaurant);
};

const downvote = restaurant => {
	console.log("downvote", restaurant); // debug

	ws.downvote(restaurant);
}

// Init stuff.
const init = (async () => {
	// Set dark mode from the local storage.
	const mode = localStorage.getItem("lounas_dark_mode") || "light";
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
	const previous_btn = document.querySelector(".previous-day-btn");
	previous_btn.onclick = getPreviousDay;

	const next_btn = document.querySelector(".next-day-btn");
	next_btn.onclick = getNextDay;

	// Bind the dark mode button.
	const dark_mode_btn = document.querySelector(".dark-mode-btn");
	dark_mode_btn.onclick = toggleDarkMode;

	document.body.addEventListener("keydown", keyDown);

	// Init WebSocket connection.
	ws = new WS();
	console.log("ws", ws); // debug
})();
