const moment = require("moment");
const utils = require("./utils");

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

		return this.lunches = lunches;
	},

	// Serve the lunches from the cache or fetch them.
	async getLunches() {
		// Lunch is cached for an hour before refetching.
		const cache_expired = moment().isAfter(moment(this.fetched).add(1, "hours"));
 		if (!this.lunches || cache_expired) return await this.fetchLunches();
 		else return this.lunches;
	}
}; 

module.exports = lunchParser;
