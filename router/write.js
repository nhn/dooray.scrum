const _ = require('lodash');
const moment = require('moment-timezone');
const Api = require('./api');
const Common = require('./common');
const db = require('./dbManager');
const Msg = require('./msg');

/**
 * command response: call status dialog
 * @param {object} body Request body
 */
exports.callAsync = (body) => db.selectScrum(body.channelId, ['channelId', 'timezoneName'])
.then(scrum => {
    if (!scrum) {
        return Msg.getMsgObject(Msg.TYPE.SCRUM_NOT_SETUP);
    }

    db.updateScrumWebhook(body.channelId, body.responseUrl);

    return db.selectMeetingsWithMyStatuses(body.channelId, Common.getUserMention(body))
    .then(meetings => {
        const myStatusesCount = _.sumBy(meetings, (meeting) => meeting.Statuses.length);

        const requiredStatusCount = meetings.length - 2;
        if (myStatusesCount <= requiredStatusCount) {
            const actions = meetings.map(meeting => {
                const date = meeting.meetingAt ? moment(meeting.meetingAt).tz(scrum.timezoneName) : null;
                return {
                    type: 'button',
                    name: 'meetingId',
                    value: meeting.meetingId,
                    text: date ? date.format('MM/DD') : 'Next'
                };
            });

            return Msg.getMsgObject(Msg.TYPE.CHOOSE_DATE, { actions });
        }

        const lastMeetingsIndex = meetings.length - 1;
        const myLastStatus = meetings[lastMeetingsIndex].Statuses[0];
        const myYesterdayStatus = (lastMeetingsIndex - 1 >= 0) ? meetings[lastMeetingsIndex - 1].Statuses[0] : null;
                
        const dialog = createDialog(
            meetings[lastMeetingsIndex].meetingId, 
            myLastStatus ? myLastStatus.yesterdayWork : (myYesterdayStatus ? myYesterdayStatus.todayWork : null), 
            myLastStatus ? myLastStatus.todayWork : null, 
            myLastStatus ? myLastStatus.blocker : null
        );
        callDialog(body.cmdToken, body.channelId, body.triggerId, dialog);

        return null;
    });
});

/**
 * Handle date selection: call status dialog(status will insert chosen date)
 * @param {object} body Request body
 */
exports.chooseDateSubmit = (body) => {
    const meetingId = Number(body.actionValue);

    const dialog = createDialog(meetingId);
    callDialog(body.cmdToken, body.channel.id, body.triggerId, dialog);

    return Msg.getMsgObject(Msg.TYPE.DELETE_ORIGINAL);
};

/**
 * Handle status dialog submit: insert/update status
 * @param {object} body Request body
 */
exports.writeAsync = (body) => db.selectMeetingsWithMyStatuses(body.channel.id, Common.getUserMention(body))
.then(meetings => {
    const meetingId = Number(body.callbackId.split('-')[1]);

    return db.insertOrUpdateStatus(
        meetingId,
        Common.getUserMention(body),
        body.submission.yesterdayWork,
        body.submission.todayWork,
        body.submission.blocker
    ).then(({ timezoneName, meetingAt }) => {
        const isEdit = meetings.some(meeting => {
            if (meeting.meetingId === meetingId && meeting.Statuses.length > 0) {
                return true;
            }
        });
    
        const lastMeetingsIndex = meetings.length - 1;
        const lastMeetingId = meetings[lastMeetingsIndex].meetingId;
    
        const msg = {
            replaceOriginal: false
        };

        if (isEdit) {
            Object.assign(msg, Msg.getMsgObject(Msg.TYPE.EDIT_STATUS));
            
        } else if (lastMeetingId === meetingId) {
            Object.assign(msg, Msg.getMsgObject(Msg.TYPE.WRITE_STATUS, {
                userMention: Common.getUserMention(body)
            }));
    
        } else {
            Object.assign(msg, Msg.getMsgObject(Msg.TYPE.LATE_STATUS, {
                userMention: Common.getUserMention(body),
                date: moment(meetingAt).tz(timezoneName),
                yesterdayWork: body.submission.yesterdayWork,
                todayWork: body.submission.todayWork,
                blocker: body.submission.blocker
            }));
        }
    
        return msg;
    });    
});

/**
 * Call write dialog
 * @param {string} cmdToken body.cmdToken
 * @param {number} channelId 
 * @param {string} triggerId body.triggerId
 * @param {object} dialog Dialog object
 */
function callDialog(cmdToken, channelId, triggerId, dialog) {
    return Api.webApi(cmdToken, 'POST', `/channels/${channelId}/dialogs`, {
        triggerId,
        dialog
    });
}

/**
 * Create write dialog
 * @param {number} meetingId meeting id
 * @param {string} yesterdayWork 
 * @param {string} todayWork
 * @param {string} blocker
 */
function createDialog(meetingId, yesterdayWork, todayWork, blocker) {
    return {
        callbackId: `status-${meetingId}`,
        title: 'Scrum Status',
        submitLabel: 'Submit',
        elements: [
            {
                type: 'textarea',
                label: 'What did',
                name: 'yesterdayWork',
                value: yesterdayWork || '',
                placeholder: 'What did I complete yesterday that contributed to the team meeting our sprint goal?'
            },
            {
                type: 'textarea',
                label: 'What to do',
                name: 'todayWork',
                value: todayWork || '',
                placeholder: 'What do I plan to complete today to contribute to the team meeting our sprint goal?'
            },
            {
                type: 'textarea',
                label: 'Blockers',
                name: 'blocker',
                value: blocker || '',
                placeholder: 'Do I see any impediment that could prevent me or the team from meeting our sprint goal?',
                optional: true
            }
        ]
    };
}