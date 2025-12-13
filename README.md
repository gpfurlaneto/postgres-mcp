# Simple PostgreSQL MCP Server

A simplistic [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for PostgreSQL. This server allows LLMs (like Cursor's AI) to interact with your PostgreSQL databases to list tables, describe schemas, and execute queries.

## Features

- **Manage Multiple Databases**: Configure connections to multiple databases simultaneously.
- **List Tables**: View all tables in the public schema.
- **Describe Tables**: Get schema details (columns, types) for specific tables.
- **Execute Queries**: Run SQL queries directly. **Supports SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, etc.**

## Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd pgmcp-test
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Build the project**:
    ```bash
    npm run build
    ```

The compiled server will be at `dist/index.js`.

## Configuration

You can configure databases using **Environment Variables** (recommended) or **Command Line Arguments**.

### 1. Environment Variables
Set environment variables starting with `PG_DB_`. The suffix becomes the database name.

-   `PG_DB_PRIMARY=postgresql://user:pass@localhost:5432/main_db`
-   `PG_DB_ANALYTICS=postgresql://user:pass@localhost:5432/analytics`

### 2. Command Line Arguments
Pass arguments in the format `name=connection_string`.

```bash
node dist/index.js primary=postgresql://... analytics=postgresql://...
```

## Usage with Cursor

To use this with [Cursor](https://cursor.sh):

1.  Go to **Settings** > **Features** > **MCP**.
2.  Click **+ Add New MCP Server**.
3.  Fill in the details:
    -   **Name**: `postgres`
    -   **Type**: `command`
    -   **Command**: `node /absolute/path/to/pgmcp-test/dist/index.js`
4.  **Environment Variables**: Add your database connections here.
    -   Key: `PG_DB_MYAPP`
    -   Value: `postgresql://postgres:password@localhost:5432/myapp`

### Tools Available

-   **`list_databases`**: Returns a list of configured database names.
-   **`list_tables`**: Lists all tables in a specific database.
    -   *Input*: `{ "database": "MYAPP" }`
-   **`describe_table`**: Shows columns and types for a table.
    -   *Input*: `{ "database": "MYAPP", "table": "users" }`
-   **`execute_query`**: Runs raw SQL.
    -   *Input*: `{ "database": "MYAPP", "query": "SELECT * FROM users LIMIT 5" }`

## ⚠️ Safety Warning

This MCP server allows **arbitrary SQL execution**. It does not sanitize or restrict queries to read-only operations.

-   **Do not expose this server to untrusted environments.**
-   **Use a database user with limited permissions** (e.g., `READ ONLY` if you only want the AI to query data).
-   Be cautious when asking the AI to modify data.

