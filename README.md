# MAScope MCP Server

MCP server for [MAScope](https://miniapps.humanary.world) — World MiniApp reviews and analytics data, powered by verified humans.

Every review on MAScope is posted by a human verified through [World ID](https://world.org) proof-of-personhood. No bots. No fakes. Real reviews.

## Tools

| Tool | Description |
|------|-------------|
| `search_miniapps` | Search World MiniApps by keyword, category, or sort criteria |
| `get_app_details` | Get detailed info about a specific MiniApp (rank, users, trend) |
| `get_app_reviews` | Get verified reviews with ratings, comments, and distribution |
| `get_trending_apps` | Get trending apps sorted by growth rate |
| `get_category_analytics` | Category breakdown with app count and top apps |
| `compare_apps` | Compare 2-5 apps side by side |

## Setup

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mascope": {
      "command": "npx",
      "args": ["-y", "mascope-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add mascope -- npx -y mascope-mcp
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "mascope": {
      "command": "npx",
      "args": ["-y", "mascope-mcp"]
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "mascope": {
      "command": "npx",
      "args": ["-y", "mascope-mcp"]
    }
  }
}
```

## Rate Limits

Free tier: **100 API calls/day** per IP address. Rate limit headers are included in all responses.

## License

MIT
