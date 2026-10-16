# PostgreSQL MCP Server

A simple [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for PostgreSQL.

It lets MCP-compatible clients such as [Cursor](https://cursor.com) connect to one or more PostgreSQL databases and:

- list configured databases
- list tables in the `public` schema
- describe table columns
- execute raw SQL queries

## Features

- Configure multiple PostgreSQL databases at once
- List tables from the `public` schema
- Inspect table schemas
- Execute SQL queries, including `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and DDL statements

## Installation

1. Clone the repository:

```bash
git clone https://github.com/gpfurlaneto/postgres-mcp.git
cd postgres-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

The compiled server entrypoint is:

```bash
dist/index.js
```

## Configuration

You can configure databases in either of these ways.

### Environment Variables

Set one or more environment variables with the `PG_DB_` prefix:

```bash
PG_DB_PRIMARY=postgresql://user:pass@localhost:5432/postgres
PG_DB_ANALYTICS=postgresql://user:pass@localhost:5432/analytics
```

The part after `PG_DB_` becomes the database name exposed to MCP tools.

Examples:

- `PG_DB_PRIMARY=...` -> database name is `PRIMARY`
- `PG_DB_ANALYTICS=...` -> database name is `ANALYTICS`

These names are used exactly as provided.

### Command-Line Arguments

You can also pass database configs as CLI arguments:

```bash
node dist/index.js primary=postgresql://... analytics=postgresql://...
```

In this case, the MCP database names would be `primary` and `analytics`.

## Cursor Setup

### Option 1: `~/.cursor/mcp.json`

Add an MCP server entry like this:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "node",
      "args": [
        "/absolute/path/to/postgres-mcp/dist/index.js"
      ],
      "env": {
        "PG_DB_PRIMARY": "postgresql://postgres:postgres@localhost:5432/postgres"
      }
    }
  }
}
```

### Option 2: Cursor UI

You can also configure it through Cursor's MCP settings by creating a command-based MCP server that runs:

```bash
node /absolute/path/to/postgres-mcp/dist/index.js
```

and adding environment variables such as:

```bash
PG_DB_PRIMARY=postgresql://postgres:postgres@localhost:5432/postgres
```

### Option 3: Claude Code Setup

Claude Code can load this server globally, so it's available in every project you open. Register it once at user scope:

```bash
claude mcp add --scope user postgres \
  -e PG_DB_PRIMARY=postgresql://user:pass@localhost:5432/postgres \
  -- node /absolute/path/to/postgres-mcp/dist/index.js
```

- --scope user stores the server in ~/.claude.json at the top level, so it applies to all projects. The default local scope only applies to the directory where you ran the command.
- Add one -e PG_DB_<NAME>=... flag per database. The name after PG_DB_ is the database name the tools accept.
- Verify with claude mcp list. Inside a session, /mcp shows the server's status.

To remove it later:

claude mcp remove --scope user postgres

▎ Note: Because the server is global, every session can run arbitrary SQL against the configured databases. Use a read-only role for the connection string unless you need writes, and avoid committing connection strings with real passwords. Keep them in your shell environment or a local secrets manager instead.

## Available Tools

### `list_databases`

Returns the configured database names.

Example output:

```json
["PRIMARY", "ANALYTICS"]
```

### `list_tables`

Lists tables in the `public` schema for a configured database.

Input:

```json
{
  "database": "PRIMARY"
}
```

### `describe_table`

Returns schema information for a table.

Input:

```json
{
  "database": "PRIMARY",
  "table": "users"
}
```

### `execute_query`

Executes a SQL query against a configured database.

Input:

```json
{
  "database": "PRIMARY",
  "query": "SELECT * FROM users LIMIT 5"
}
```

## Important Note About Database Names

The `database` value you send to a tool must match the configured name exactly.

Examples:

- env var `PG_DB_PRIMARY=...` -> use `"database": "PRIMARY"`
- CLI arg `primary=...` -> use `"database": "primary"`

## Safety Warning

This server allows arbitrary SQL execution.

That means it can run read and write queries, including destructive statements.

Use it carefully:

- do not expose it to untrusted environments
- prefer a restricted database user when possible
- use a read-only role if you only want querying behavior

## Development

Build:

```bash
npm run build
```

Run directly:

```bash
node dist/index.js
```

Run with a configured database:

```bash
PG_DB_PRIMARY=postgresql://postgres:postgres@localhost:5432/postgres node dist/index.js
```

## Notes

- The old README used `cd pgmcp-test`, but the correct folder name for this repository is `postgres-mcp`.
- If you configure databases via environment variables, the MCP-exposed database names come from the suffix after `PG_DB_`.
- If you configure databases via CLI args, the MCP-exposed database names come from the argument name before `=`.
