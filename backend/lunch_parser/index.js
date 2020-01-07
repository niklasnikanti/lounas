const moment = require("moment");
const utils = require("./utils");
const order = ["Iso-Huvila", "Verka", "Palmia", "Hällä", "Maja", "Popino", "Pannu", "Bora"];
const cached_hours = 24;

// Let the lunch parsing commence!
const lunchParser = {
	// Fetch the lunches from the lunch sites.
	async fetchLunches() {
		let lunches = this.lunches || { };

		// Parse lunches from Lounasreska.
	 	lunches = { ...await require("./reska") };

		// Get Iso-Huvila lunch.
		lunches["Iso-Huvila"] = await require("./isohuvila");

		// Get Palmia Keinusaari lunch.
		lunches["Palmia"] = await require("./palmia");

		// Get Bora lunch.
		lunches["Bora"] = await require("./bora");

		// Pad empty lunches.
		Object.keys(lunches).forEach(lunch => {
			const restaurant = lunches[lunch];
			
			for (let i = 0; i < 5; i++) {
				const date = utils.getDate(i);
				const restaurant_date = restaurant.find(r => r.date === date);

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
			ordered_lunches[o] = lunches[o];
		});

		const payload = {
			data: ordered_lunches,
			date: moment().format()
		};

		return this.lunches = payload;
	},

	// Serve the lunches from the cache or fetch them.
	async getLunches() {
		// Lunch is cached for an hour before refetching.
		const cache_expired = moment().isAfter(moment(this.fetched).add(cached_hours, "hours"));
 		if (!this.lunches || cache_expired) return await this.fetchLunches();
 		else return this.lunches;
	}
}; 

// Auto fetch lunch at 10:00 each day.
const autoFetch = async () => {
	await lunchParser.fetchLunches();

	const hours = moment().hours();
	const minutes = moment().minutes();
	const total_hours = hours + ( minutes / 60 );
	console.log("auto fetch total hours", total_hours);

	let timeout = 10 - total_hours;
	if (timeout < 0) timeout = cached_hours + timeout;

	setTimeout(autoFetch, timeout * 1000 * 60 * 60);
};
autoFetch();

module.exports = lunchParser;
