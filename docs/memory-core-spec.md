# Memory Core Spec

The memory core is a local SQLite database at:

```txt
~/.neon-agent/memory/memory.sqlite
```

## Tables

`memories`

- `id`
- `title`
- `body`
- `tags_json`
- `source`
- `created_at`
- `updated_at`

`memories_fts`

- FTS5 index over title, body, and tags.

## CLI Contract

```bash
neon memory init
neon memory add --title "Decision" --body "Use explicit approval before sending." --tags decision,policy
neon memory search "approval"
neon memory list
```

## Builder Notes

- Keep memory owner-controlled.
- Store summaries and decisions, not secrets.
- Do not import another user's private memory database.
- Add embeddings later as an optional layer; FTS search is the install-safe base.
