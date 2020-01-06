// Collection of helper functions.
const axios = require("axios");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const sanitizeHtml = require("sanitize-html");
const moment = require("moment");

const utils = {
	// Fetch a website.
	async fetch(url) {
		const response = await axios.request({
			method: "get",
			url
		});
		const { data } = response;

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
				dates.push(moment().startOf("isoweek").add(i, "days").format("DD.MM.YYYY"));
			}
		}

		return this.dates = dates;
	},

	// Get a date of the week.
	getDate(i) {
		const dates = this.getWeekDates();

		return dates[i];
	}
};


module.exports = utils;
