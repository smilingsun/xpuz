"use strict";

/**
 * IPUZ file parser.
 *
 * @module xpuz/parsers/ipuz
 */

var fs     = require('fs');
var _      = require('lodash');
var Q      = require('q');
var Puzzle = require('../lib/puzzle');

var BLOCK_VALUE = '#';

function _checkDimensions(puzzle) {
	var errors = [];

	var maxCellWidth = _.max(
		puzzle.puzzle,
		'length'
	).length;

	var numRows = puzzle.puzzle.length;

	if (maxCellWidth > puzzle.dimensions.width) {
		errors.push('Too many puzzle cells (' + maxCellWidth +
			') for puzzle width (' + puzzle.dimensions.width + ')');
	}

	if (numRows > puzzle.dimensions.height) {
		errors.push('Too many puzzle cells (' + numRows +
			') for puzzle height (' + puzzle.dimensions.height + ')');
	}

	return errors;
}

function _getClueNumber(cell) {
	return _.isObject(cell) ?
		cell.cell :
		cell;
}

function _convertPuzzle(ipuz) {
	function _addClue(obj, clue) {
		obj[clue[0]] = clue[1];

		return obj;
	}

	var puzzle = new Puzzle({
		title: ipuz.title,
		author: ipuz.author,
		copyright: ipuz.copyright,
		publisher: ipuz.publisher,
		difficulty: ipuz.difficulty,
		intro: ipuz.intro,
		grid: _.map(
			ipuz.puzzle,
			function(row) {
				return _.map(
					row,
					function(cell) {
						if (cell === BLOCK_VALUE) {
							return {
								isBlockCell: true
							};
						}

						return {
							clueNumber: _getClueNumber(cell),
							backgroundShape: _.get(cell, 'style.shapebg')
						};
					}
				);
			}
		),
		clues: {
			across: _.reduce(
				ipuz.clues.across,
				_addClue,
				{}
			),
			down: _.reduce(
				ipuz.clues.down,
				_addClue,
				{}
			)
		}
	});

	return puzzle;
}

function _validatePuzzle(puzzle) {
	var errors = [];

	if (!puzzle.dimensions) {
		errors.push("Puzzle is missing 'dimensions' key");
	}

	if (puzzle.puzzle) {
		errors = errors.concat(_checkDimensions(puzzle));
	}
	else {
		errors.push("Puzzle is missing 'puzzle' key");
	}

	if (_.size(errors) === 0) {
		return undefined;
	}

	return errors;
}

/**
 * Parser class for IPUZ-formatted puzzles
 *
 * @constructor
 */
function IPUZParser() {
	if (!(this instanceof IPUZParser)) {
		return new IPUZParser();
	}
}

IPUZParser.prototype = Object.create(Object.prototype, {
	/**
	 * Parses a {@link module:xpuz/puzzle~Puzzle|Puzzle} from the input.
	 *
	 * @memberOf module:xpuz/parsers/ipuz~IPUZParser
	 * @function
	 * @instance
	 *
	 * @param puzzle {string|object} the source to parse the puzzle from; if a string,
	 *	it is assumed to be a file path, if an object, it defines a Puzzle object.
	 *
	 * @returns {module:xpuz/puzzle~Puzzle} the parsed {@link module:xpuz/puzzle~Puzzle|Puzzle} object
	 */
	parse: {
		configurable: true,
		value: function parse(puzzle) {
			var parser = this;
			var filePath, errors;

			var deferred = Q.defer();

			if (_.isString(puzzle)) {
				// path to puzzle
				filePath = puzzle;
				try {
					puzzle = JSON.parse(String(fs.readFileSync(filePath)));
				}
				catch (ex) {
					deferred.reject(
						'Unable to read IPUZ puzzle from file ' +
							puzzle + ': ' + ex.message
					);

					return deferred.promise;
				}
			}
			else if (_.isObject(puzzle)) {
				puzzle = puzzle;
			}
			else {
				deferred.reject(
					'parse() expects either a path string or a JSON object'
				);

				return deferred.promise;
			}

			errors = _validatePuzzle(puzzle);

			if (!_.isUndefined(errors)) {
				deferred.reject(
					'Invalid puzzle:\n\t' + errors.join('\n\t')
				);
			}
			else {
				deferred.resolve(_convertPuzzle(puzzle));
			}

			return deferred.promise;
		}
	},
});


exports = module.exports = IPUZParser;
