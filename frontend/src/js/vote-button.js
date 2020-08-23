"use strict";

import React from "react";

/**
 * Vote button for a restaurant.
 */
export class VoteButton extends React.Component {
	constructor(props) {
		super(props);

		this.state = {};

		this.vote = () => {
			this.props.vote(this.props.type);
		}
	}

	render() {
		// Create a vote button.
		return React.createElement(
			"button",
			{ 
				className: `vote-btn ${ this.props.active ? "active" : "" } icon-btn`, 
				id: this.props.id,
				onClick: this.vote
			},
			React.createElement(
				"i",
				{ className: "material-icons" },
				`thumb_${ this.props.type }`
			)
		)
	}
}
