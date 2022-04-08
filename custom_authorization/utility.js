/**
	Function: kitting_shipping_custom_authorization
	Node version 14.x
	@category custom authorization utility file
	@Package Application
	@author Omron
	@copyright 2021 Omron
*/
const crypto = require('crypto');
const https = require('https');
const jwkToPem = require('jwk-to-pem');
const CONSTANT = require('./constants');
const Utility = {
	/**
		@name generateUserId
		@description Function to generate user id by double hashing of email address
		@param {String} email User's email address
		@returns {String} Returns user id
	*/
	generateUserId: (email) => {
		let userID = crypto.createHash('sha256').update(email).digest('hex');
		userID = crypto.createHash('sha256').update(userID).digest('hex');
		console.log(userID);
		return userID;
	},
	/**
		@name getPem
		@description Function to Configuring Identity Providers for Your User Pool
		@param {String} USERPOOLID User pool id
		@returns {String} IDP details
	*/
	getPem: (USERPOOLID) => {
		const url = CONSTANT.getCognitoURL(USERPOOLID);
		return new Promise((resolve, reject) => {
			https
				.get(url, (resp) => {
					let data = '';
					// A chunk of data has been recieved.
					resp.on('data', (chunk) => {
						data += chunk;
					});

					// The whole response has been received. Print out the result.
					resp.on('end', () => {
						const pems = {};
						const body = JSON.parse(data);
						const keys = body.keys;
						for (let i = 0; i < keys.length; i++) {
							const keyId = keys[`${i}`].kid;
							const modulus = keys[`${i}`].n;
							const exponent = keys[`${i}`].e;
							const keyType = keys[`${i}`].kty;
							const jwk = { kty: keyType, n: modulus, e: exponent };
							const pem = jwkToPem(jwk);
							pems[`${keyId}`] = pem;
						}
						resolve(pems);
					});
				})
				.on('error', (err) => {
					// eslint-disable-next-line prefer-promise-reject-errors
					reject('Error: ' + err.message);
				});
		});
	},
	/**
		@name generatePolicy
		@description Function to generate IAM policy for authorization
		@param {String} [principalId=user] Principal id
		@param {String} [effect=Allow] Effect value
		@param {Object} resource Method ARN
		@param {Object} userDetails User data for custom response
		@returns {String} Returns Auth policy with custom data
	*/
	generatePolicy: (principalId, effect, resource, userDetails) => {
		// Help function to generate an IAM policy
		const authResponse = {
			principalId: principalId
		};
		if (effect && resource) {
			const policyDocument = {};
			policyDocument.Version = '2012-10-17';
			policyDocument.Statement = [];
			const statementOne = {};
			statementOne.Action = 'execute-api:Invoke';
			statementOne.Effect = effect;
			statementOne.Resource = resource;
			policyDocument.Statement[0] = statementOne;
			authResponse.policyDocument = policyDocument;
		}
		// Optional output with custom properties of the String, Number or Boolean type.
		authResponse.context = {
			email: userDetails.attributes.emailAddress || '',
			userId: userDetails.userID || '',
			role:
				typeof userDetails.attributes.role !== 'object'
					? userDetails.attributes.role || ''
					: userDetails.attributes.role.join(','),
			name: userDetails.attributes.name || ''
		};
		return authResponse;
	}
};
module.exports = Utility;
