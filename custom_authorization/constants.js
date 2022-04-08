/**
	Function: kitting_shipping_custom_authorization
	Node version 14.x
	@category custom authorization constant file
	@Package Application
	@author Omron
	@copyright 2021 Omron
*/

module.exports = {
	USER_TABLE: process.env.USER_TABLE,
	USER_TOKEN_TRACK_TABLE: process.env.USER_TOKEN_TRACK_TABLE,
	REGION: process.env.REGION,
	getCognitoURL: (USERPOOLID) => {
		return `https://cognito-idp.${process.env.REGION}.amazonaws.com/${USERPOOLID}/.well-known/jwks.json`;
	}
};
