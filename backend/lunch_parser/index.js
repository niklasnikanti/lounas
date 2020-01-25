const moment = require("moment");
	  moment.locale("fi");
const utils = require("./utils");

// The order to send back the resturants to the client.
const order = ["Iso-Huvila", "Palmia", "Verka", "Hällä", "Maja", "Popino", "Pannu", "Bora"];

// How many hours are the restaurants cached before trying to fetch them again.
const cached_hours = 12;

// Restaurant parsers.
const reska = require("./reska");
const isohuvila = require("./isohuvila");
const palmia = require("./palmia");
const bora = require("./bora");

// Restaurant votes.
const votes = [];

// Let the lunch parsing commence!
const lunchParser = {
	votes,

	// Fetch the lunches from the lunch sites.
	async fetchLunches() {
		let lunches = this.lunches || { data: {} };
		const timestamp = Date.now(); // debug

		// Fetch the lunches.
		const all_lunches = await Promise.all([
			{ ...await reska.getLunch() },
			{ ...await isohuvila.getLunch() },
			{ ...await palmia.getLunch() },
			{ ...await bora.getLunch() }
		]);

		all_lunches.forEach(lunch => {
			Object.keys(lunch).forEach(restaurant => {
				lunches.data[restaurant] = lunch[restaurant];
			});
		});
		console.log("fetched in", Date.now() - timestamp); // debug

		// Pad empty lunches.
		Object.keys(lunches.data).forEach(lunch => {
			const restaurant = lunches.data[lunch];
			
			for (let i = 0; i < 5; i++) {
				const date = utils.getDate(i);
				const restaurant_date = restaurant && restaurant.length ? restaurant.find(r => r.date === date) : null;

				if (!restaurant_date) {
					restaurant.push({
						date,
						dishes: []
					})
				}
			}
		});

		this.fetched = moment().format();

		// Order the restaurants.
		const ordered_lunches = {};
		order.forEach(o => {
			ordered_lunches[o] = lunches.data[o];
		});

		const payload = {
			data: ordered_lunches,
			date: moment().format()
		};

		return this.lunches = payload;
	},

	// Serve the lunches from the cache or fetch them.
	async getLunches() {
		return await this.fetchLunches();
	}
}; 

// Auto fetch lunch at 10:00 each day.
const autoFetch = async () => {
	await lunchParser.fetchLunches();

	const hours = moment().hours();
	const minutes = moment().minutes();
	const total_hours = hours + ( minutes / 60 );
	console.log("auto fetch total hours", total_hours,);

	// Get the timeout in hours.
	let timeout = 10 - total_hours;
	if (timeout < 0) timeout = 24 + timeout;

	// Ensure the timeout is at least 1 minute in milliseconds.
	const total_timeout = Math.max(timeout * 1000 * 60 * 60, 60000);
	setTimeout(autoFetch, total_timeout);
};
autoFetch();

module.exports = lunchParser;
