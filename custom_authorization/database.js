/**
	Function: kitting_shipping_custom_authorization
	Node version 14.x
	@category custom authorization database file
	@Package Application
	@author Omron
	@copyright 2021 Omron
*/

const CONSTANT = require('./constants');
const AWS = require('aws-sdk');
const dbClient = new AWS.DynamoDB.DocumentClient();
AWS.config.update({ region: CONSTANT.REGION });
const { generateUserId } = require('./utility');
module.exports = {
	/**
		@name checkIfTokenUpdated
		@description Function to check if token updated in token tracking table
		@param {String} emailAddress User's email address
		@param {Timestamp} tokenGeneratedTime Timestamp when token generate
		@returns {Boolean} returns false if not updated
	*/
	checkIfTokenUpdated: async (emailAddress, tokenGeneratedTime) => {
		const userId = generateUserId(emailAddress);
		const params = {
			TableName: CONSTANT.USER_TOKEN_TRACK_TABLE,
			KeyConditionExpression: '#uid = :id',
			ExpressionAttributeValues: {
				':id': userId
			},
			ExpressionAttributeNames: {
				'#uid': 'userID'
			}
		};
		let passwordUpdated = false;
		const { Items } = await dbClient.query(params).promise();
		if (Items.length > 0) {
			if (Items[0].updatedAt > tokenGeneratedTime) {
				passwordUpdated = true;
			}
		}
		return passwordUpdated;
	},
	/**
		@name getUserDetails
		@description Function to get user details
		@param {String} userId Received from cognito
		@returns {Object|Boolean} returns user details or false if not found
	*/
	getUserDetails: async (userId) => {
		const params = {
			TableName: CONSTANT.USER_TABLE,
			KeyConditionExpression: '#id = :userID',
			ExpressionAttributeValues: {
				':userID': userId
			},
			ExpressionAttributeNames: {
				'#id': 'userID'
			}
		};
		const { Count, Items } = await dbClient.query(params).promise();
		return Count > 0 ? Items[0] : false;
	}
};
