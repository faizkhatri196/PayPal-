import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const HOLDFAST_API_URL = process.env.HOLDFAST_API_URL || 'http://localhost:4000/api';

const server = new Server(
  {
    name: 'holdfast-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'holdfast_create_contract',
        description: 'Creates a new milestone escrow contract with PayPal authorization hold.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the contract or task' },
            description: { type: 'string', description: 'Detailed specification of work' },
            buyer_agent_id: { type: 'string', description: 'Identifier of the hiring agent' },
            worker_agent_id: { type: 'string', description: 'Identifier of the contractor agent' },
            milestones: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  amount: { type: 'string', description: 'Amount in USD, e.g. "15.00"' },
                  criteria: {
                    type: 'object',
                    properties: {
                      schema_type: { type: 'string', enum: ['pricing_report', 'code_review', 'data_extraction', 'custom_json'] },
                      required_keys: { type: 'array', items: { type: 'string' } },
                      min_items: { type: 'number' },
                    },
                    required: ['schema_type', 'required_keys'],
                  },
                },
                required: ['title', 'amount', 'criteria'],
              },
            },
          },
          required: ['title', 'buyer_agent_id', 'worker_agent_id', 'milestones'],
        },
      },
      {
        name: 'holdfast_check_status',
        description: 'Retrieves current status, hold balance, and milestone progression of a contract.',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: { type: 'string', description: 'Contract ID (e.g. ct_...)' },
          },
          required: ['contract_id'],
        },
      },
      {
        name: 'holdfast_submit_deliverable',
        description: 'Worker agent submits deliverable. Runs Gate 1 (deterministic) and Gate 2 (adversarial veto), captures tranche on PayPal upon pass, and issues Acceptance Receipt.',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: { type: 'string', description: 'Contract ID' },
            milestone_id: { type: 'string', description: 'Milestone ID' },
            payload: { type: 'object', description: 'JSON deliverable data' },
          },
          required: ['contract_id', 'milestone_id', 'payload'],
        },
      },
      {
        name: 'holdfast_void_remainder',
        description: 'Voids uncaptured authorization hold on PayPal if work was rejected or canceled.',
        inputSchema: {
          type: 'object',
          properties: {
            contract_id: { type: 'string', description: 'Contract ID' },
          },
          required: ['contract_id'],
        },
      },
      {
        name: 'holdfast_get_dispute_evidence',
        description: 'Fetches cryptographic Acceptance Receipt and formatted evidence packet for PayPal Dispute Resolution.',
        inputSchema: {
          type: 'object',
          properties: {
            receipt_id: { type: 'string', description: 'Receipt ID (rcpt_...)' },
          },
          required: ['receipt_id'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'holdfast_create_contract') {
      const res = await fetch(`${HOLDFAST_API_URL}/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    if (name === 'holdfast_check_status') {
      const { contract_id } = args as { contract_id: string };
      const res = await fetch(`${HOLDFAST_API_URL}/contracts/${contract_id}`);
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    if (name === 'holdfast_submit_deliverable') {
      const { contract_id, milestone_id, payload } = args as {
        contract_id: string;
        milestone_id: string;
        payload: any;
      };
      const res = await fetch(
        `${HOLDFAST_API_URL}/contracts/${contract_id}/milestones/${milestone_id}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload }),
        }
      );
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    if (name === 'holdfast_void_remainder') {
      const { contract_id } = args as { contract_id: string };
      const res = await fetch(`${HOLDFAST_API_URL}/contracts/${contract_id}/void`, {
        method: 'POST',
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    if (name === 'holdfast_get_dispute_evidence') {
      const { receipt_id } = args as { receipt_id: string };
      const res = await fetch(`${HOLDFAST_API_URL}/receipts/${receipt_id}`);
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error calling tool ${name}: ${err.message}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Holdfast MCP Server] Connected to stdio');
}

main().catch((err) => {
  console.error('[Holdfast MCP Server Error]:', err);
  process.exit(1);
});
