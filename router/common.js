const _ = require('lodash');
const uuidv5 = require('uuid/v5');

/**
 * Convert to UUID
 * @param {string} name
 */
function getUuid(name) {
    return uuidv5(name, process.env.DOORAY_TOKEN);
}
exports.getUuid = getUuid;

/**
 * Create user mention string
 * @param {object} body Request body 
 */
function getUserMention({ tenantId, userId, tenant, user }) {
    const tenantIdNum = tenantId || tenant.id;
    const userIdNum = userId || user.id;

    return `(dooray://${tenantIdNum}/members/${userIdNum} "member")`;
}
exports.getUserMention = getUserMention;

/**
 * Convert to %02d format
 * @param {number} number 
 */
exports.to02d = number => {
    return _.padStart(number, 2, '0');
};