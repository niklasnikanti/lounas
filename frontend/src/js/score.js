"use strict";

import React from "react";

/**
 * Score for the restaurant.
 */
export class Score extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		return React.createElement(
			"span",
			{
				className: "score"
			},
			this.props.score
		)
	}
}