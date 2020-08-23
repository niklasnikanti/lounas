"use strict";

import React from "react";

/**
 * Dish element for a restaurant.
 */
export class Dish extends React.Component {
	constructor(props) {
		super(props)
	}

	render() {
		return React.createElement(
			"div",
			{ 
				className: "dish"
			},
			React.createElement(
				"span",
				{ className: "name" },
				`${ this.props.name }\n`
			),

			React.createElement(
				"span",
				{ className: "info" },
				`${ this.props.info ? this.props.info + "\n" : "" }`
			),

			React.createElement(
				"span",
				{ className: "price" },
				this.props.price
			),

			React.createElement("br")
		)
	}
}