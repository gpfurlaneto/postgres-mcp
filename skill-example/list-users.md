---
name: list-users
description: List users from the PRIMARY Postgres database. If the user gives a name, filter by it (case-insensitive, partial match). Otherwise list all users.
---

# List Users

Read-only. Run the query right away, with no confirmation needed.

## Steps

1. **Check for a name.** If the request includes a name (for example
   `/list-users alice`), use it as the filter. If not, list everyone.
2. **Build the query** with `mcp__postgres__execute_query` and
   `database: "PRIMARY"`:
   - With a name:
     `SELECT id, name, created_at, status FROM users WHERE name ILIKE '%<name>%' ORDER BY id;`
   - Without a name:
     `SELECT id, name, created_at, status FROM users ORDER BY id;`
3. **Escape the name.** Replace each single quote `'` with two single quotes
   `''` before putting it in the query.
4. **Show the result** as a table. If there are no rows, say
   "No users found" and include the name you searched for, if any.

## Rules

- Only run SELECT statements in this skill.
- Run one query per tool call.
- If the query fails, show the error and stop.
