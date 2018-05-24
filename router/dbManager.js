const Sequelize = require('sequelize');
const Common = require('./common');

const env = process.env.NODE_ENV || 'development';
const config = require('../dbConfig.json')[env];
const sequelize = new Sequelize(config);

const Scrum = sequelize.define('Scrums', {
    channelId: { 
        type: Sequelize.BIGINT, 
        primaryKey: true,
        field: 'channel_id'
    },
    masterMention: {
        type: Sequelize.STRING(150),
        allowNull: false,
        field: 'master_mention'
    },
    daysOfWeek: {
        type: Sequelize.STRING(10),
        allowNull: false,
        field: 'days_of_week'
    },
    hour: {
        type: Sequelize.TINYINT,
        allowNull: false
    },
    minute: {
        type: Sequelize.TINYINT,
        allowNull: false
    },
    timezoneName: {
        type: Sequelize.STRING(45),
        allowNull: false,
        field: 'timezone_name'
    },
    webHookUrl: {
        type: Sequelize.TEXT,
        field: 'web_hook_url'
    }
}, { 
    freezeTableName: true,
    underscored: true
});

const Meeting = sequelize.define('Meetings', {
    meetingId: { 
        type: Sequelize.BIGINT.UNSIGNED, 
        primaryKey: true,
        autoIncrement: true,
        field: 'meeting_id'
    },
    scrumChannelId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
            model: Scrum,
            key: 'channelId'
        },
        field: 'scrum_channel_id'
    },
    meetingAt: {
        type: Sequelize.DATE,
        field: 'meeting_at'
    },
    completedFlag: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'completed_flag'
    }
}, { 
    freezeTableName: true,
    underscored: true
});

const Status = sequelize.define('Statuses', {
    meetingId: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        references: {
            model: Meeting,
            key: 'meetingId'
        },
        field: 'meeting_id'
    },
    memberMention: {
        type: Sequelize.STRING(150),
        primaryKey: true,
        field: 'member_mention'
    },
    yesterdayWork: {
        type: Sequelize.TEXT,
        field: 'yesterday_work'
    },
    todayWork: {
        type: Sequelize.TEXT,
        field: 'today_work'
    },
    blocker: Sequelize.TEXT
}, { 
    freezeTableName: true,
    underscored: true
});

Scrum.hasMany(Meeting, { foreignKey: 'scrumChannelId' });
Meeting.hasMany(Status, { foreignKey: 'meetingId' });

exports.createTables = () => Scrum.sync()
.then(() => Meeting.sync())
.then(() => Status.sync());

exports.DAYS_OF_WEEK = {
    // for `daysOfWeek` field
    EVERYDAY: 'EVERYDAY',
    WEEKDAY: 'WEEKDAY',
    WEEKEND: 'WEEKEND',
};

/**
 * Select all scrums setup
 */
exports.selectAllScrums = () => {
    return Scrum.findAll({
        attributes: ['channelId', 'masterMention', 'daysOfWeek', 'hour', 'minute', 'timezoneName', 'webHookUrl']
    });
};

/**
 * Delete completed meetings data
 * @param {number} channelId 
 */
exports.deleteCompletedMeetings = (channelId) => {
    return Meeting.destroy({
        where: {
            scrumChannelId: channelId, 
            completedFlag: true
        }
    });
};

/**
 * Set meeting date
 * @param {number} channelId 
 * @param {object} date Moment timezone object
 */
exports.updateMeetingDate = (channelId, date) => {
    return Meeting.update({
        meetingAt: date.format('YYYY-MM-DD HH:mm:00')
    }, { 
        where: {
            scrumChannelId: channelId, 
            completedFlag: false
        }
    });
};

/**
 * Set meeting complete
 * @param {number} channelId 
 */
exports.setMeetingCompleted = (channelId) => {
    return Meeting.update({
        completedFlag: true
    }, { 
        where: {
            scrumChannelId: channelId, 
            completedFlag: false
        } 
    });
};

/**
 * Create next meeting
 * @param {number} channelId 
 */
exports.insertNextMeeting = (channelId) => {
    return Meeting.create({ 
        scrumChannelId: channelId
    });
};

/**
 * Select scrum setup
 * @param {number} channelId 
 * @param {array} attributes column name array
 */
exports.selectScrum = (channelId, attributes) => {
    return Scrum.findOne({
        attributes,
        where: { channelId }
    });
};

/**
 * Insert/Update scrum setup
 * @param {number} channelId 
 * @param {string} masterMention 
 * @param {string} daysOfWeek One of DAYS_OF_WEEK Object Values
 * @param {number} hour 
 * @param {number} minute 
 * @param {string} timezoneName 
 * @param {string} webHookUrl 
 */
exports.insertOrUpdateScrum = (channelId, masterMention, daysOfWeek, hour, minute, timezoneName, webHookUrl) => {
    return Scrum.upsert({
        channelId, masterMention, daysOfWeek, hour, minute, timezoneName, webHookUrl
    });
};

/**
 * Delete scrum setup
 * @param {number} channelId 
 */
exports.deleteScrum = (channelId) => {
    return Scrum.destroy({
        where: { channelId }
    });
};

/**
 * Update webhook URL
 * @param {number} channelId 
 * @param {string} webHookUrl 
 */
exports.updateScrumWebhook = (channelId, webHookUrl) => {
    return Scrum.update({
        webHookUrl
    }, {
        where: { channelId }
    });
};

/**
 * Select meeting with status
 * @param {number} channelId 
 * @param {string} memberMention 
 */
exports.selectMeetingsWithMyStatuses = (channelId, memberMention) => {
    return Meeting.findAll({
        attributes: ['meetingId', 'meetingAt'], 
        where: { scrumChannelId: channelId },
        order: [['meetingId', 'ASC']],
        include: { 
            model: Status, 
            attributes: ['yesterdayWork', 'todayWork', 'blocker'], 
            where: { memberMention },
            required: false
        }        
    });
};

/**
 * Insert/Update status
 * @param {number} meetingId 
 * @param {string} memberMention 
 * @param {string} yesterdayWork 
 * @param {string} todayWork 
 * @param {string} blocker 
 */
exports.insertOrUpdateStatus = (meetingId, memberMention, yesterdayWork, todayWork, blocker) => {
    return Meeting.find({
        attributes: ['scrumChannelId', 'meetingAt'],
        where: { meetingId }
    }).then(meeting => {
        return Scrum.find({
            attributes: ['timezoneName'],
            where: { channelId: meeting.scrumChannelId }
        }).then(scrum => {
            return Status.upsert({
                meetingId, memberMention, yesterdayWork, todayWork, blocker
            }).then(() => {
                return { timezoneName: scrum.timezoneName, meetingAt: meeting.meetingAt };
            });
        });        
    });
};

/**
 * Select next meeting
 * @param {number} channelId 
 */
exports.selectLastMeeting = (channelId) => {
    return Meeting.findOne({
        attributes: ['meetingId', 'meetingAt'], 
        where: { 
            scrumChannelId: channelId,
            completedFlag: false
        },
        order: [['created_at', 'DESC']]
    });
};

/**
 * Select statuses in meeting
 * @param {number} meetingId 
 */
exports.selectStatues = (meetingId) => {
    return Status.findAll({
        attributes: ['memberMention', 'yesterdayWork', 'todayWork', 'blocker'], 
        where: { meetingId },
        order: [['created_at', 'ASC']]
    });
};

/**
 * Count next meeting statuses
 * @param {number} channelId 
 */
exports.countNextMeetingStatuses = (channelId) => {
    return Status.count({
        where: { 
            meetingId: {
                $in: Sequelize.literal(`(SELECT \`meeting_id\` FROM \`Meetings\` AS \`meeting\` WHERE \`meeting\`.\`scrum_channel_id\`=${channelId} AND \`meeting\`.\`completed_flag\`=0)`)
            }
        }
    });
};