/**
	Function: kitting_shipping_custom_authorization
	Node version 14.x
	@category custom authorization main file
	@Package Application
	@author Omron
	@copyright 2021 Omron
*/

/* eslint-disable standard/no-callback-literal */
const SECRET_MANAGER = require('utils');
const jwt = require('jsonwebtoken');
const { getPem, generatePolicy } = require('./utility');
const { checkIfTokenUpdated, getUserDetails } = require('./database');

/**
	@name applyValidation
	@description Controller function
	@param {Object} event Contains request params
	@param {Function} callback Callback function to return resposne
	@returns {Void} Calls Callback function (Response code 401 for Unauthorized)
*/
const applyValidation = async (event, callback) => {
	const secretConstants = await SECRET_MANAGER.secretFunction();
	const SECRET_CONSTANT = JSON.parse(secretConstants);
	let token = event.authorizationToken;
	if (!token) {
		console.log('Token not found');
		callback('Unauthorized');
	} else {
		if (!token.includes('Bearer')) {
			callback('Unauthorized');
			return;
		}
		token = token.replace('Bearer', '').trim();
		try {
			const decodedJwt = jwt.decode(token, { complete: true });
			if (
				!decodedJwt ||
				!decodedJwt.payload ||
				!decodedJwt.payload.exp ||
				!decodedJwt.payload.email
			) {
				callback('Unauthorized', decodedJwt.payload.email);
			} else {
				try {
					const expiryTime = new Date(decodedJwt.payload.exp * 1000).getTime();
					const generatedTime = new Date(
						decodedJwt.payload.auth_time * 1000
					).getTime();
					const currentTime = new Date().getTime();
					const email = decodedJwt.payload.email;
					const userId = decodedJwt.payload['custom:userId'] || null;
					await Promise.all([
						getPem(SECRET_CONSTANT.USER_POOL_ID),
						checkIfTokenUpdated(email, generatedTime),
						getUserDetails(userId)
					]).then((values) => {
						const pems = values[0];
						const pem = pems[decodedJwt.header.kid];
						const passwordUpdated = values[1];
						const userDetails = values[2];
						if (passwordUpdated || expiryTime < currentTime) {
							callback('Unauthorized');
						} else {
							jwt.verify(token, pem, function (err, payload) {
								if (err) {
									console.log('Invalid Token.');
									callback('Unauthorized');
								} else {
									console.log('Valid Token.');
									callback(
										null,
										generatePolicy(
											'user',
											'Allow',
											event.methodArn,
											userDetails
										)
									);
								}
							});
						}
					});
				} catch (error) {
					console.log('Invalid signature', error);
					callback('Unauthorized');
				}
			}
		} catch (error) {
			console.log(error);
			callback('Unauthorized');
		}
	}
};
/**
	@name handler
	@description Handles the request (Function's entry point)
	@param {Object} event Contains request params
	@param {Object} context Not used
	@param {Function} callback Function returns the response
	@returns {Void} Calls Callback function (Response code 401 for Unauthorized)
*/
exports.handler = async (event, context, callback) => {
	await applyValidation(event, callback);
};
