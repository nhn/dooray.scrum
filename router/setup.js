const _ = require('lodash');
const Api = require('./api');
const Common = require('./common');
const db = require('./dbManager');
const Msg = require('./msg');

/**
 * setup response: call scrum setup dialog
 * @param {object} body Request body
 */
exports.callAsync = (body) => 
db.selectScrum(body.channelId, ['masterMention', 'timezoneName', 'hour', 'minute', 'daysOfWeek'])
.then(scrum => {
    if (scrum && !isScrumMaster(scrum, Common.getUserMention(body))) {
        return Msg.getMsgObject(Msg.TYPE.CANT_EDIT_DELETE, {
            masterMention: scrum.masterMention
        });
    }

    Api.webApi(body.cmdToken, 'POST', `/channels/${body.channelId}/dialogs`, {
        triggerId: body.triggerId,
        dialog: {
            callbackId: 'setup',
            title: 'Scrum Setup',
            submitLabel: 'Next',
            elements: [
                {
                    type: 'select',
                    label: 'UTC timezone',
                    name: 'timezoneName',
                    value: scrum ? scrum.timezoneName : '',
                    options: [
                        { label: 'GMT-11:00 (MidwayIsland, Samoa)', value: 'Pacific/Midway' },
                        { label: 'GMT-10:00 (Hawaii)', value: 'Pacific/Honolulu' },
                        { label: 'GMT-09:30 (Marquesas)', value: 'Pacific/Marquesas' },
                        { label: 'GMT-09:00 (Alaska)', value: 'America/Anchorage' },
                        { label: 'GMT-08:00 (PacificTime)', value: 'America/Los_Angeles' },
                        { label: 'GMT-07:00 (MountainTime_US/Canada)', value: 'America/Denver' },
                        { label: 'GMT-06:00 (CentralTime_US/Canada)', value: 'America/Chicago' },
                        { label: 'GMT-05:00 (EasternTime_US/Canada)', value: 'America/New_York' },
                        { label: 'GMT-04:30 (Caracas)', value: 'America/Caracas' },
                        { label: 'GMT-04:00 (Santiago)', value: 'America/Santiago' },
                        { label: 'GMT-03:30 (Newfoundland)', value: 'America/St_Johns' },
                        { label: 'GMT-03:00 (SaoPaulo)', value: 'America/Sao_Paulo' },
                        { label: 'GMT-02:00 (Mid-Atlantic)', value: 'America/Noronha' },
                        { label: 'GMT-01:00 (Azores)', value: 'Atlantic/Azores' },
                        { label: 'GMT+00:00 (GreenwichMeanTime_London)', value: 'Europe/London' },
                        { label: 'GMT+01:00 (Amsterdam, Berlin, Vienna)', value: 'Europe/Berlin' },
                        { label: 'GMT+02:00 (Athens, Cairo)', value: 'Europe/Athens' },
                        { label: 'GMT+03:00 (Moscow, Baghdad)', value: 'Asia/Baghdad' },
                        { label: 'GMT+03:30 (Tehran)', value: 'Asia/Tehran' },
                        { label: 'GMT+04:00 (Baku, Muscat)', value: 'Asia/Baku' },
                        { label: 'GMT+04:30 (Kabul)', value: 'Asia/Kabul' },
                        { label: 'GMT+05:00 (Karachi)', value: 'Asia/Karachi' },
                        { label: 'GMT+05:30 (NewDelhi, Mumbai, Colombo)', value: 'Asia/Colombo' },
                        { label: 'GMT+05:45 (Katmandu)', value: 'Asia/Katmandu' },
                        { label: 'GMT+06:00 (Astana, Dhaka)', value: 'Asia/Dhaka' },
                        { label: 'GMT+06:30 (Rangoon)', value: 'Asia/Rangoon' },
                        { label: 'GMT+07:00 (Bangkok, Hanoi, Jakarta)', value: 'Asia/Bangkok' },
                        { label: 'GMT+08:00 (Beijing, Dalian, Singapore, Taiwan)', value: 'Asia/Shanghai' },
                        { label: 'GMT+09:00 (Seoul, Pyongyang, Tokyo, Fukuoka)', value: 'Asia/Seoul' },
                        { label: 'GMT+09:30 (Darwin, Adelaide)', value: 'Australia/Darwin' },
                        { label: 'GMT+10:00 (Guam, Canberra, Sydney)', value: 'Australia/Sydney' },
                        { label: 'GMT+10:30 (LordHoweIsland)', value: 'Australia/Lord_Howe' },
                        { label: 'GMT+11:00 (NewCaledonia)', value: 'Pacific/Noumea' },
                        { label: 'GMT+11:30 (NorfolkIsland)', value: 'Pacific/Norfolk' },
                        { label: 'GMT+12:00 (Auckland, Fiji)', value: 'Pacific/Auckland' }
                    ]
                },
                {
                    type: 'text',
                    subtype: 'number',
                    label: 'Hour',
                    name: 'hour',
                    value: scrum ? scrum.hour : '',
                    placeholder: '00 ~ 23'
                },
                {
                    type: 'text',
                    subtype: 'number',
                    label: 'Minute',
                    name: 'minute',
                    value: scrum ? scrum.minute : '',
                    placeholder: '00 ~ 59'
                },
                {
                    type: 'select',
                    label: 'Days',
                    name: 'daysOfWeek',
                    value: scrum ? scrum.daysOfWeek : '',
                    options: [
                        {
                            label: 'Weekday',
                            value: db.DAYS_OF_WEEK.WEEKDAY
                        },
                        {
                            label: 'Weekend',
                            value: db.DAYS_OF_WEEK.WEEKEND
                        },
                        {
                            label: 'Everyday',
                            value: db.DAYS_OF_WEEK.EVERYDAY
                        }
                    ]
                }
            ]
        }
    });

    return null;
});

/**
 * Handle setup dialog submit: send scrum master select message
 * @param {object} body Request body
 */
exports.dialogSubmitAsync = (body) => {
    const errors = getInvalidSetupErr(body.submission);
    if (errors) {
        return Promise.resolve(errors);
    }

    return db.selectScrum(body.channel.id, ['masterMention']).then(scrum => {
        const actions = [{
            type: 'select',
            name: 'masterMention',
            value: '',
            dataSource: 'users'
        }];
        if (scrum) {
            actions.unshift({
                type: 'button',
                text: 'Not change',
                name: 'masterMention',
                value: scrum.masterMention
            });
        }

        Api.webhook(body.responseUrl, body.channel.id, {
            replaceOriginal: false,
            text: scrum ? `Currently, daily scrum master is ${scrum.masterMention}.` : 'Scrum setup',
            attachments: [
                {
                    callbackId: JSON.stringify(body.submission),
                    title: 'Please select new daily scrum master',
                    actions
                }            
            ]
        });

        return null;
    });    
};

/**
 * Handle master selection: insert/update scrum setup
 * @param {object} body Request body
 */
exports.setupAsync = (body) => db.selectScrum(body.channel.id, ['masterMention'])
.then(scrum => {
    if (scrum && !isScrumMaster(scrum, Common.getUserMention(body))) {
        return Msg.getMsgObject(Msg.TYPE.CANT_EDIT_DELETE, { 
            masterMention: scrum.masterMention
        });
    }

    const submission = JSON.parse(body.callbackId);
    const newMasterMention = isScrumMaster(scrum, body.actionValue) ? scrum.masterMention
        : Common.getUserMention({
            userId: body.actionValue,
            tenantId: body.tenant.id
        });

    return db.insertOrUpdateScrum(
        body.channel.id,
        newMasterMention,
        submission.daysOfWeek,
        submission.hour,
        submission.minute,
        submission.timezoneName,
        body.responseUrl
    ).then(() => {
        if (!scrum) {
            db.insertNextMeeting(body.channel.id);
        }

        return Msg.getMsgObject(Msg.TYPE.SCRUM_SETUP_EDIT, {
            userMention: (!scrum) ? Common.getUserMention(body) : null,
            hour: submission.hour,
            minute: submission.minute,
            timezone: submission.timezoneName,
            masterMention: newMasterMention,
            daysOfWeek: submission.daysOfWeek,
        });
    });
});

/**
 * Get setup dialog errors
 * @param {object} submission Request body submission
 */
function getInvalidSetupErr(submission) {
    const errors = [];

    if (submission.hour < 0 || submission.hour > 23) {
        errors.push({
            name: 'hour',
            error: 'Must be 0 ~ 23'
        });
    }
    
    if (submission.minute < 0 || submission.minute > 59) {
        errors.push({
            name: 'minute',
            error: 'Must be 0 ~ 59'
        });
    }

    return errors.length > 0 ? { errors } : null;
}

function isScrumMaster(scrum, userMention) {
    return _.get(scrum, 'masterMention', '') === userMention;
}