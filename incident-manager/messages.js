export const incidentCreatedBlocks = (markdownDesc) => {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: markdownDesc,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `
*Reminders:*
• Use this channel to discuss the incident and any mitigation.
• On-call has been paged, but if you need to page other people, go to <https://pagerduty.com|Pagerduty> and click on the "New incident" button.
• A placeholder incident postmortem doc has been created in <https://www.notion.so|Notion>.
• When the incident is resolved, run \`/resolve-incident\` from this channel!
      `.trim(),
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '   ',
      },
    },
    {
      type: 'divider',
    },
  ];
};

export const incidentCreatedNotifyBlocks = (markdownDesc) => {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '⚠️ New incident created',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: markdownDesc,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '   ',
      },
    },
  ];
};

export const incidentResolvedBlocks = () => {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '🥳 The incident has been marked as resolved but the channel will be kept open for continued discussion.',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `
*Reminders*:
• If needed, please fill out the postmortem doc created in <https://www.notion.so|Notion>.
• When you're ready to archive this channel, click on the channel name, then "Settings", then "Archive channel for everyone".
        `.trim(),
      },
    },
  ];
};

export const incidentResolvedNotifyBlocks = (incidentChannelId) => {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🥳 Incident marked as resolved',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Incident channel:* <#${incidentChannelId}>`,
      },
    },
  ];
};
