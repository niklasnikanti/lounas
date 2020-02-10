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
		
		// Parse the lunches.
		const lunch_container = result.page.querySelector(".panel-collapse.collapse-news.collapse.in > .panel-body");

		const lunch_elements = Array.from(lunch_container.querySelectorAll("p"));

		const weekdays = ["maanantai", "tiistai", "keskiviikko", "torstai", "perjantai"];

		// Remove the unneeded elements.
		lunch_elements.splice(-2, 2);
		const lunches = [];
		let lunch = {};

		lunch_elements.forEach((lunch_element, index) => {
			const week_day_element = lunch_element.querySelector("*:not(br)");
			const week_day = week_day_element ? week_day_element.innerHTML.toLowerCase() : "";

			const i = weekdays.findIndex(day => week_day.includes(day));

			if (i > -1) {
				if (i > 0) {
					// Push the dish the lunches.
					lunches.push(JSON.parse(JSON.stringify(lunch)));
					lunch = {};
				} 

				lunch.date = utils.getDate(i);

				lunch.dishes = [];
				if (i === 0) {
					lunch.dishes.push({ 
						name: utils.clearHtml(week_day_element.innerHTML)
					});
				}
			} else if (week_day) {
				const dish = {
					name: utils.clearHtml(lunch_element.innerHTML),
					price
				};

				lunch.dishes.push(dish);
			} else if (index === lunch_elements.length - 1) {
				lunches.push(lunch)
			}
		});

		const restaurants = this.restaurants = { Verka: lunches };

		return restaurants;
	}
};

module.exports = verka;
