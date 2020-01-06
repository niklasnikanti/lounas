const utils = require("./utils");

// Parse lunches from Lounasreska.
const getLounasReskaLunches = async () => {
	// Fetch the Lounasreska site.
	const dom = await utils.fetch("https://reska.fi/lounasreska");

	// Parse a Reska lunch list.
	const parseReskaLunch = selector => {
		const lunches = Array.from(dom.window.document.querySelectorAll(selector));
		// Remove the weekend days from the lunches.
		lunches.splice(-2, 2);

		return lunches.map((lunch, i) => {
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
		});
	};

	// Get restaurants.
	const restaurants = {
		Hällä: parseReskaLunch(".kellariravintola-halla"),
		Maja: parseReskaLunch(".ravintola-maja"),
		Popino: parseReskaLunch(".ravintola-popino"),
		Verka: parseReskaLunch(".ravintola-verka"),
		Pannu: parseReskaLunch(".cafe-pannu")
	};

	return restaurants;
};

module.exports = getLounasReskaLunches();
