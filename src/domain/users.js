export function normalizeUser(rawUser, index = 0) {
  const requiredFields = ['key', 'slack_id', 'full_name', 'display_name'];
  for (const field of requiredFields) {
    if (!rawUser || typeof rawUser[field] !== 'string' || rawUser[field].trim() === '') {
      throw new Error(`USERS_JSON entry ${index} is missing ${field}`);
    }
  }

  return {
    key: rawUser.key.trim(),
    slackId: rawUser.slack_id.trim(),
    fullName: rawUser.full_name.trim(),
    displayName: rawUser.display_name.trim()
  };
}

export function getUserBySlackId(users, slackId) {
  return users.find((user) => user.slackId === slackId) ?? null;
}

export function getUserByKey(users, key) {
  return users.find((user) => user.key === key) ?? null;
}

export function formatDisplayName(user) {
  if (!user) {
    return '사용자님';
  }

  return user.displayName.endsWith('님') ? user.displayName : `${user.displayName}님`;
}
