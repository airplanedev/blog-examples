export const createIncidentView = {
  type: 'modal',
  callback_id: 'createIncidentView',
  title: {
    type: 'plain_text',
    text: 'Create an incident',
  },
  blocks: [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Internal details',
        emoji: true,
      },
    },
    {
      type: 'input',
      block_id: 'internal_description',
      label: {
        type: 'plain_text',
        text: 'Description',
      },
      element: {
        type: 'plain_text_input',
        action_id: 'internal_description_input',
        placeholder: {
          type: 'plain_text',
          text: "Describe what's happening in a sentence or two",
        },
        multiline: true,
      },
    },
    {
      type: 'input',
      block_id: 'internal_severity',
      element: {
        type: 'static_select',
        placeholder: {
          type: 'plain_text',
          text: 'Select an item',
          emoji: true,
        },
        options: [
          {
            text: {
              type: 'plain_text',
              text: 'SEV0: Product is unusable for most users',
              emoji: true,
            },
            value: 'SEV0',
          },
          {
            text: {
              type: 'plain_text',
              text: 'SEV1: Product is unusable for some users or degraded for most',
              emoji: true,
            },
            value: 'SEV1',
          },
          {
            text: {
              type: 'plain_text',
              text: 'SEV2: Product is degraded for some users but still usable for most',
              emoji: true,
            },
            value: 'SEV2',
          },
        ],
        action_id: 'internal_severity_input',
      },
      label: {
        type: 'plain_text',
        text: 'Severity',
        emoji: true,
      },
    },
  ],
  submit: {
    type: 'plain_text',
    text: 'Submit',
  },
};

export const resolveIncidentView = (incidentName, incidentChannelId) => {
  return {
    type: 'modal',
    callback_id: 'resolveIncidentView',
    title: {
      type: 'plain_text',
      text: 'Resolve an open incident',
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Incident name:* \`${incidentName}\`\n*Incident channel ID:* \`${incidentChannelId}\``,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Click "submit" below to mark the incident as resolved. The channel will stay open for any continued discussion.`,
        },
      },
    ],
    submit: {
      type: 'plain_text',
      text: 'Submit',
    },
  };
};
