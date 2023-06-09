import { Client as notionClient } from '@notionhq/client';
import { api as pdApi } from '@pagerduty/pdjs';
import bolt from '@slack/bolt';
import { adjectives, nouns } from './words.js';
import { createIncidentView, resolveIncidentView } from './views.js';
import {
  incidentCreatedBlocks,
  incidentCreatedNotifyBlocks,
  incidentResolvedBlocks,
  incidentResolvedNotifyBlocks,
} from './messages.js';

// API and app tokens for your app. See the README for more details (required).
const SLACK_API_TOKEN = process.env.SLACK_API_TOKEN;
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;

// The name that appears in your organization's Slack links,
// i.e. [name].slackapp.com (required)
const SLACK_ORG = process.env.SLACK_ORG;

// Comma-separated list of user IDs who should be invited to any incident
// channels (optional)
const SLACK_INVITE_USERS = process.env.SLACK_INVITE_USERS || '';

// Comma-separated list of channel IDs that should be notified about incidents
// that occur (optional)
const SLACK_NOTIFY_CHANNEL_IDS = process.env.SLACK_NOTIFY_CHANNEL_IDS || '';

// Comma-separated list of group IDs that should be cc'ed from the incident
// channel (optional)
const SLACK_CC_GROUP_IDS = process.env.SLACK_CC_GROUP_ID || '';

// PagerDuty parameters (optional). If you're not using PagerDuty, you can delete
// these and the associated functions below.
const PAGERDUTY_API_TOKEN = process.env.PAGERDUTY_API_TOKEN;
const PAGERDUTY_ESCALATION_POLICY_ID =
  process.env.PAGERDUTY_ESCALATION_POLICY_ID;
const PAGERDUTY_SERVICE_ID = process.env.PAGERDUTY_SERVICE_ID;
const PAGERDUTY_REQUESTER_EMAIL = process.env.PAGERDUTY_REQUESTER_EMAIL;

// Notion parameters (optional). If you're not using Notion, you can delete
// these and the associated functions below.
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DB_ID = process.env.NOTION_DB_ID;

// A prefix that will be used for all incident channel names.
const INCIDENT_CHANNEL_PREFIX = 'incd-';

// A link to your organization's incident documentation. Replace the placeholder
// here with one of your own.
const INCIDENT_DOC_URL = 'https://google.com';

// Create a new app
const app = new bolt.App({
  token: SLACK_API_TOKEN,
  appToken: SLACK_APP_TOKEN,
  socketMode: true,
});

// Create a PagerDuty client. If you're not using PagerDuty, you can delete this.
const pd = pdApi({ token: PAGERDUTY_API_TOKEN });

// Create a Notion client. If you're not using Notion, you can delete this.
const notion = new notionClient({ auth: NOTION_API_KEY });

// Create an incident name from the current date plus a random adjective and noun
const createIncidentName = () => {
  const randAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const currDate = new Date();
  const dateStr = currDate.toISOString().split('T')[0].replaceAll('-', '');

  return `${dateStr}-${randAdjective}-${randNoun}`;
};

const incidentChannelToName = (channel) => {
  return channel.replace(INCIDENT_CHANNEL_PREFIX, '');
};

// Create a markdown description of the incident that can be pasted in various channels
const createIncidentMarkdownDesc = (
  incidentName,
  incidentDescription,
  incidentSeverity,
  incidentChannelId,
  incidentCreatorId
) => {
  const subteamMentions = SLACK_CC_GROUP_IDS.split(',').map((groupId) => {
    return `<!subteam^${groupId}>`;
  });
  const incidentCC =
    SLACK_CC_GROUP_IDS.length > 0 ? ` (cc: ${subteamMentions.join(' ')})` : '';

  let lines = [
    `*Incident:* \`${incidentName}\` _(${incidentSeverity})_`,
    `*Description:* ${incidentDescription}`,
    `*Created by:* <@${incidentCreatorId}>${incidentCC}`,
    `*Channel for more discussion:* <#${incidentChannelId}>`,
  ];

  return lines.join('\n');
};

// Create a createPagerDutyIncident incident so on-call can be informed. Returns the incident
// URL wrapped in a promise. If you're not using PagerDuty, then you can delete.
const createPagerDutyIncident = async (name, description, channelId) => {
  console.log('Creating pagerduty incident');
  const data = {
    incident: {
      type: 'incident',
      title: `${name} (${description})`,
      service: {
        id: PAGERDUTY_SERVICE_ID,
        type: 'service_reference',
      },
      body: {
        type: 'incident_body',
        details: `An incident has been filed via the incident-manager tool: ${description}. Go to the discussion in https://slack.com/app_redirect?channel=${channelId}.`,
      },
      escalation_policy: {
        id: PAGERDUTY_ESCALATION_POLICY_ID,
        type: 'escalation_policy_reference',
      },
    },
  };
  return pd
    .post('/incidents', {
      headers: {
        From: PAGERDUTY_REQUESTER_EMAIL,
      },
      data: data,
    })
    .then((response) => response.data.incident.html_url);
};

// Create a page in Notion as a placeholder for the incident post-mortem doc.
// If you're not using Notion, then feel free to delete.
const createNotionIncidentPage = async (name, description, slackUrl) => {
  return notion.pages.create({
    parent: { database_id: NOTION_DB_ID },
    icon: {
      emoji: '🤖',
    },
    properties: {
      title: {
        title: [
          {
            text: {
              content: name,
            },
          },
        ],
      },
      Description: {
        rich_text: [
          {
            text: {
              content: description,
            },
          },
        ],
      },
      'Slack URL': {
        url: slackUrl,
      },
    },
  });
};

// Listen for the /incident command
app.command('/incident', async ({ command, ack, respond, client, logger }) => {
  console.log('Received /incident command call');
  await ack();
  await client.views.open({
    trigger_id: command.trigger_id,
    view: createIncidentView,
  });
});

// Handle the /incident view submission
app.view('createIncidentView', async ({ ack, body, view, client, logger }) => {
  await ack();

  const creatorId = body.user.id;
  const incidentName = createIncidentName();
  const channelName = INCIDENT_CHANNEL_PREFIX + incidentName;

  const incidentDescription =
    view['state']['values']['internal_description'][
      'internal_description_input'
    ]['value'];
  const incidentSeverity =
    view['state']['values']['internal_severity']['internal_severity_input'][
      'selected_option'
    ]['value'];

  console.log('Setting up channel', channelName);
  const createChannelResp = await client.conversations.create({
    name: channelName,
  });
  const incidentChannelId = createChannelResp.channel.id;

  if (PAGERDUTY_API_TOKEN) {
    await createPagerDutyIncident(
      incidentName,
      incidentDescription,
      incidentChannelId
    );
  }

  const markdownDesc = createIncidentMarkdownDesc(
    incidentName,
    incidentDescription,
    incidentSeverity,
    incidentChannelId,
    creatorId
  );

  const promises = [];

  // Set topic
  promises.push(
    client.conversations.setTopic({
      channel: incidentChannelId,
      topic: incidentDescription,
    })
  );

  // Add bookmark to the incident documentation
  promises.push(
    client.bookmarks.add({
      channel_id: incidentChannelId,
      title: 'Incident documentation',
      type: 'link',
      link: INCIDENT_DOC_URL,
    })
  );

  // Post descriptive message in incident channel
  promises.push(
    client.chat.postMessage({
      channel: incidentChannelId,
      blocks: incidentCreatedBlocks(markdownDesc),
      text: `Created incident ${incidentName}`,
    })
  );

  // Invite reporter to channel
  promises.push(
    client.conversations.invite({
      channel: incidentChannelId,
      users: creatorId,
    })
  );

  // Invite others to channel
  SLACK_INVITE_USERS.split(',').forEach((userId) => {
    if (userId !== '' && userId !== creatorId) {
      promises.push(
        client.conversations.invite({
          channel: incidentChannelId,
          users: userId,
        })
      );
    }
  });

  // Post messages in other channels
  SLACK_NOTIFY_CHANNEL_IDS.split(',').forEach((channelId) => {
    promises.push(
      client.chat.postMessage({
        channel: channelId,
        blocks: incidentCreatedNotifyBlocks(markdownDesc),
        text: `Created incident ${incidentName}`,
      })
    );
  });

  // Create a message to the creator
  promises.push(
    client.chat.postMessage({
      channel: creatorId,
      text: `I've created <#${incidentChannelId}> and invited you to it.`,
    })
  );

  if (NOTION_API_KEY) {
    // Create notion page
    promises.push(
      createNotionIncidentPage(
        incidentName,
        incidentDescription,
        `https://${SLACK_ORG}.slack.com/archives/${incidentChannelId}`
      )
    );
  }

  await Promise.all(promises);
  console.log('Incident successfully created');
});

// Listen for the /resolve-incident command
app.command(
  '/resolve-incident',
  async ({ command, ack, respond, client, logger }) => {
    console.log('Received /resolve-incident command call');
    await ack();

    const channelId = command.channel_id;
    const channelName = command.channel_name;
    if (!channelName.startsWith(INCIDENT_CHANNEL_PREFIX)) {
      await respond(
        '*ERROR:* The `resolve-incident` command must be run from within an incident channel.'
      );
      return;
    }
    if (channelName.endsWith('-resolved')) {
      await respond('*ERROR:* The incident is already resolved.');
      return;
    }

    const incidentName = incidentChannelToName(channelName);
    await client.views.open({
      trigger_id: command.trigger_id,
      view: resolveIncidentView(incidentName, channelId),
    });
  }
);

// Handle resolve-incident submission
app.view('resolveIncidentView', async ({ ack, body, view, client, logger }) => {
  await ack();

  // Extract the incident channel id from the text
  const incidentChannelText = view['blocks'][0]['text']['text'];
  const incidentChannelId = incidentChannelText.substring(
    incidentChannelText.indexOf('ID:') + 6,
    incidentChannelText.lastIndexOf('`')
  );

  console.log(`Resolving incident ${incidentChannelText}`);

  const channelInfo = await client.conversations.info({
    channel: incidentChannelId,
  });

  const promises = [];

  // Rename the channel
  promises.push(
    client.conversations.rename({
      channel: incidentChannelId,
      name: channelInfo.channel.name + '-resolved',
    })
  );

  // Notify all of the following channels
  SLACK_NOTIFY_CHANNEL_IDS.split(',').forEach((channelId) => {
    promises.push(
      client.chat.postMessage({
        channel: channelId,
        blocks: incidentResolvedNotifyBlocks(incidentChannelId),
        text: `Resolved incident ${incidentChannelText}`,
      })
    );
  });

  // Post a message in the incident channel
  promises.push(
    client.chat.postMessage({
      channel: incidentChannelId,
      blocks: incidentResolvedBlocks(),
      text: `Resolved incident ${incidentChannelText}`,
    })
  );

  await Promise.all(promises);
  console.log('Incident successfully resolved');
});

// Log errors
app.error((error) => {
  console.error(error);
});

// Run the app
(async () => {
  await app.start();
  console.log('⚡️ Bolt app started');
})();
