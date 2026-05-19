import { readFile } from "node:fs/promises";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_CONTENT_LIMIT = 2000;
const EMBED_DESCRIPTION_LIMIT = 1200;
const EMBED_TITLE_LIMIT = 256;

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function truncate(value, limit) {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function compactBody(body) {
  return body
    .replace(/```[\s\S]*?```/g, "[code block]")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join("\n");
}

function normalizeIssue(issue, repositoryFullName) {
  const number = Number(issue.number);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error("Issue payload is missing a valid issue number.");
  }
  const title = typeof issue.title === "string" && issue.title.trim() ? issue.title.trim() : `Issue #${number}`;
  const htmlUrl = typeof issue.html_url === "string" && issue.html_url.trim() ? issue.html_url.trim() : undefined;
  if (!htmlUrl) {
    throw new Error("Issue payload is missing html_url.");
  }
  const user = issue.user && typeof issue.user === "object" && "login" in issue.user
    ? String(issue.user.login)
    : "unknown";
  const body = typeof issue.body === "string" ? issue.body : "";
  return {
    number,
    title,
    url: htmlUrl,
    author: user,
    body,
    repository: repositoryFullName || process.env.GITHUB_REPOSITORY || "unknown/repo",
  };
}

async function loadIssueFromEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    return null;
  }
  const event = JSON.parse(await readFile(eventPath, "utf8"));
  if (!event.issue) {
    return null;
  }
  return normalizeIssue(event.issue, event.repository?.full_name);
}

async function fetchIssueFromGitHub(issueNumber) {
  const repository = requireEnv("GITHUB_REPOSITORY");
  const token = requireEnv("GITHUB_TOKEN");
  const response = await fetch(`https://api.github.com/repos/${repository}/issues/${issueNumber}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub issue fetch failed: ${response.status} ${truncate(text, 300)}`);
  }
  return normalizeIssue(await response.json(), repository);
}

async function resolveIssue() {
  const eventIssue = await loadIssueFromEvent();
  if (eventIssue) {
    return eventIssue;
  }
  const issueNumber = process.env.ISSUE_NUMBER?.trim();
  if (!issueNumber) {
    throw new Error("No issue event payload or ISSUE_NUMBER was provided.");
  }
  return fetchIssueFromGitHub(issueNumber);
}

function buildDiscordPayload(issue) {
  const command = `fix github issue #${issue.number} in ${issue.repository}`;
  const bodyPreview = compactBody(issue.body);
  const content = truncate(
    [
      `New GitHub issue in ${issue.repository}: #${issue.number}`,
      issue.title,
      "",
      `Say in Discord: ${command}`,
    ].join("\n"),
    DISCORD_CONTENT_LIMIT,
  );

  return {
    content,
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: truncate(`#${issue.number} ${issue.title}`, EMBED_TITLE_LIMIT),
        url: issue.url,
        description: bodyPreview ? truncate(bodyPreview, EMBED_DESCRIPTION_LIMIT) : "No issue body.",
        color: 3447003,
        fields: [
          { name: "Author", value: issue.author, inline: true },
          { name: "Command", value: `\`${command}\``, inline: true },
        ],
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            label: "Fix issue",
            custom_id: `neon:github:fix:${issue.repository}:${issue.number}`,
          },
          {
            type: 2,
            style: 5,
            label: "Open issue",
            url: issue.url,
          },
        ],
      },
    ],
  };
}

async function sendDiscordMessage(payload) {
  const channelId = process.env.DISCORD_ISSUE_NOTIFY_CHANNEL_ID?.trim() || process.env.DISCORD_CHANNEL_ID?.trim();
  if (!channelId) {
    throw new Error("Missing DISCORD_ISSUE_NOTIFY_CHANNEL_ID or DISCORD_CHANNEL_ID.");
  }

  if (process.env.DISCORD_DRY_RUN === "1") {
    console.log(JSON.stringify({ channelId, payload }, null, 2));
    return;
  }

  const token = requireEnv("DISCORD_BOT_TOKEN");
  const response = await fetch(`${DISCORD_API_BASE}/channels/${encodeURIComponent(channelId)}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bot ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord notification failed: ${response.status} ${truncate(text, 300)}`);
  }
}

const issue = await resolveIssue();
await sendDiscordMessage(buildDiscordPayload(issue));
