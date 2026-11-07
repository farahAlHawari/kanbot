import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.AI_API_KEY = 'test-key-not-a-secret';
process.env.AI_BASE_URL = 'https://api.groq.com/openai/v1/';
process.env.AI_MODEL = 'test-model';
process.env.AI_TIMEOUT_MS = '50';

const { env } = await import('../config/env.js');
const { db } = await import('../db/store.js');
const { aiSource, chat, generateTodos, planSprint, summarizeSprint } = await import('./assistant.service.js');
const { complete, extractJson } = await import('./client.js');

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(handler: typeof fetch) {
  globalThis.fetch = handler;
}

function providerResponse(content: string, status = 200) {
  return new Response(JSON.stringify({
    choices: [{ message: { content } }],
  }), { status });
}

const project = {
  id: 'ai-test-project',
  userId: 'ai-test-user',
  name: 'AI Test',
  key: 'AIT',
  description: '',
  nextTodoNumber: 1,
  nextSprintNumber: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test('uses configured Groq URL and reports real AI mode without exposing credentials', () => {
  assert.equal(env.AI_BASE_URL, 'https://api.groq.com/openai/v1');
  assert.equal(env.AI_MODEL, 'test-model');
  assert.equal(aiSource(), 'ai');
  assert.equal(JSON.stringify({ mode: aiSource(), model: env.AI_MODEL }).includes('test-key-not-a-secret'), false);
});

test('sends configured model and Bearer key to the OpenAI-compatible endpoint', async () => {
  let observedUrl = '';
  let observedBody: { model?: string; messages?: unknown } = {};
  let observedAuthorization = '';
  mockFetch(async (input, init) => {
    observedUrl = String(input);
    observedAuthorization = new Headers(init?.headers).get('Authorization') ?? '';
    observedBody = JSON.parse(String(init?.body)) as typeof observedBody;
    return providerResponse('Hello from the configured provider.');
  });

  const content = await complete([{ role: 'user', content: 'Hello' }]);

  assert.equal(observedUrl, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(observedAuthorization, 'Bearer test-key-not-a-secret');
  assert.equal(observedBody.model, 'test-model');
  assert.equal(content, 'Hello from the configured provider.');
});

test('forwards the complete chat conversation and returns the provider response', async () => {
  let observedMessages: { role: string; content: string }[] = [];
  mockFetch(async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { messages: { role: string; content: string }[] };
    observedMessages = body.messages;
    return providerResponse('A **helpful** answer.');
  });

  const conversation = [
    { role: 'user' as const, content: 'First question' },
    { role: 'assistant' as const, content: 'Earlier answer' },
    { role: 'user' as const, content: 'Follow-up question' },
  ];
  const reply = await chat(project, conversation);

  assert.deepEqual(observedMessages.slice(-conversation.length), conversation);
  assert.equal(reply, 'A **helpful** answer.');
});

test('summarizes both active and completed Sprints through the configured provider', async (t) => {
  for (const status of ['active', 'completed'] as const) {
    await t.test(status, async () => {
      let observedPrompt = '';
      mockFetch(async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as { messages: { role: string; content: string }[] };
        observedPrompt = body.messages.at(-1)?.content ?? '';
        return providerResponse('### Highlights\nThe sprint made progress.');
      });
      const sprint = {
        id: `ai-test-${status}-sprint`,
        projectId: project.id,
        name: 'Test Sprint',
        goal: 'Ship the feature',
        startDate: '2026-01-01',
        endDate: '2026-01-14',
        status,
        startedAt: '2026-01-01T00:00:00.000Z',
        completedAt: status === 'completed' ? '2026-01-14T00:00:00.000Z' : null,
        completedStats: status === 'completed'
          ? {
            totalTodos: 2,
            doneTodos: 1,
            totalPoints: 5,
            donePoints: 3,
            byStatus: { todo: 0, in_progress: 0, in_review: 0, done: 1 },
            carriedOver: 1,
          }
          : null,
        summary: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-14T00:00:00.000Z',
      };

      const summary = await summarizeSprint(project, sprint);
      assert.match(summary, /Highlights/);
      assert.match(observedPrompt, new RegExp(`Sprint: Test Sprint \\(${status}\\)`));
      if (status === 'completed') assert.match(observedPrompt, /carried over: 1/);
    });
  }
});

test('maps common provider errors to safe application errors', async (t) => {
  for (const { status, expectedStatus, expectedMessage } of [
    { status: 401, expectedStatus: 502, expectedMessage: 'rejected the API key' },
    { status: 403, expectedStatus: 502, expectedMessage: 'rejected the API key' },
    { status: 400, expectedStatus: 502, expectedMessage: 'Check AI_MODEL and AI_BASE_URL' },
    { status: 404, expectedStatus: 502, expectedMessage: 'Check AI_MODEL and AI_BASE_URL' },
    { status: 429, expectedStatus: 429, expectedMessage: 'rate limit was reached' },
    { status: 503, expectedStatus: 502, expectedMessage: 'unavailable or returned an error' },
  ]) {
    await t.test(`provider status ${status}`, async () => {
      mockFetch(async () => new Response('provider details are intentionally ignored', { status }));
      await assert.rejects(complete([{ role: 'user', content: 'Hello' }]), (error: unknown) => {
        assert.equal((error as { status?: number }).status, expectedStatus);
        assert.match((error as Error).message, new RegExp(expectedMessage));
        assert.equal((error as Error).message.includes('provider details'), false);
        return true;
      });
    });
  }
});

test('handles timeout and network failures without provider details', async (t) => {
  await t.test('timeout', async () => {
    mockFetch(async () => { throw new DOMException('timeout', 'TimeoutError'); });
    await assert.rejects(complete([{ role: 'user', content: 'Hello' }]), /took too long/);
  });
  await t.test('network failure', async () => {
    mockFetch(async () => { throw new TypeError('network details'); });
    await assert.rejects(complete([{ role: 'user', content: 'Hello' }]), (error: unknown) => {
      assert.match((error as Error).message, /Could not reach the AI provider/);
      assert.equal((error as Error).message.includes('network details'), false);
      return true;
    });
  });
});

test('rejects malformed or empty provider responses', async (t) => {
  await t.test('invalid JSON', async () => {
    mockFetch(async () => new Response('not json'));
    await assert.rejects(complete([{ role: 'user', content: 'Hello' }]), /invalid response/);
  });
  await t.test('missing content', async () => {
    mockFetch(async () => new Response(JSON.stringify({ choices: [] })));
    await assert.rejects(complete([{ role: 'user', content: 'Hello' }]), /empty or invalid response/);
  });
  await t.test('invalid model JSON', () => {
    assert.throws(() => extractJson('not a JSON object'), /expected format/);
  });
});

test('normalizes generated Todo values to the API contract', async () => {
  mockFetch(async () => providerResponse(JSON.stringify({
    todos: [{
      title: '  Build the view  ',
      description: 123,
      type: 'unsupported',
      priority: 'unsupported',
      storyPoints: 4,
    }],
  })));

  const todos = await generateTodos(project, 'Build a view', 1);
  assert.deepEqual(todos, [{
    title: 'Build the view',
    description: '',
    type: 'task',
    priority: 'medium',
    storyPoints: 3,
  }]);
});

test('rejects malformed generated Todos instead of returning mock suggestions', async () => {
  mockFetch(async () => providerResponse(JSON.stringify({
    todos: [{ title: '', description: '', type: 'task', priority: 'low', storyPoints: 1 }],
  })));

  await assert.rejects(generateTodos(project, 'Build a view', 1), (error: unknown) => {
    assert.equal((error as { status?: number }).status, 502);
    assert.match((error as Error).message, /did not contain the requested Todo suggestions/);
    return true;
  });
});

test('validates Sprint plans and filters IDs to backlog items within capacity', async () => {
  const todo = {
    id: 'ai-test-todo',
    projectId: project.id,
    sprintId: null,
    key: 'AIT-1',
    title: 'Test Todo',
    description: '',
    type: 'task' as const,
    status: 'todo' as const,
    priority: 'medium' as const,
    storyPoints: 5 as const,
    labels: [],
    dueDate: null,
    order: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
  };
  const previousTodos = db.data.todos;
  db.data.todos = [...previousTodos, todo];
  mockFetch(async () => providerResponse(JSON.stringify({
    goal: 'Deliver the test Todo',
    todoIds: ['missing-id', todo.id],
    reasoning: 'This item fits the capacity.',
  })));

  try {
    const plan = await planSprint(project, 5);
    assert.equal(plan.goal, 'Deliver the test Todo');
    assert.deepEqual(plan.todoIds, [todo.id]);
    assert.equal(plan.totalPoints, 5);
    assert.ok(plan.totalPoints <= 5);
    assert.ok(plan.reasoning.length > 0);
  } finally {
    db.data.todos = previousTodos;
  }
});

test('rejects malformed Sprint plans instead of returning a mock plan', async () => {
  const todo = {
    id: 'ai-test-todo',
    projectId: project.id,
    sprintId: null,
    key: 'AIT-1',
    title: 'Test Todo',
    description: '',
    type: 'task' as const,
    status: 'todo' as const,
    priority: 'medium' as const,
    storyPoints: 1 as const,
    labels: [],
    dueDate: null,
    order: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
  };
  const previousTodos = db.data.todos;
  db.data.todos = [...previousTodos, todo];
  mockFetch(async () => providerResponse(JSON.stringify({ goal: '', todoIds: [], reasoning: '' })));

  try {
    await assert.rejects(planSprint(project, 5), (error: unknown) => {
      assert.equal((error as { status?: number }).status, 502);
      assert.match((error as Error).message, /not a valid Sprint plan/);
      return true;
    });
  } finally {
    db.data.todos = previousTodos;
  }
});
