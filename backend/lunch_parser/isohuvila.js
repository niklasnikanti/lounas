const utils = require("./utils");

// Get Iso-Huvila lunch.
const getIsoHuvilaLunch = async () => {
	// Fetch the Iso-Huvila site.
	const dom = await utils.fetch("https://verkatehdas.fi/ravintola/lounas");

	const lunch_element = dom.window.document.querySelector(".lunch-browser");

	const lunches = Array.from(lunch_element.querySelectorAll("table"));
	// Remove the first element because it is the current day lunch already in the array.
	lunches.shift();

	// Parse the dishes.
	return lunches.map((lunch, i) => {
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

module.exports = getIsoHuvilaLunch();
