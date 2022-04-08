const AWS = require('aws-sdk');
const CONSTANTS = {
	REQUEST_TIMEOUT: 1000,
	EC2_REQUEST_TIMEOUT: 'Request to EC2 instance timed out',
	REGION: 'us-west-2'
};
const region = process.env.REGION || CONSTANTS.REGION;
const secretName = process.env.SECRET_MANAGER_NAME;
const client = new AWS.SecretsManager({
	region: region
});

const getSecretsFromCache = async () => {
	try {
		return new Promise((resolve, reject) => {
			const https = require('http');
			const options = {
				hostname: process.env.EC2_IP,
				port: process.env.PORT || 8084,
				path: `/cache/${process.env.SECRET_MANAGER_NAME}`,
				method: 'GET',
				timeout: CONSTANTS.REQUEST_TIMEOUT
			};
			const req = https.request(options, res => {
				let secrets = '';
				res.on('data', secretChunk => {
					const buff = Buffer.from(secretChunk, 'base64');
					secretChunk = buff.toString('ascii');
					secrets += secretChunk;
				});
				res.on('end', () => {
					resolve(secrets);
				});
			});

			req.on('error', error => {
				resolve(JSON.stringify({
					success: false,
					message: error
				}));
			});

			req.on('timeout', () => {
				console.log(CONSTANTS.EC2_REQUEST_TIMEOUT);
				req.destroy();
			});

			req.end();
		});
	} catch (error) {
		console.log('Error while fetching secrets from caching lambda : ', error);
		return Promise.resolve(JSON.stringify({
			success: false,
			message: error
		}));
	}
};

const getSecretsFromSecretManager = async () => {
	return new Promise((resolve, reject) => {
		client.getSecretValue({ SecretId: secretName }, function (err, data) {
			// See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
			if (err) {
				console.error(err);
				reject(err);
			} else {
				// Decrypts secret using the associated KMS CMK.
				// Depending on whether the secret is a string or binary, one of these fields will be populated.
				if ('SecretString' in data) {
					resolve(data.SecretString);
				} else {
					const buff = Buffer.from(data.SecretBinary, 'base64');
					resolve(buff.toString('ascii'));
				}
			}
		});
	});
};

exports.secretFunction = async () => {
	try {
		const response = await getSecretsFromCache();
		if (JSON.parse(response).success === false) {
			throw new Error('Getting secrets from secret manager');
		}
		return response;
	} catch (error) {
		console.error('Getting secrets from secret manager');
		return await getSecretsFromSecretManager();
	}
};
