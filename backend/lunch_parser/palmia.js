const utils = require("./utils");

// Get Palmia Keinusaari lunch.
const getPalmiaLunch = async () => {
	// Fetch the Palmia Keinusaari site.
	const dom = await utils.fetch("https://ruoka.palmia.fi/fi/ravintola/ravintola/keinusaari");

	// Parse the prices.
	const price_element = dom.window.document.querySelector(".invidual-restaurant-lead-paragraph");
	const price_strings = ["päivän kotiruoka", "keittolounas", "salaattilounas"];

	const prices = price_strings.map(price_string => {
		const regex = new RegExp(`${price_string} (\\d|,)+`);
		const match = price_element.innerHTML.match(regex)[0];
		return match.match(/(\d|,)+/)[0];
	});

	// Parse the lunches.
	const lunch_element = dom.window.document.querySelector(".invidual-restaurant-menu-list-week");
	const lunches = Array.from(lunch_element.querySelectorAll(".menu-list-day"));

	// Parse the dishes.
	return lunches.map((lunch, i) => {
		const dish_list = Array.from(lunch.querySelectorAll("[data-meal]"));

		const dishes = dish_list.map((dish_element, i) => {
			const name_element = dish_element.querySelector(".invidual-restaurant-meal-of-day");

			const info_element = dish_element.querySelector(".invidual-restaurant-meal-name");

			return {
				name: utils.clearHtml(name_element.innerHTML),
				info: utils.clearHtml(info_element.innerHTML),
				...(i < 3 && { price: utils.clearHtml(prices[i]) })
			};
		});

		return {
			date: utils.getDate(i),
			dishes
		};
	});
};

module.exports = getPalmiaLunch();
