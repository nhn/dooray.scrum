const moment = require('moment-timezone');
const Api = require('./api');
const Common = require('./common');
const db = require('./dbManager');
const logger = require('./logger');
const Msg = require('./msg');
const Scrum = require('./scrum');
const Setup = require('./setup');
const Write = require('./write');

const DAYS_OF_WEEK = {
    // Array of day values for each daysOfWeek
    EVERYDAY: [0,1,2,3,4,5,6],
    WEEKDAY: [1,2,3,4,5],
    WEEKEND: [0,6]
};

// Load all scrum data for every minutes
setInterval(() => {
    const now = moment();
    if (now.second() !== 0) return;

    db.selectAllScrums().then(scrums => {
        const scrumsToSend = scrums.filter(scrum => {
            // Insert moment date object into each scrum
            const date = now.tz(scrum.timezoneName);

            return scrum.hour === date.hour() && 
                scrum.minute === date.minute() &&
                DAYS_OF_WEEK[scrum.daysOfWeek].includes(date.day());
        });

        scrumsToSend.forEach(scrum => {
            sendDailyScrumMsg(scrum, now).then(() => {
                logger.access({ type: logger.ACCESS_TYPE.DAILY_MSG, body: { channelId: scrum.channelId } });
            }).catch(err => {
                logger.error('DAILY_MSG_ERR', err);

                const ERROR_MSG = Object.assign({ responseType: 'inChannel' }, Msg.getMsgObject(Msg.TYPE.ERROR));
                Api.webhook(scrum.webHookUrl, scrum.channelId, ERROR_MSG);
            });
        });
    });
}, 1000);

module.exports = (app) => {

// Slash Commands Request URL
app.post('/', (req, res) => {
    if (!isValidAppToken(req.body)) {
        logger.error('APP_TOKEN_ERROR', `request=${req.body.appToken} env=${process.env.DOORAY_TOKEN}`);
        return res.status(403).send();
    }

    process.env.TENANT_DOMAIN = req.body.tenantDomain;

    switch (req.body.text) {
        // /scrum
        case '':
            return Write.callAsync(req.body).then(MSG => {
                logger.access({ type: logger.ACCESS_TYPE.CALL_WRITE_DIALOG, body: req.body });
                return res.status(200).send(MSG);
            }).catch(err => {
                logger.error('CALL_WRITE_DIALOG_ERR', err);
                return res.status(200).send(Msg.getMsgObject(Msg.TYPE.ERROR));
            });
        
        // /scrum setup
        case 'config':
        case 'setup':
            return Setup.callAsync(req.body).then(MSG => {
                logger.access({ type: logger.ACCESS_TYPE.CALL_SETUP_DIALOG, body: req.body });
                return res.status(200).send(MSG);
            }).catch(err => {
                logger.error('CALL_SETUP_DIALOG_ERR', err);
                return res.status(200).send(Msg.getMsgObject(Msg.TYPE.ERROR));
            });

        // /scrum info
        case 'info':
            return Scrum.infoAsync(req.body).then(MSG => {
                logger.access({ type: logger.ACCESS_TYPE.INFO, body: req.body });
                return res.status(200).send(MSG);                
            }).catch(err => {
                logger.error('INFO_ERR', err);
                return res.status(200).send(Msg.getMsgObject(Msg.TYPE.ERROR));
            });

        // /scrum status
        case 'list':
        case 'status':
            return Scrum.getStatusMessagesAsync(req.body).then(MSGs => {
                logger.access({ type: logger.ACCESS_TYPE.STATUS, body: req.body });

                if (!Array.isArray(MSGs)) {
                    return res.status(200).send(MSGs);
                }
                
                res.status(200).send();
                return sendStatusMsgs(MSGs, req.body.channelId, req.body.responseUrl);
            }).catch(err => {
                logger.error('STATUS_ERR', err);

                const ERROR_MSG = Object.assign({ replaceOriginal: false }, Msg.getMsgObject(Msg.TYPE.ERROR));
                res.status(200).send();
                return Api.webhook(req.body.responseUrl, req.body.channelId, ERROR_MSG);
            });

        // /scrum delete
        case 'delete':
            return Scrum.deleteAsync(req.body).then(MSG => {
                logger.access({ type: logger.ACCESS_TYPE.DELETE, body: req.body });
                return res.status(200).send(MSG);
            }).catch(err => {
                logger.error('DELETE_ERR', err);
                return res.status(200).send(Msg.getMsgObject(Msg.TYPE.ERROR));
            });

        // /scrum help, etc...
        default:
            logger.access({ type: logger.ACCESS_TYPE.HELP, body: req.body });
            return res.status(200).send(Msg.getMsgObject(Msg.TYPE.HELP));
    }
});

// Interactive Components Request URL
app.post('/req', (req, res) => {
    if (!isValidAppToken(req.body)) {
        logger.error('APP_TOKEN_ERROR', `request=${req.body.appToken} env=${process.env.DOORAY_TOKEN}`);
        return res.status(403).send();
    }

    process.env.TENANT_DOMAIN = req.body.tenant.domain;

    if (req.body.type === 'dialog_submission') {
        if (req.body.callbackId === 'setup') {
            // scrum setup dialog submit
            return Setup.dialogSubmitAsync(req.body).then(errors => {
                logger.access({ type: logger.ACCESS_TYPE.SUBMIT_SETUP_DIALOG, body: req.body });
                return res.status(200).send(errors);
            }).catch(err => {
                logger.error('SUBMIT_SETUP_DIALOG_ERR', err);

                const ERROR_MSG = Object.assign({ replaceOriginal: false }, Msg.getMsgObject(Msg.TYPE.ERROR));
                return Api.webhook(req.body.responseUrl, req.body.channelId, ERROR_MSG);
            });
        }
        
        // status write dialog submit
        return Write.writeAsync(req.body).then(MSG => {
            logger.access({ type: logger.ACCESS_TYPE.SUBMIT_WRITE_DIALOG, body: req.body });
            res.status(200).send();
            return Api.webhook(req.body.responseUrl, req.body.channel.id, MSG);
        }).catch(err => {
            logger.error('SUBMIT_WRITE_DIALOG_ERR', err);

            const ERROR_MSG = Object.assign({ replaceOriginal: false }, Msg.getMsgObject(Msg.TYPE.ERROR));
            return Api.webhook(req.body.responseUrl, req.body.channelId, ERROR_MSG);
        });
    }
    
    if (req.body.actionName === 'meetingId') {  
        // status choose date submit
        logger.access({ type: logger.ACCESS_TYPE.CHOOSE_DATE, body: req.body });
        return res.status(200).send(Write.chooseDateSubmit(req.body));
    }

    // scrum setup master submit
    return Setup.setupAsync(req.body).then(MSG => {
        logger.access({ type: logger.ACCESS_TYPE.SUBMIT_SETUP_MASTER, body: req.body });
        return res.status(200).send(MSG);
    }).catch(err => {
        logger.error('SUBMIT_SETUP_MASTER_ERR', err);
        return res.status(200).send(Msg.getMsgObject(Msg.TYPE.ERROR));
    });
});

};

/**
 * App token Check
 * @param {object} body Request body
 */
function isValidAppToken(body) {
    return (body.appToken && body.appToken === process.env.DOORAY_TOKEN) || body.type === 'dialog_submission';
}

/**
 * Send status messages recursion
 * @param {array} msgs status messages array
 * @param {number} channelId 
 * @param {string} webhookUrl 
 * @param {boolean} isInchannel is inChannel message
 * @param {number} index MSGs index
 */
function sendStatusMsgs(msgs, channelId, webhookUrl, isInchannel = false, index = 0) {
    if (index >= msgs.length) return;

    return Api.webhook(webhookUrl, channelId, Object.assign({ 
        responseType: isInchannel ? 'inChannel' : 'ephemeral',
        replaceOriginal: false
    }, msgs[index])).then(() => sendStatusMsgs(msgs, channelId, webhookUrl, isInchannel, ++index));
}

/**
 * Send daily scrum statuses messages
 * @param {object} scrum Scrum setting with date(moment timezone object)
 * @param {object} now Moment object
 */
function sendDailyScrumMsg(scrum, now) {
    return db.countNextMeetingStatuses(scrum.channelId)
    .then(count => {
        if (count <= 0) {
            return;
        }

        return db.deleteCompletedMeetings(scrum.channelId)
        .then(() => db.updateMeetingDate(scrum.channelId, now.tz(scrum.timezoneName)))
        .then(() => Scrum.getStatusMessagesAsync({ channelId: scrum.channelId }))
        .then(msgs => {
            if (Array.isArray(msgs)) {
                sendStatusMsgs(msgs, scrum.channelId, scrum.webHookUrl, true);
            }      
            
            return db.setMeetingCompleted(scrum.channelId);
        }).then(() => db.insertNextMeeting(scrum.channelId));
    });
}