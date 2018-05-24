const fs = require('fs');
const moment = require('moment');
const winston = require('winston');
const winstonDaily = require('winston-daily-rotate-file');
const Common = require('./common');

const logFormat = (options) => {
    const tenantId = options.meta.body.tenant ? options.meta.body.tenant.id : options.meta.body.tenantId || 0;
    const channelId = options.meta.body.channel ? options.meta.body.channel.id : options.meta.body.channelId || 0;
    const userId = options.meta.body.user ? options.meta.body.user.id : options.meta.body.userId || 0;
    return `[${options.timestamp()}] SCRUM ${tenantId} ${channelId} ${userId} ${options.meta.type} ${options.message}`;
};

const access = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: () => moment().format('YYYY/MM/DD_HH:mm:ss.SSS'),
            formatter: logFormat
        }),
        new (winstonDaily)({
            name: 'file.access',
            filename: `./logs/access_%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            timestamp: () => moment().format('YYYY/MM/DD_HH:mm:ss.SSS'),
            formatter: logFormat,
            maxsize: 1000000,
            maxFiles: 1000
        })
    ]
});

const error = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: () => moment().format('YYYY/MM/DD_HH:mm:ss.SSS'),
            formatter: logFormat
        }),
        new (winstonDaily)({
            name: 'file.error',
            filename: `./logs/error_%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            timestamp: () => moment().format('YYYY/MM/DD_HH:mm:ss.SSS'),
            formatter: logFormat,
            maxsize: 1000000,
            maxFiles: 1000
        })
    ]
});

exports.error = (type, message) => error.error(message || '', { body: {}, type });
exports.access = (meta, message) => access.info(message || '', meta);
exports.ACCESS_TYPE = {
    HELP: 'HELP',
    DAILY_MSG: 'DAILY_MSG',
    CALL_WRITE_DIALOG: 'CALL_WRITE_DIALOG',
    SUBMIT_WRITE_DIALOG: 'SUBMIT_WRITE_DIALOG',
    CALL_SETUP_DIALOG: 'CALL_SETUP_DIALOG',
    SUBMIT_SETUP_DIALOG: 'SUBMIT_SETUP_DIALOG',
    SUBMIT_SETUP_MASTER: 'SUBMIT_SETUP_MASTER',
    INFO: 'INFO',
    STATUS: 'STATUS',
    DELETE: 'DELETE',
    CHOOSE_DATE: 'CHOOSE_DATE'
};

const MENTION_EXTRACT_REGEX = /\/\/([0-9]+)\/members\/([0-9]+) /;
/**
 * User mention to { tenantId, ChannelId, userId }
 * @param {string} userMention
 * @param {number} channelId
 */
exports.mention2body = (userMention, channelId) => {
    const [tenantId, userId] = MENTION_EXTRACT_REGEX.exec(userMention).slice(1);
    return { tenantId, channelId, userId };
};