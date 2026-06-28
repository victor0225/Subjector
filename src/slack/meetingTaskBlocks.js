function mrkdwn(text) {
  return {
    type: 'mrkdwn',
    text
  };
}

function plainText(text) {
  return {
    type: 'plain_text',
    text,
    emoji: true
  };
}

function approvalValue({ sourceChannelId, sourceMessageTs }) {
  return JSON.stringify({
    sourceChannelId,
    sourceMessageTs
  });
}

export function buildMeetingTaskApprovalBlocks({ text, sourceChannelId, sourceMessageTs }) {
  return [
    {
      type: 'section',
      text: mrkdwn(text)
    },
    {
      type: 'actions',
      block_id: 'meeting_task_approval_actions',
      elements: [
        {
          type: 'button',
          action_id: 'meeting_approve_tasks',
          text: plainText('승인하고 #in-process 반영'),
          value: approvalValue({ sourceChannelId, sourceMessageTs }),
          style: 'primary'
        }
      ]
    }
  ];
}
