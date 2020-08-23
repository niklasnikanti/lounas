"use strict";

import { Restaurant } from "./js/restaurant";
import React from "react";
import ReactDOM from "react-dom";
import moment from "moment";

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
export const today = moment().format("DD.MM.YYYY");
export let selected_day = {
	date: today
}; 

// Render the day.
const renderDay = d => {
	// Find the current day.
	selected_day = days.find(day => day.date === d);

	if (!selected_day) {
		const date_format = "DD.MM.YYYY";

		// Select the last day if today is after the last day in the week days.
		if (moment(d, date_format).isAfter(moment(days[days.length - 1].date, date_format))) {
			selected_day = days[days.length - 1];
		} else {
			selected_day = days[0];
		}
	}

	// Get the day element.
	const day_element = document.querySelector(".today");

	// Render the day element.
	ReactDOM.render(
		React.createElement(
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

				const rendered_restaurant = React.createElement(Restaurant, restaurant);
				return rendered_restaurant;
			});

			return restaurants_to_render;
		})(),

		restaurant_container
	);
};


// Get the previous day.
const getPreviousDay = () => {
	let previous_day = moment(selected_day._date).subtract(1, "days");
	if (moment(previous_day).isBefore(moment(days[0]._date))) {
		previous_day = moment(days[days.length - 1]._date);
	}

	setDay(previous_day.format("DD.MM.YYYY"));
};

// Get the next day.
const getNextDay = () => {
	let next_day = moment(selected_day._date).add(1, "days");
	if (moment(next_day).isAfter(moment(days[days.length - 1]))) {
		next_day = moment(days[0]._date);
	}

	setDay(next_day.format("DD.MM.YYYY"));
};

// Get the current day.
const getCurrentDay = evt => {
	evt.preventDefault();
	setDay(today);
};

// Listen for key downs.
const keyDown = evt => {
	const { key } = evt;

	if (key === "ArrowLeft") getPreviousDay();
	else if (key === "ArrowRight") getNextDay();
	else if (key === " ") getCurrentDay(evt);
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
})();
