/**
 * Agentravel API Server (Cloudflare Workers + Hono)
 *
 * Simple web interface for testing the travel planning agent.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMastraInstance } from './mastra/mastra.config';

type Bindings = {
  DB: D1Database;
  OPENAI_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

app.get('/', (c) => c.html(renderHomePage()));

app.post('/api/chat', async (c) => {
  const { message, sessionId } = await c.req.json();

  if (!message) {
    return c.json({ error: 'Message is required' }, 400);
  }

  // API key check
  const apiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'OPENAI_API_KEY not configured' }, 500);
  }

  const db = c.env?.DB || createMockD1Database();

  // Create Mastra instance (OpenAI-only, Cloudflare D1 storage)
  const mastra = createMastraInstance({
    openaiApiKey: apiKey,
    db,
  });

  console.log('Mastra instance:', mastra);
  console.log('Mastra agents:', mastra.agents);
  console.log('Mastra methods:', typeof mastra.getAgent);
  console.log('Available agent keys:', mastra.agents ? Object.keys(mastra.agents) : 'agents is undefined');

  // Try accessing agent through getAgent method if it exists
  let agent;
  if (typeof mastra.getAgent === 'function') {
    console.log('Using getAgent method');
    agent = mastra.getAgent('travelPlanning');
  } else if (mastra.agents) {
    console.log('Using agents property');
    agent = mastra.agents.travelPlanning;
  } else {
    throw new Error('Cannot access agents from Mastra instance');
  }

  console.log('Agent:', agent);

  // Thread ID management (Mastra memory system)
  let threadId = sessionId;
  if (!threadId) {
    // Create new thread if no session exists
    const thread = await mastra.memory?.createThread();
    threadId = thread?.id || 'session-' + Date.now();
  }

  // Generate response using Mastra Agent with threadId and resourceId
  // In Mastra v1, pass the message content directly
  const result = await agent.generate(message, {
    threadId, // Thread identifier for conversation continuity
    resourceId: 'user-default', // Stable identifier for the user/entity
  });

  // Extract response text
  const responseText = result.text || '';

  // Check if planning is complete
  const completed = responseText.includes('[COMPLETE]');

  return c.json({
    response: responseText,
    sessionId: threadId,
    currentStep: 1, // TODO: Extract from Mastra memory
    status: completed ? 'completed' : 'planning',
    completed,
  });
});

export default app;

// --- Mock Database ---

function createMockD1Database(): D1Database {
  return {
    prepare: () => ({
      bind: () => ({
        run: async () => ({ success: true, results: [] }),
        first: async () => null,
        all: async () => ({ results: [] }),
      }),
    }),
    batch: async () => [],
    dump: async () => new ArrayBuffer(0),
    exec: async () => ({ count: 0, duration: 0 }),
  } as unknown as D1Database;
}

// --- HTML Template ---

function renderHomePage(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agentravel - AI Travel Planner</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --primary: #667eea;
      --primary-dark: #764ba2;
      --text: #333;
      --text-light: #666;
      --bg: #f8f9fa;
      --white: #fff;
      --border: #e0e0e0;
      --user-bg: #e3f2fd;
      --user-border: #2196F3;
      --assistant-bg: #f3e5f5;
      --assistant-border: #9c27b0;
    }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.25rem;
    }

    .container {
      max-width: 800px;
      width: 100%;
      background: var(--white);
      border-radius: 1.25rem;
      box-shadow: 0 1.25rem 3.75rem rgba(0,0,0,0.3);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: var(--white);
      padding: 1.875rem;
      text-align: center;
    }

    .header h1 { font-size: 2.5rem; margin-bottom: 0.625rem; }
    .header p { font-size: 1.1rem; opacity: 0.9; }

    .content { padding: 1.875rem; }

    label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.625rem;
      color: var(--text);
    }

    textarea {
      width: 100%;
      padding: 0.9375rem;
      border: 2px solid var(--border);
      border-radius: 0.625rem;
      font-size: 1rem;
      resize: vertical;
      min-height: 7.5rem;
      transition: border-color 0.3s;
    }

    textarea:focus {
      outline: none;
      border-color: var(--primary);
    }

    .examples {
      display: flex;
      gap: 0.625rem;
      margin: 0.625rem 0 1.875rem;
      flex-wrap: wrap;
    }

    .example-btn {
      padding: 0.5rem 0.9375rem;
      background: var(--bg);
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background 0.3s;
    }

    .example-btn:hover { background: var(--border); }

    .submit-btn {
      width: 100%;
      padding: 0.9375rem;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: var(--white);
      border: none;
      border-radius: 0.625rem;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 0.3125rem 1.25rem rgba(102, 126, 234, 0.4);
    }

    .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .response {
      margin-top: 1.875rem;
      padding: 1.25rem;
      background: var(--bg);
      border-radius: 0.625rem;
      display: none;
    }

    .response.active { display: block; }

    .response-header {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-bottom: 0.9375rem;
      font-weight: 600;
      color: var(--primary);
    }

    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      width: 1.25rem;
      height: 1.25rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .conversation { max-height: 31.25rem; overflow-y: auto; }

    .message {
      margin-bottom: 0.9375rem;
      padding: 0.9375rem;
      border-radius: 0.625rem;
      animation: fadeIn 0.3s;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(0.625rem); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message.user {
      background: var(--user-bg);
      border-left: 4px solid var(--user-border);
    }

    .message.assistant {
      background: var(--assistant-bg);
      border-left: 4px solid var(--assistant-border);
    }

    .message-label {
      font-weight: 600;
      margin-bottom: 0.3125rem;
      color: var(--text-light);
    }

    .status {
      margin-top: 0.9375rem;
      padding: 0.625rem;
      background: var(--white);
      border-radius: 0.5rem;
      font-size: 0.9rem;
      color: var(--text-light);
    }

    .status-item { margin: 0.3125rem 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Agentravel</h1>
      <p>AI creates your travel plan</p>
    </div>

    <div class="content">
      <div>
        <label for="userInput">What kind of trip would you like?</label>
        <textarea id="userInput" placeholder="Example: I want to go to Shanghai Disneyland for 3 nights in January. From Tokyo."></textarea>

        <div class="examples">
          <button class="example-btn" data-text="Shanghai Disneyland for 3 nights in January. From Tokyo.">Shanghai Disney</button>
          <button class="example-btn" data-text="Beach resort in Okinawa, 2 nights 3 days">Okinawa Beach</button>
          <button class="example-btn" data-text="Temple hopping in Kyoto">Kyoto Temples</button>
        </div>
      </div>

      <button class="submit-btn" id="submitBtn">Create Itinerary</button>

      <div class="response" id="response">
        <div class="response-header">
          <div class="spinner" id="spinner"></div>
          <span id="statusText">Agent is thinking...</span>
        </div>

        <div class="conversation" id="conversation"></div>

        <div class="status" id="statusInfo">
          <div class="status-item">Step: <strong id="currentStep">-</strong></div>
          <div class="status-item">Status: <strong id="currentStatus">-</strong></div>
          <div class="status-item">Session ID: <strong id="sessionId">-</strong></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const $ = (sel) => document.querySelector(sel);
    const state = { sessionId: null };

    // Example buttons
    document.querySelectorAll('.example-btn').forEach(btn => {
      btn.onclick = () => { $('#userInput').value = btn.dataset.text; };
    });

    // Enter to submit
    $('#userInput').onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        startPlanning();
      }
    };

    $('#submitBtn').onclick = startPlanning;

    async function startPlanning() {
      const input = $('#userInput').value.trim();
      if (!input) {
        alert('Please enter your travel request');
        return;
      }

      const btn = $('#submitBtn');
      const response = $('#response');
      const conversation = $('#conversation');
      const spinner = $('#spinner');
      const statusText = $('#statusText');

      btn.disabled = true;
      btn.textContent = 'Sending...';
      response.classList.add('active');

      // Clear conversation only on first message
      if (!state.sessionId) {
        conversation.innerHTML = '';
      }

      spinner.style.display = 'block';
      statusText.textContent = 'Agent is thinking...';

      addMessage('user', input);
      $('#userInput').value = '';

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input, sessionId: state.sessionId })
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);

        const data = await res.json();

        addMessage('assistant', data.response);

        state.sessionId = data.sessionId;
        $('#currentStep').textContent = data.currentStep + '/13';
        $('#currentStatus').textContent = data.status;
        $('#sessionId').textContent = data.sessionId.substring(0, 8) + '...';

        if (data.completed) {
          spinner.style.display = 'none';
          statusText.textContent = 'Itinerary complete!';
          btn.textContent = 'Create New Plan';
          btn.disabled = false;
          state.sessionId = null;
        } else {
          btn.disabled = false;
          btn.textContent = 'Send';
          spinner.style.display = 'none';
          statusText.textContent = 'Waiting for your response';
          $('#userInput').placeholder = 'Enter your response...';
          $('#userInput').focus();
        }
      } catch (error) {
        addMessage('assistant', 'Error: ' + error.message);
        btn.disabled = false;
        btn.textContent = 'Retry';
        spinner.style.display = 'none';
        statusText.textContent = 'Error';
      }
    }

    function addMessage(role, content) {
      const conversation = $('#conversation');
      const div = document.createElement('div');
      div.className = 'message ' + role;
      div.innerHTML = '<div class="message-label">' + (role === 'user' ? 'You' : 'Agent') + '</div><div>' + content + '</div>';
      conversation.appendChild(div);
      conversation.scrollTop = conversation.scrollHeight;
    }
  </script>
</body>
</html>`;
}
