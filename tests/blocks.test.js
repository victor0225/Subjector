import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCodexPromptBlocks, buildFinalsPreviewBlocks, buildTextMessageBlocks } from '../src/slack/blocks.js';

test('buildTextMessageBlocks renders a simple Slack section block', () => {
  const blocks = buildTextMessageBlocks('수현님, 오늘 할 일 맥락을 정리했습니다.');

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'section');
  assert.match(blocks[0].text.text, /오늘 할 일/);
});

test('buildCodexPromptBlocks puts prompt copy action before prompt body', () => {
  const prompt = '프롬프트 본문\n'.repeat(400);
  const blocks = buildCodexPromptBlocks({
    taskId: 'task-1',
    prompt
  });

  const actionIndex = blocks.findIndex((block) => block.type === 'actions');
  const promptIndex = blocks.findIndex((block) => block.block_id === 'codex_prompt_body_1');

  assert.ok(actionIndex > -1);
  assert.ok(promptIndex > -1);
  assert.ok(actionIndex < promptIndex);
  assert.equal(blocks[actionIndex].elements[0].text.text, '프롬프트 복사');
});

test('buildCodexPromptBlocks splits long prompt into Slack-sized body chunks', () => {
  const prompt = '긴 프롬프트 내용입니다. '.repeat(500);
  const blocks = buildCodexPromptBlocks({
    taskId: 'task-2',
    prompt
  });

  const promptBlocks = blocks.filter((block) => block.block_id?.startsWith('codex_prompt_body_'));
  assert.ok(promptBlocks.length > 1);
  assert.ok(promptBlocks.every((block) => block.text.text.length <= 3000));
});

test('buildFinalsPreviewBlocks includes an approve action before the preview body', () => {
  const blocks = buildFinalsPreviewBlocks('#finals 누적 업데이트 미리보기\n아직 #finals에는 반영하지 않았습니다.');

  assert.equal(blocks[0].type, 'section');
  assert.equal(blocks[1].type, 'actions');
  assert.equal(blocks[1].elements[0].action_id, 'finals_approve_latest');
  assert.match(blocks[1].elements[0].text.text, /승인/);
  assert.match(blocks[2].text.text, /#finals 누적 업데이트 미리보기/);
});
