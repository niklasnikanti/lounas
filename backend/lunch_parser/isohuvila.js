const utils = require("./utils");
const moment = require("moment");

const isohuvila = {
	// Get Iso-Huvila lunch.
	async getLunch() {
		const empty_restaurants = !this.restaurants || Object.keys(this.restaurants).some(
			restaurant => this.restaurants[restaurant].some(lunch => !lunch.dishes.length)
		);
		const cache_expired = moment().isAfter(moment(this.fetched).add(utils.cached_hours, "hours"));

		if (!empty_restaurants && !cache_expired) return this.restaurants;

		// Fetch the Iso-Huvila site.
		const dom = await utils.fetch("https://verkatehdas.fi/ravintola/lounas");

		const lunch_element = dom.window.document.querySelector(".lunch-browser");

		const lunches = Array.from(lunch_element.querySelectorAll("table"));
		// Remove the first element because it is the current day lunch already in the array.
		lunches.shift();

		const restaurants = this.restaurants = {
			"Iso-Huvila": lunches.map((lunch, i) => {
				const dish_list = Array.from(lunch.querySelectorAll("tr"));


				const dishes = dish_list.map(dish_element => {
					const name = dish_element.querySelector(".desc").innerHTML;

					const price = dish_element.querySelector(".price").innerHTML;

					return {
						name: utils.clearHtml(name),
						price: utils.clearHtml(price)
					};
				});

				return {
					date: utils.getDate(i),
					dishes
				}
			})
		};

		this.fetched = moment().format();

		// Parse the dishes.
		return restaurants;
	}
};


module.exports = isohuvila;
