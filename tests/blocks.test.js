import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCodexPromptBlocks,
  buildCodexPromptCopyBlocks,
  buildFinalsPreviewBlocks,
  buildTextMessageBlocks
} from '../src/slack/blocks.js';

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
  assert.equal(blocks[actionIndex].elements[0].text.text, '프롬프트 보기/복사');
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

test('buildFinalsPreviewBlocks renders finals text without an approval action', () => {
  const blocks = buildFinalsPreviewBlocks('#finals 누적 정리를 업데이트했습니다.');

  assert.equal(blocks[0].type, 'section');
  assert.equal(blocks.some((block) => block.type === 'actions'), false);
  assert.match(blocks[0].text.text, /#finals 누적 정리/);
});

test('buildCodexPromptCopyBlocks shows a copyable prompt body', () => {
  const blocks = buildCodexPromptCopyBlocks({
    prompt: 'Subjector Codex prompt'
  });

  assert.match(blocks[0].text.text, /선택해서 복사/);
  assert.match(blocks[1].text.text, /Subjector Codex prompt/);
  assert.match(blocks[1].text.text, /```/);
});
