const Common = require('./common');

const TYPE = {
    SCRUM_SETUP_EDIT: 'SCRUM_SETUP_EDIT',
    SCRUM_INFO: 'SCRUM_INFO',
    SCRUM_NOT_SETUP: 'SCRUM_NOT_SETUP',
    SCRUM_DELETE: 'SCRUM_DELETE',
    CANT_EDIT_DELETE: 'CANT_EDIT_DELETE',
    EDIT_STATUS: 'EDIT_STATUS',
    WRITE_STATUS: 'WRITE_STATUS',
    DELETE_ORIGINAL: 'DELETE_ORIGINAL',
    LATE_STATUS: 'LATE_STATUS',
    STATUS_ATTACHMENT: 'STATUS_ATTACHMENT',
    BLOCKER_FIELD: 'BLOCKER_FIELD',
    SCRUM_STATUS: 'SCRUM_STATUS',
    NO_SCRUM_STATUS: 'NO_SCRUM_STATUS',
    CHOOSE_DATE: 'CHOOSE_DATE',
    HELP: 'HELP',
    ERROR: 'ERROR'    
};
exports.TYPE = TYPE;

const ONLY_TEXT = {
    SCRUM_NOT_SETUP: 'Daily scrum had not set up. `/scrum help`',
    EDIT_STATUS: 'Status edit complete.',
    NO_SCRUM_STATUS: 'No one wrote next daily scrum status.',
    ERROR: 'Sorry, Please retry.'
};

/**
 * Create Message Object
 * @param {string} MSG_TYPE Message type
 * @param {object} params Data for create message(check each comment)
 */
exports.getMsgObject = (MSG_TYPE, params={}) => {
    switch (MSG_TYPE) {
        case TYPE.HELP:
            return {
                text: '`/scrum` help',
                attachments: [
                    {
                        text: '',
                        fields: [
                            {
                                title: '/scrum setup',
                                value: 'Setup the scrum meeting in this channel'
                            },
                            {
                                title: '/scrum',
                                value: 'Write/Edit my status'
                            },
                            {
                                title: '/scrum status',
                                value: 'Print scrum statuses'
                            },
                            {
                                title: '/scrum info',
                                value: 'Show the scrum meeting setting in this channel'
                            },
                            {
                                title: '/scrum delete',
                                value: 'Delete the scrum meeting in this channel'
                            }
                        ]
                    }
                ]
            };
            
        case TYPE.SCRUM_SETUP_EDIT:
            return {
                // userMention, channelName, hour, minute, timezone, daysOfWeek, masterMention
                deleteOriginal: true,
                responseType: 'inChannel',
                text: params.userMention ? 
                    `${params.userMention} set up a daily scrum!` : 'Daily scrum edited!',
                attachments: [
                    {
                        title: `Daily scrum info`,
                        fields: [
                            {
                                title: 'Time',
                                value: `${Common.to02d(params.hour)}:${Common.to02d(params.minute)} (${params.timezone})`,
                                short: true
                            },
                            {
                                title: 'Days',
                                value: params.daysOfWeek,
                                short: true
                            },
                            {
                                title: 'Master',
                                value: params.masterMention,
                                short: true
                            }
                        ]
                    }
                ]
            };

        case TYPE.SCRUM_INFO:
            return {
                // channelName, scrum.hour, scrum.minute, scrum.timezoneName, scrum.daysOfWeek, scrum.masterMention
                text: 'Daily scrum info',
                attachments: [
                    {
                        title: `Daily scrum info`,
                        fields: [
                            {
                                title: 'Time',
                                value: `${Common.to02d(params.scrum.hour)}:${Common.to02d(params.scrum.minute)} (${params.scrum.timezoneName})`,
                                short: true
                            },
                            {
                                title: 'Days',
                                value: params.scrum.daysOfWeek,
                                short: true
                            },
                            {
                                title: 'Master',
                                value: params.scrum.masterMention,
                                short: true
                            }
                        ]
                    }
                ]
            };
        
        case TYPE.SCRUM_DELETE:
            return {
                // userMention
                responseType: 'inChannel',
                text: `${params.userMention} deleted the daily scrum!`
            };

        case TYPE.CANT_EDIT_DELETE:
            return {
                // masterMention
                text: `Only ${params.masterMention} can edit/delete.`,
                attachments: []
            };

        case TYPE.CHOOSE_DATE:
            const lastActionsIndex = params.actions.length - 1;
            return {
                // actions
                text: 'You didn\'t write status for last scrum.',
                attachments: [
                    {
                        title: 'Please choose scrum date to write status.',
                        callbackId: `chooseDate-${params.actions[lastActionsIndex].value}`,
                        actions: params.actions
                    }
                ]
            };

        case TYPE.WRITE_STATUS:
            return {
                responseType: 'inChannel',
                text: `${params.userMention} wrote the status for next daily scrum.`
            };

        case TYPE.DELETE_ORIGINAL:
            return {
                deleteOriginal: true,
                text: 'Message deleted'
            };

        case TYPE.LATE_STATUS:
            const fields = [
                {
                    title: 'What did:',
                    value: params.yesterdayWork,
                },
                {
                    title: 'What to do:',
                    value: params.todayWork,
                }
            ];
            if (params.blocker) fields.push({ title: 'Blockers:', value: params.blocker });
            return {
                // userMention, yesterday, today, blocker
                responseType: 'inChannel',
                text: `${params.userMention} wrote the status for ${params.date.format('MM/DD')} daily scrum.`,
                attachments: [{
                    text: params.userMention,
                    fields
                }],
                color: params.blocker ? '#ff0000' : ''
            };
        
        case TYPE.STATUS_ATTACHMENT:
            return {
                // status.memberMention, status.yesterdayWork, status.todayWork
                text: params.status.memberMention,
                fields: [
                    {
                        title: 'What did:',
                        value: params.status.yesterdayWork,
                    },
                    {
                        title: 'What to do:',
                        value: params.status.todayWork,
                    }
                ]
            };

        case TYPE.BLOCKER_FIELD:
            return {
                // status.blocker
                title: 'Blockers:',
                value: params.status.blocker
            };
            
        case TYPE.SCRUM_STATUS:
            const messageNum = params.totalMessageCount > 1 ? `(${params.messageIndex + 1}/${params.totalMessageCount})` : '';
            return {
                // date, attachments, messageIndex, totalMessageCount
                replaceOriginal: false,
                text: `${params.date} Scrum Status ${messageNum}`,
                attachments: params.attachments
            };

        default:
            return {
                text: ONLY_TEXT[MSG_TYPE],
                attachments: []
            };
    }
};