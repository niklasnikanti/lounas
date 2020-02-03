// Collection of helper functions.
const axios = require("axios");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const sanitizeHtml = require("sanitize-html");
const moment = require("moment");
	  moment.locale("fi");
const date_format = "DD.MM.YYYY";
const cached_hours = 12;

const utils = {
	cached_hours,

	// Fetch a website.
	async fetch(parser, url) {
		const cache_expired = parser.fetched ? moment().isAfter(moment(parser.fetched).add(cached_hours, "hours")) : true;
		console.log("cache expired", cache_expired, url, "fetched", parser.fetched); // debug

		if (!cache_expired) return {
			cached: true,
			restaurants: parser.restaurants
		};

		const response = await axios.request({
			method: "get",
			url,
			timeout: 5000
		}).catch(err => {
			console.error("Error while fetching a site", url, err);
			return null;
		});
		const { data } = response || {};

		// Create a virtual DOM.
		const dom = new JSDOM(data);

		// Add the fetch timestamp to the parser.
		parser.fetched = moment().format();

		// Return the fetched page as a HTML document.
		return {
			page: dom.window.document
		};
	},

	// Clear any html from a string.
	clearHtml(html) {
		let sanitized_html = sanitizeHtml(html, {
			allowedTags: []
		});

		sanitized_html = sanitized_html.replace(/&amp;/g, "&");

		return sanitized_html;
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
