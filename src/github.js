const API_VERSION = "2022-11-28";

export async function ensureGitHubIssue({
  token,
  repository,
  assignee,
  key,
  title,
  text,
  targetUrl,
  fetchImpl = fetch
}) {
  if (!token || !repository || !assignee) {
    throw new Error("GITHUB_TOKEN, GITHUB_REPOSITORY, and GITHUB_NOTIFY_USER are required for GitHub notification.");
  }
  if (!/^[^/]+\/[^/]+$/.test(repository)) {
    throw new Error("GITHUB_REPOSITORY must use the owner/repository format.");
  }

  const marker = `<!-- nudch-notification:${key} -->`;
  const repositoryPath = repository.split("/").map(encodeURIComponent).join("/");
  const endpoint = `https://api.github.com/repos/${repositoryPath}/issues`;
  const headers = {
    "accept": "application/vnd.github+json",
    "authorization": `Bearer ${token}`,
    "content-type": "application/json",
    "x-github-api-version": API_VERSION,
    "user-agent": "nudch-appointment-monitor"
  };

  const existingResponse = await fetchImpl(`${endpoint}?state=all&per_page=100`, {
    headers,
    signal: AbortSignal.timeout(15_000)
  });
  if (!existingResponse.ok) {
    throw new Error(`GitHub issue lookup failed with HTTP ${existingResponse.status}.`);
  }

  const issues = await existingResponse.json();
  if (issues.some((issue) => String(issue.body ?? "").includes(marker))) {
    return { created: false };
  }

  const body = [marker, text, "", `[Otvoriť rezervačný portál](${targetUrl})`].join("\n");
  const createResponse = await fetchImpl(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ title, body, assignees: [assignee] }),
    signal: AbortSignal.timeout(15_000)
  });
  if (!createResponse.ok) {
    throw new Error(`GitHub issue creation failed with HTTP ${createResponse.status}.`);
  }

  return { created: true };
}
