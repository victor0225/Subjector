export function isDirectUserMessage(message) {
  return Boolean(
    message &&
    message.channel_type === 'im' &&
    message.user &&
    !message.bot_id &&
    message.subtype !== 'bot_message'
  );
}
