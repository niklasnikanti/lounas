const utils = require("./utils");

const isohuvila = {
	// Get Iso-Huvila lunch.
	async getLunch() {
		// Fetch the Iso-Huvila site.
		const result = await utils.fetch(this, "https://verkatehdas.fi/ravintola/lounas");
		if (result.cached) return this.restaurants;

		const lunch_element = result.page.querySelector(".lunch-browser");

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
						price: utils.parsePrice(price)
					};
				});

				return {
					date: utils.getDate(i),
					dishes
				}
			})
		};

		// Parse the dishes.
		return restaurants;
	}
};

module.exports = isohuvila;
