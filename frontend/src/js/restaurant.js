"use strict";

import { VoteButton } from "./vote-button";
import { Score } from "./score";
import { Dish } from "./dish";
import { ws } from "./ws";
import React from "react";
import moment from "moment";
import { today, selected_day } from "../";

export const react_restaurants = [];

/**
 * Restaurant parent element
 */
export class Restaurant extends React.Component {
	constructor(props) {
		super(props);

		this.state = {};

		this.vote = this.vote.bind(this);

		react_restaurants.push(this);
	}

	vote(v) {
		const vote = this.state.vote !== v ? v : null;

		// Send the vote to the server.
		ws.vote(this.props.name, vote);

		this.setState({ vote });
	}

	render() {
		// Get restaurant dishes for the day.
		const lunch = this.props.lunches.find(lunch => lunch.date === selected_day.date);
		const dishes = lunch ? lunch.dishes : [];

		return React.createElement(
			"div",
			{ className: "restaurant" },
			React.createElement(
				"span",
				{ className: "name" },
				`${ this.props.name }\n`
			),

			React.createElement("br"),

			// Create the dishes.
			dishes.map((dish, i) => {
				return React.createElement(Dish, {
					key:  `${ this.props.name }${ i }`,
					name: dish.name,
					info: dish.info,
					price: dish.price
				})
			}),

			// Create vote buttons.
			React.createElement(
				"div",
				{ className: "vote-btn-container" },
				React.createElement(
					VoteButton, 
					{ 
						active: this.state.vote === "up", 
						id: `${ this.props.name }-vote-up`,
						type: "up",
						vote: this.vote
					}
				),
				React.createElement(
					Score,
					{
						score: this.state.score
					}
				),
				React.createElement(
					VoteButton, 
					{ 
						active: this.state.vote === "down", 
						id: `${ this.props.name }-vote-down`,
						type: "down",
						vote: this.vote
					}
				)
			)
		);
	}
}
