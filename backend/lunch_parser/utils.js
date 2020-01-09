// Collection of helper functions.
const axios = require("axios");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const sanitizeHtml = require("sanitize-html");
const moment = require("moment");
const date_format = "DD.MM.YYYY"

const utils = {
	// Fetch a website.
	async fetch(url) {
		const response = await axios.request({
			method: "get",
			url,
			timeout: 30000
		}).catch(err => {
			console.error("Error while fetching a site", url, err);
			return null;
		});
		const { data = null } = response;

		// Create a virtual DOM.
		const dom = new JSDOM(data);

		return dom;
	},

	// Clear any html from a string.
	clearHtml(html) {
		return sanitizeHtml(html, {
			allowedTags: []
		});
	},

	// Get the current week dates.
	getWeekDates() {
		const dates = this.dates || [];

		if (!this.dates) {
			for (let i = 0; i < 5; i++) {
				dates.push(moment().startOf("isoweek").add(i, "days").format(date_format));
			}
		}

		return this.dates = dates;
	},

	// Get a date of the week.
	getDate(i) {
		const dates = this.getWeekDates();

		return dates[i];
	},

	// Parse date.
	parseDate(string, format = "YYYY-MM-DD") {
		return moment(string, format).format(date_format);
	}
};


module.exports = utils;
