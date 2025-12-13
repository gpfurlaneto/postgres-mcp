#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { Pool } from "pg";
import { z } from "zod";

// Parse command line arguments for database configurations
// Format: dbName=connectionUrl
const args = process.argv.slice(2);
console.log(args);
const dbConfigs: Record<string, string> = {};

args.forEach((arg) => {
  const [name, url] = arg.split("=", 2);
  if (name && url) {
    dbConfigs[name] = url;
  }
});

// Check environment variables for keys starting with PG_DB_
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("PG_DB_") && value) {
    const name = key.slice("PG_DB_".length);
    if (name) {
      dbConfigs[name] = value;
    }
  } else if (key === "MY_DB" && value) {
    dbConfigs["MY_DB"] = value;
  }
}

if (Object.keys(dbConfigs).length === 0) {
  console.error("No databases configured. Usage: mcp-server-pg <name>=<url> [<name>=<url>...] or set env vars PG_DB_<NAME>=<URL>");
  console.error("Server starting without configured databases. Please restart with configuration to use DB features.");
  // process.exit(1); // Allow server to start so configuration can be debugged/added later if supported
}

// Create connection pools
const pools: Record<string, Pool> = {};
for (const [name, url] of Object.entries(dbConfigs)) {
  pools[name] = new Pool({ connectionString: url });
}

const server = new Server(
  {
    name: "pgmcp-simplistic",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_query",
        description: "Execute a SQL query on a configured database. Supports SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, etc.",
        inputSchema: {
          type: "object",
          properties: {
            database: {
              type: "string",
              description: "The name of the database to query",
              enum: Object.keys(dbConfigs),
            },
            query: {
              type: "string",
              description: "The SQL query to execute",
            },
          },
          required: ["database", "query"],
        },
      },
      {
        name: "list_tables",
        description: "List tables in a configured database (public schema)",
        inputSchema: {
          type: "object",
          properties: {
            database: {
              type: "string",
              description: "The name of the database to query",
              enum: Object.keys(dbConfigs),
            },
          },
          required: ["database"],
        },
      },
      {
        name: "describe_table",
        description: "Get the schema information for a table",
        inputSchema: {
          type: "object",
          properties: {
            database: {
              type: "string",
              description: "The name of the database to query",
              enum: Object.keys(dbConfigs),
            },
            table: {
              type: "string",
              description: "The name of the table to describe",
            },
          },
          required: ["database", "table"],
        },
      },
      {
        name: "list_databases",
        description: "List all configured databases",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "list_databases": {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(Object.keys(dbConfigs), null, 2),
          },
        ],
      };
    }

    case "execute_query": {
      const { database, query } = request.params.arguments as { database: string; query: string };

      if (!dbConfigs[database]) {
        throw new McpError(ErrorCode.InvalidParams, `Database '${database}' not found`);
      }

      const pool = pools[database];
      
      try {
        const client = await pool.connect();
        try {
          const result = await client.query(query);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result.rows, null, 2),
              },
            ],
          };
        } finally {
          client.release();
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing query: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "list_tables": {
      const { database } = request.params.arguments as { database: string };
      if (!dbConfigs[database]) {
        throw new McpError(ErrorCode.InvalidParams, `Database '${database}' not found`);
      }
      
      const pool = pools[database];
      try {
        const client = await pool.connect();
        try {
          const result = await client.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result.rows, null, 2),
              },
            ],
          };
        } finally {
          client.release();
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error listing tables: ${error}` }],
          isError: true,
        };
      }
    }

    case "describe_table": {
      const { database, table } = request.params.arguments as { database: string; table: string };
      if (!dbConfigs[database]) {
        throw new McpError(ErrorCode.InvalidParams, `Database '${database}' not found`);
      }
      
      const pool = pools[database];
      try {
        const client = await pool.connect();
        try {
          const result = await client.query(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'",
            [table]
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result.rows, null, 2),
              },
            ],
          };
        } finally {
          client.release();
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error describing table: ${error}` }],
          isError: true,
        };
      }
    }

    default:
      throw new McpError(ErrorCode.MethodNotFound, "Unknown tool");
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PG MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

