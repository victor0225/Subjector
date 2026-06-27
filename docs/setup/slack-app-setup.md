# Subjector Slack App Setup

This guide sets up the Slack app needed for the MVP.

## Create The App

1. Go to Slack API app creation.
2. Create a new app from manifest.
3. Use `slack/manifest.yaml` from this repository.
4. Replace every `https://subjector.onrender.com` URL later if Render uses a different URL.
5. Install the app to the workspace.

## Bot Scopes

The MVP manifest requests only the scopes needed for:

- Reading messages in connected public channels.
- Reading DMs sent to the bot.
- Reading uploaded meeting files.
- Posting messages, replies, and updates.
- Opening/sending DMs.
- Listing/joining required public channels during setup.
- Reading user identity basics.

The MVP does not request email access or private channel scopes.

## Required Channels

Invite the bot to:

```text
#회의-결과록
#in-process
#finals
```

If the workspace prevents the bot from joining public channels itself, a workspace/channel member must invite it manually.

## Required Environment Values

After installing the app, copy these into `.env` locally and later into Render:

```text
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
```

Then collect channel IDs and user IDs:

```text
MEETING_CHANNEL_ID=C...
IN_PROCESS_CHANNEL_ID=C...
FINALS_CHANNEL_ID=C...
USERS_JSON=[{"key":"suhyeon","slack_id":"U...","full_name":"조수현","display_name":"수현"},{"key":"joeun","slack_id":"U...","full_name":"김조은","display_name":"조은"},{"key":"minsung","slack_id":"U...","full_name":"배민성","display_name":"민성"}]
```

## First Manual Test

After `.env` is filled and the server is running:

1. Open a DM with `Subjector Bot`.
2. Send:

```text
출근
```

Expected reply:

```text
수현님, 오늘 할 일 맥락을 정리했습니다. #in-process에도 최신 task를 반영하겠습니다.
```

3. Send:

```text
퇴근
```

Expected reply:

```text
수현님, 오늘 한 일 요약입니다...
```

4. As 조수현 only, send:

```text
finals 업데이트
```

Expected reply:

```text
수현님, #finals 업데이트 미리보기를 생성하겠습니다.
```
