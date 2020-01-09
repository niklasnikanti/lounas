"use strict";

const create = React.createElement;
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

// Restaurant parent element
class Restaurant extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		const lunch = this.props.lunches.find(lunch => lunch.date === selected_day.date);
		const dishes = lunch.dishes;

		return create(
			"div",
			{ className: "restaurant" },
			create(
				"span",
				{ className: "name" },
				`${ this.props.name }\n`
			),

			create("br"),

			dishes.map((dish, i) => {
				return create(
					"div",
					{ 
						className: "dish", 
						key: `${ this.props.name }${ i }` 
					},
					create(
						"span",
						{ className: "name" },
						`${dish.name}\n`
					),

					create(
						"span",
						{ className: "info" },
						`${ dish.info ? dish.info + "\n" : "" }`
					),

					create(
						"span",
						{ className: "price" },
						`${ dish.price || "" }\n`
					),

					create("br")
				)
			})
		);
	}
}

// Set the current day.
const setDay = async d => {
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

	ReactDOM.render(
		create(
			"span",
			null,
			`${ selected_day.name } ${ selected_day.date }`
		),
		day_element
	);

	// Check if there is cached restaurants.
	const lounas_cached_restaurants = localStorage.getItem("lounas_cached_restaurants");
	const cached_restaurants = lounas_cached_restaurants ? JSON.parse(lounas_cached_restaurants) : null;

	// Check if the cached restaurants is expired.
	const expired = !cached_restaurants || moment(cached_restaurants.date).isBefore(moment().subtract(24, "hours"));

	// Fetch the restaurants with lunch menus.
	let restaurants;
	if (expired) {
		restaurants = await fetch(`${origin}/lunches`);
		restaurants = await restaurants.json();
		restaurants.date = moment().format();
		localStorage.setItem("lounas_cached_restaurants", JSON.stringify(restaurants));
	} else {
		restaurants = cached_restaurants;
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

				return create(Restaurant, restaurant);
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

(() => {
	console.log("kikkeli");
})();

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
})();
