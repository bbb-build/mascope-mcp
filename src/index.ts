#!/usr/bin/env node
/**
 * MAScope MCP Server
 *
 * World MiniAppの検証済みレビュー・分析データをAIアシスタントに提供するMCPサーバー。
 * MAScope (miniapps.humanary.world) のAPIを呼び出し、6つのツールとして公開する。
 *
 * 使い方:
 *   npx mascope-mcp
 *   または Claude Desktop / Cursor の MCP 設定に追加
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.MASCOPE_API_URL || 'https://miniapps.humanary.world';

// --- API呼び出しヘルパー ---

async function apiCall(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<unknown> {
  const url = new URL(`/api/mcp/v1${path}`, API_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'mascope-mcp/1.0.0' },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (response.status === 429) {
      throw new Error(
        `Rate limit exceeded. Free tier: 100 calls/day. ` +
        `Resets in ${response.headers.get('X-RateLimit-Reset') || '?'}s.`
      );
    }
    throw new Error(
      body.error || `MAScope API error (${response.status})` +
      (remaining ? ` [${remaining} calls remaining]` : '')
    );
  }

  return response.json();
}

// --- MCPサーバー定義 ---

const server = new McpServer({
  name: 'mascope',
  version: '1.0.0',
});

// Tool 1: search_miniapps
server.tool(
  'search_miniapps',
  'Search World MiniApps by keyword, category, or sort criteria. Returns app name, description, rank, weekly users, rating, and review count. All reviews on MAScope are verified by World ID (proof-of-personhood).',
  {
    query: z.string().optional().describe('Search keyword (matches app name or description)'),
    category: z.string().optional().describe('Filter by category name (e.g., "DeFi", "Social", "Gaming", "Utilities")'),
    sort: z.enum(['rank', 'users', 'opens']).optional().describe('Sort by: rank (default), users (weekly active), opens (weekly opens)'),
    limit: z.number().min(1).max(50).optional().describe('Results per page (1-50, default 20)'),
    offset: z.number().min(0).optional().describe('Pagination offset (default 0)'),
    locale: z.string().optional().describe('Description language: en, ja, es, ko, pt, zh, zh-TW (default: en)'),
  },
  async (args) => {
    const data = await apiCall('/search', {
      q: args.query,
      category: args.category,
      sort: args.sort,
      limit: args.limit,
      offset: args.offset,
      locale: args.locale,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool 2: get_app_details
server.tool(
  'get_app_details',
  'Get detailed information about a specific World MiniApp, including rank, user metrics, verified ratings, trend data (7-day sparkline), and developer info.',
  {
    app_id: z.string().uuid().describe('MiniApp UUID (get from search_miniapps results)'),
    locale: z.string().optional().describe('Description language: en, ja, es, ko, pt, zh, zh-TW (default: en)'),
  },
  async (args) => {
    const data = await apiCall(`/app/${args.app_id}`, { locale: args.locale });
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool 3: get_app_reviews
server.tool(
  'get_app_reviews',
  'Get World ID-verified reviews for a MiniApp. Every review is posted by a human verified through proof-of-personhood. Includes ratings, comments, sub-ratings (usability/recommendation/reliability), and a summary with rating distribution.',
  {
    app_id: z.string().uuid().describe('MiniApp UUID'),
    limit: z.number().min(1).max(50).optional().describe('Reviews per page (1-50, default 10)'),
    offset: z.number().min(0).optional().describe('Pagination offset (default 0)'),
    sort: z.enum(['recent', 'helpful']).optional().describe('Sort by: recent (default) or helpful (most helpful first)'),
  },
  async (args) => {
    const data = await apiCall('/reviews', {
      app_id: args.app_id,
      limit: args.limit,
      offset: args.offset,
      sort: args.sort,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool 4: get_trending_apps
server.tool(
  'get_trending_apps',
  'Get currently trending World MiniApps sorted by growth rate. Shows which apps are gaining users or opens the fastest, with trend direction, change percentage, and sparkline data.',
  {
    limit: z.number().min(1).max(20).optional().describe('Number of trending apps (1-20, default 10)'),
    metric: z.enum(['users', 'opens']).optional().describe('Metric to measure trends: users (default) or opens'),
    locale: z.string().optional().describe('Description language (default: en)'),
  },
  async (args) => {
    const data = await apiCall('/trending', {
      limit: args.limit,
      metric: args.metric,
      locale: args.locale,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool 5: get_category_analytics
server.tool(
  'get_category_analytics',
  'Get a breakdown of all World MiniApp categories with app count, total weekly users, and top 3 apps per category. Useful for understanding the MiniApp ecosystem landscape.',
  {},
  async () => {
    const data = await apiCall('/categories');
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool 6: compare_apps
server.tool(
  'compare_apps',
  'Compare 2-5 World MiniApps side by side. Returns rank, users, opens, rating, review count, and trend data for each app. Useful for competitive analysis.',
  {
    ids: z.string().describe('Comma-separated MiniApp UUIDs (2-5 apps). Get IDs from search_miniapps.'),
    locale: z.string().optional().describe('Description language (default: en)'),
  },
  async (args) => {
    const data = await apiCall('/compare', { ids: args.ids, locale: args.locale });
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// --- 起動 ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderrにログを出力（stdoutはMCPプロトコル通信に使用）
  console.error('MAScope MCP server running on stdio');
}

main().catch((err) => {
  console.error('Failed to start MAScope MCP server:', err);
  process.exit(1);
});
