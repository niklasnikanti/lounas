const utils = require("./utils");

const verka = {
	// Get Verka lunch.
	async getLunch() {
		// Fetch the Palmia Keinusaari site.
		const result = await utils.fetch(this, "https://www.ravintolaverka.fi/lounas");
		if (result.cached) return this.restaurants;

		// Parse the price.
		const price_element = result.page.querySelector("#sisaltoPad2 .col-sm-8 > p:nth-child(5) > em");

		const price = utils.parsePrice(price_element.innerHTML.match(/(\d|,)+€/)[0]);
		console.log("price", price);
		
		// Parse the lunches.
		const lunch_container = result.page.querySelector(".panel-collapse.collapse-news.collapse.in > .panel-body");

		const lunch_elements = Array.from(lunch_container.querySelectorAll("p"));

		const weekdays = ["maanantai", "tiistai", "keskiviikko", "torstai", "perjantai"];

		// Remove the unneeded elements.
		lunch_elements.splice(0, 1);
		lunch_elements.splice(-2, 2);

		const monday = lunch_elements.splice(0, 1)[0];
		console.log("monday", monday, monday.innerHTML); // debug
		lunch_elements.splice(0, 1);

		const lunches = [{
			date: utils.getDate(0),
			dishes: [{ name: utils.clearHtml(monday.innerHTML) }]
		}];
		console.log("lunches", lunches); // debug

		let lunch = {};
		for (let lunch_element of lunch_elements) {
			const week_day = lunch_element.innerHTML.toLowerCase();

			const i = weekdays.findIndex(day => day === week_day);
			console.log("i", i); // debug

			if (i > -1) {
				console.log("week day", week_day);
				lunch.date = utils.getDate(i);

				lunch.dishes = [];
			} else if (lunch_element.innerHTML !== "&nbsp;") {
				const dish = {
					name: utils.clearHtml(lunch_element.innerHTML),
					price
				};

				lunch.dishes.push(dish);
			} else {
				// Push the dish the lunches.
				lunches.push(JSON.parse(JSON.stringify(lunch)));
			}
		}

		const restaurants = this.restaurants = { Verka: lunches };
		console.log("restaurants", restaurants); // debug

		return restaurants;
	}
};

module.exports = verka;
