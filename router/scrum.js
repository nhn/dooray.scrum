const _ = require('lodash');
const moment = require('moment-timezone');
const Common = require('./common');
const db = require('./dbManager');
const Msg = require('./msg');

/**
 * info response: scrum setting info
 * @param {object} body Request body
 */
exports.infoAsync = (body) => db.selectScrum(body.channelId,
    ['hour', 'minute', 'timezoneName', 'daysOfWeek', 'masterMention'])
.then(scrum => {
    return !scrum ? Msg.getMsgObject(Msg.TYPE.SCRUM_NOT_SETUP)
        : Msg.getMsgObject(Msg.TYPE.SCRUM_INFO, { scrum });
});

/**
 * delete response: delete scrum setting
 * @param {object} body Request body
 */
exports.deleteAsync = (body) => db.selectScrum(body.channelId, ['masterMention'])
.then(scrum => {
    if (!scrum) {
        return Msg.getMsgObject(Msg.TYPE.SCRUM_NOT_SETUP);
    }

    if (scrum.masterMention !== Common.getUserMention(body)) {
        return Msg.getMsgObject(Msg.TYPE.CANT_EDIT_DELETE, {
            masterMention: scrum.masterMention
        });
    }

    return db.deleteScrum(body.channelId)
    .then(() => Msg.getMsgObject(Msg.TYPE.SCRUM_DELETE, {
        userMention: Common.getUserMention(body)
    }));
});

const MAX_ATTACHMENTS_PER_MESSAGE = 20;

/**
 * status response: print statuses messages
 * @param {object} body Request body
 */
exports.getStatusMessagesAsync = (body) => db.selectScrum(body.channelId, ['channelId', 'timezoneName'])
.then(scrum => {
    if (!scrum) {
        return Msg.getMsgObject(Msg.TYPE.SCRUM_NOT_SETUP);
    }

    return db.selectLastMeeting(body.channelId).then(meeting => 
        db.selectStatues(meeting.meetingId).then(statuses => {
            if (statuses.length === 0) {
                return Msg.getMsgObject(Msg.TYPE.NO_SCRUM_STATUS);
            }
    
            const mapStatusesToAttachments = (slicedStatuses) => slicedStatuses.map(status => {
                const attachment = Msg.getMsgObject(Msg.TYPE.STATUS_ATTACHMENT, {
                    status
                });
                
                if (status.blocker) {
                    attachment.fields.push(Msg.getMsgObject(Msg.TYPE.BLOCKER_FIELD, {
                        status
                    }));
                    attachment.color = '#ff0000';
                }
                
                return attachment;
            });
            
            const messages = _.chunk(statuses, MAX_ATTACHMENTS_PER_MESSAGE).map((slicedStatuses, messageIndex, arr) => {
                const totalMessageCount = arr.length;
                const date = meeting.meetingAt ? moment(meeting.meetingAt).tz(scrum.timezoneName).format('MM/DD') : 'Next';
    
                return Msg.getMsgObject(Msg.TYPE.SCRUM_STATUS, {
                    date,
                    messageIndex,
                    totalMessageCount,
                    attachments: mapStatusesToAttachments(slicedStatuses)
                });
            });
    
            return messages;
        })
    );
});