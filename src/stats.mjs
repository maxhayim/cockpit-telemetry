// Gather a user's GitHub stats for the cockpit telemetry: profile, repos, languages, contributions, recent events.
// The GraphQL API needs a token; the events feed is public.

const QUERY = `query($login: String!) {
  user(login: $login) {
    login name createdAt
    followers { totalCount }
    following { totalCount }
    pullRequests { totalCount }
    issues { totalCount }
    repositories(ownerAffiliations: OWNER, first: 100, orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes {
        name isFork isArchived stargazerCount forkCount pushedAt
        primaryLanguage { name color }
        languages(first: 12) { edges { size node { name color } } }
      }
    }
    contributionsCollection {
      totalCommitContributions totalPullRequestContributions totalIssueContributions
      totalPullRequestReviewContributions restrictedContributionsCount
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
  }
}`;

const headers = (token) => ({ Authorization: `bearer ${token}`, "User-Agent": "cockpit-telemetry" });

async function graphql(user, token) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { login: user } }),
  });
  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`);
  return json.data.user;
}

async function events(user, token) {
  const res = await fetch(`https://api.github.com/users/${user}/events/public?per_page=100`, { headers: headers(token) });
  if (!res.ok) return [];
  return res.json();
}

export async function getStats(user, token, { timeZone = "UTC" } = {}) {
  if (!token) throw new Error("A GITHUB_TOKEN is needed to read profile stats");
  const [u, evs] = await Promise.all([graphql(user, token), events(user, token)]);
  const own = u.repositories.nodes.filter((r) => !r.isFork);

  const langs = {};
  for (const r of own) for (const e of r.languages.edges) {
    const l = (langs[e.node.name] ||= { name: e.node.name, color: e.node.color, size: 0 });
    l.size += e.size;
  }
  const total = Object.values(langs).reduce((s, l) => s + l.size, 0) || 1;
  const languages = Object.values(langs).sort((a, b) => b.size - a.size)
    .map((l) => ({ ...l, pct: l.size / total }));

  const days = u.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
  const c = u.contributionsCollection;

  // Hour-of-day histogram and a short log from the public events feed.
  const hours = Array(24).fill(0);
  const hourOf = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone });
  for (const e of evs) hours[+hourOf.format(new Date(e.created_at)) % 24]++;
  const log = [...evs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 7).map((e) => ({
    at: e.created_at, type: e.type.replace(/Event$/, ""), repo: e.repo.name,
    detail: e.type === "PushEvent" ? `${e.payload.size ?? e.payload.commits?.length ?? 1} commit(s)`
      : e.payload.action || e.payload.ref_type || "",
  }));

  return {
    login: u.login, name: u.name || u.login, createdAt: u.createdAt,
    followers: u.followers.totalCount, following: u.following.totalCount,
    pullRequests: u.pullRequests.totalCount, issues: u.issues.totalCount,
    repoCount: u.repositories.totalCount,
    stars: own.reduce((s, r) => s + r.stargazerCount, 0),
    forks: own.reduce((s, r) => s + r.forkCount, 0),
    repos: own.slice(0, 10).map((r) => ({ name: r.name, stars: r.stargazerCount, pushedAt: r.pushedAt, lang: r.primaryLanguage?.name })),
    languages,
    contributions: c.contributionCalendar.totalContributions,
    commits: c.totalCommitContributions, prs: c.totalPullRequestContributions,
    issuesOpened: c.totalIssueContributions, reviews: c.totalPullRequestReviewContributions,
    days: days.map((d) => d.contributionCount),
    hours, log, timeZone,
    generatedAt: new Date().toISOString(),
  };
}
