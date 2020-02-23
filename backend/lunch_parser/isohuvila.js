const utils = require("./utils");
const moment = require("moment");

const isohuvila = {
	// Get Iso-Huvila lunch.
	async getLunch() {
		// Fetch the Iso-Huvila site.
		const result = await utils.fetch(this, "https://verkatehdas.fi/ravintola/lounas");
		if (result.cached) return this.restaurants;

		// Get the parent lunch element.
		const lunch_element = result.page.querySelector(".lunch-browser");

		// Get lunches.
		const lunches = Array.from(lunch_element.querySelectorAll("table"));

		// Remove excess lunches.
		while (lunches.length > 5) {
			lunches.shift();
		}

		// Get dates.
		const dates = Array.from(lunch_element.querySelectorAll("h3.date"));

		// Current year argument.
		const current_year = moment().year();

		const restaurants = this.restaurants = {
			"Iso-Huvila": lunches.map((lunch, i) => {
				const dish_list = Array.from(lunch.querySelectorAll("tr"));

				const dishes = dish_list.map(dish_element => {
					const name = dish_element.querySelector(".desc").innerHTML;

					const price = dish_element.querySelector(".price").innerHTML;

					return {
						name: utils.clearHtml(name),
						price: utils.parsePrice(price)
					};
				});

				const date = `${ utils.clearHtml(dates[i].innerHTML.trim()).match(/(\d+|\.)+/)[0] }${ current_year }`;
				return {
					date: utils.parseDate(date, "DD.MM.YYYY"),
					dishes
				}
			})
		};
		console.log("Iso-Huvila lunches", restaurants); // debug

		// Parse the dishes.
		return restaurants;
	}
};

module.exports = isohuvila;
