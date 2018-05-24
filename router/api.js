const axios = require('axios');

/**
 * Send message into Webhook URL
 * @param {string} url Webhook URL
 * @param {string|number} channelId
 * @param {object} body Message Object
 */
exports.webhook = (url, channelId, body={text: 'TEST'}) => {
    return axios({
        method: 'POST',
        url,
        headers: {
            'Content-Type': 'application/json'
        },
        data: Object.assign({ channelId }, body)
    }).then(checkError);
};

/**
 * API Call
 * @param {string} token API Token
 * @param {'GET'|'POST'} method HTTP Method
 * @param {string} path API path
 * @param {object} body
 */
exports.webApi = (token, method, path, body) => {
    return axios({
        method,
        baseURL: `https://${process.env.TENANT_DOMAIN}/messenger/api/`,
        url: path,
        headers: {
            'Content-Type': 'application/json',
            'token': token
        },
        data: body
    }).then(checkError);
};

/**
 * API Error Check
 * @param {object} response axios response object
 */
function checkError({data}) {
    if (!data.header.isSuccessful) {
        throw data.header.resultMessage;
    }
}