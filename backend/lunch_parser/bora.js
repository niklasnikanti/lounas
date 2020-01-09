const utils = require("./utils");
const moment = require("moment");

const bora = {
	// Get Bora lunch.
	async getLunch() {
		const empty_restaurants = !this.restaurants || Object.keys(this.restaurants).some(
			restaurant => this.restaurants[restaurant].some(lunch => !lunch.dishes.length)
		);
		const cache_expired = moment().isAfter(moment(this.fetched).add(utils.cached_hours, "hours"));

		if (!empty_restaurants && !cache_expired) return this.restaurants;

		// Fetch the Bora site.
		const dom = await utils.fetch("http://www.bora.fi");

		const lunch_container = dom.window.document.querySelector("tbody");

		const lunch_elements = Array.from(lunch_container.querySelectorAll("tr"));
		// Remove two useless elements from the start and the end.
		lunch_elements.splice(0, 2);
		lunch_elements.splice(-2, 2);

		const lunches = [];

		for (let i = 0; i < lunch_elements.length; i += 3) {
			const price_element = lunch_elements[i];

			// Parse the price (what a mess).
			const raw_price = price_element.querySelector("td[align=right]");
			const price = raw_price.innerHTML.replace(/<\/?strong>|&nbsp;/g, "");

			// Parse the dish row.
			const dish_element = lunch_elements[i + 1];

			// Get the dish element.
			const raw_dish = dish_element.querySelector("td");

			const dish_list_raw = raw_dish.innerHTML.replace(/<\/?span[^<>\/]*>/g, "");

			const dish_list = dish_list_raw.split("<br>").filter(dish => dish.length);

			const dishes = dish_list.map(dish => ({
				name: utils.clearHtml(dish),
				price: utils.clearHtml(price)
			}))

			lunches.push({
				date: utils.getDate(i / 3),
				dishes
			});
		}

		const restaurants = this.restaurants = { Bora: lunches };

		this.fetched = moment().format();

		return restaurants;
	}
};


module.exports = bora;
