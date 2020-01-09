const utils = require("./utils");
const moment = require("moment");

const reska = {
	// Parse lunches from Lounasreska.
	async getLunch() {
		const empty_restaurants = !this.restaurants || Object.keys(this.restaurants).some(
			restaurant => this.restaurants[restaurant].some(lunch => !lunch.dishes.length)
		);
		const cache_expired = moment().isAfter(moment(this.fetched).add(utils.cached_hours, "hours"));

		if (!empty_restaurants && !cache_expired) return this.restaurants;

		// Fetch the Lounasreska site.
		const dom = await utils.fetch("https://reska.fi/lounasreska").catch(err => {
			console.error("Error while fetching Reska lunches", err);
			return null;
		});

		// Parse a Reska lunch list.
		const parseReskaLunch = selector => {
			const lunches = dom ? Array.from(dom.window.document.querySelectorAll(selector)) : null;
			// Remove the weekend days from the lunches.
			if (lunches) lunches.splice(-2, 2);

			return dom ? lunches.map((lunch, i) => {
				const dish_list = lunch.querySelectorAll("tr");

				const dishes = [];
				for (let i = 0; i < dish_list.length; i += 2) {
					// Get the main element for the day.
					const main_element = dish_list[i];

					// Get the dish name element.
					const name_element = main_element.querySelector(".name");

					// Get the dish price element.
					const price_element = main_element.querySelector(".price");

					// Get the dish secondary element.
					const secondary_element = dish_list[i + 1];

					// Get the dish info.
					const info_element = secondary_element.querySelector(".info");

					const dish = name_element ? {
						name: utils.clearHtml(name_element.innerHTML),
						price: utils.clearHtml(price_element.innerHTML),
						info: utils.clearHtml(info_element.innerHTML)
					} : null;

					dishes.push(dish);
				}

				return {
					date: utils.getDate(i),
					dishes
				};
			}) : [];
		};

		// Get restaurants.
		const restaurants = this.restaurants = {
			Hällä: parseReskaLunch(".kellariravintola-halla"),
			Maja: parseReskaLunch(".ravintola-maja"),
			Popino: parseReskaLunch(".ravintola-popino"),
			Verka: parseReskaLunch(".ravintola-verka"),
			Pannu: parseReskaLunch(".cafe-pannu")
		};

		this.fetched = moment().format();

		return restaurants;
	}
};

module.exports = reska;
