"""Git Integration — GitHub/GitLab API Client.

Handles cloud-side Git operations:
  - Create Pull Requests with AI metadata
  - Manage branch protection rules
  - Receive and process webhooks (PR merged, review events)
  - Link PRs to AI sessions and transport requests
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class GitProvider(str, Enum):
    GITHUB = "github"
    GITLAB = "gitlab"


@dataclass
class PRMetadata:
    """Metadata attached to every AI-generated Pull Request."""
    title: str
    body: str
    source_branch: str
    target_branch: str = "main"
    session_id: Optional[str] = None
    model_used: Optional[str] = None
    confidence: Optional[float] = None
    transport_nr: Optional[str] = None
    objects_changed: list[str] = None
    labels: list[str] = None

    def __post_init__(self):
        self.objects_changed = self.objects_changed or []
        self.labels = self.labels or ["ai-generated", "review-required"]


class GitIntegration:
    """Git platform integration for PR management.

    Supports GitHub and GitLab APIs.
    """

    def __init__(
        self,
        provider: GitProvider,
        repo: str,              # "org/repo-name"
        token: str,             # PAT or App token
        base_url: Optional[str] = None,  # For GitHub Enterprise / self-hosted GitLab
    ):
        self.provider = provider
        self.repo = repo
        self.token = token

        if provider == GitProvider.GITHUB:
            self.base_url = base_url or "https://api.github.com"
            self.headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            }
        else:  # GitLab
            self.base_url = base_url or "https://gitlab.com/api/v4"
            self.headers = {"PRIVATE-TOKEN": token}

        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=self.headers,
            timeout=30.0,
        )

    async def close(self):
        await self._client.aclose()

    # ─── CREATE PULL REQUEST ────────────────────────────────

    async def create_pr(self, metadata: PRMetadata) -> dict:
        """Create a Pull Request with AI metadata in the description."""

        body = self._build_pr_body(metadata)

        if self.provider == GitProvider.GITHUB:
            resp = await self._client.post(
                f"/repos/{self.repo}/pulls",
                json={
                    "title": metadata.title,
                    "body": body,
                    "head": metadata.source_branch,
                    "base": metadata.target_branch,
                    "draft": False,
                },
            )
            resp.raise_for_status()
            pr_data = resp.json()

            # Add labels
            if metadata.labels:
                await self._client.post(
                    f"/repos/{self.repo}/issues/{pr_data['number']}/labels",
                    json={"labels": metadata.labels},
                )

            logger.info(f"GitHub PR created: #{pr_data['number']} — {metadata.title}")
            return {"number": pr_data["number"], "url": pr_data["html_url"]}

        else:  # GitLab
            project_id = self.repo.replace("/", "%2F")
            resp = await self._client.post(
                f"/projects/{project_id}/merge_requests",
                json={
                    "title": metadata.title,
                    "description": body,
                    "source_branch": metadata.source_branch,
                    "target_branch": metadata.target_branch,
                    "labels": ",".join(metadata.labels or []),
                },
            )
            resp.raise_for_status()
            mr_data = resp.json()
            logger.info(f"GitLab MR created: !{mr_data['iid']} — {metadata.title}")
            return {"number": mr_data["iid"], "url": mr_data["web_url"]}

    # ─── GET PR STATUS ──────────────────────────────────────

    async def get_pr_status(self, pr_number: int) -> dict:
        """Get the current status of a PR."""
        if self.provider == GitProvider.GITHUB:
            resp = await self._client.get(f"/repos/{self.repo}/pulls/{pr_number}")
            resp.raise_for_status()
            data = resp.json()
            return {
                "number": pr_number,
                "state": data["state"],
                "merged": data.get("merged", False),
                "reviews": data.get("requested_reviewers", []),
                "mergeable": data.get("mergeable"),
                "url": data["html_url"],
            }
        else:
            project_id = self.repo.replace("/", "%2F")
            resp = await self._client.get(f"/projects/{project_id}/merge_requests/{pr_number}")
            resp.raise_for_status()
            data = resp.json()
            return {
                "number": pr_number,
                "state": data["state"],
                "merged": data["state"] == "merged",
                "url": data["web_url"],
            }

    # ─── BRANCH PROTECTION ──────────────────────────────────

    async def setup_branch_protection(self, branch: str = "main") -> dict:
        """Set up branch protection rules (require reviews for AI code)."""
        if self.provider == GitProvider.GITHUB:
            resp = await self._client.put(
                f"/repos/{self.repo}/branches/{branch}/protection",
                json={
                    "required_status_checks": {
                        "strict": True,
                        "contexts": ["atc-check", "unit-tests", "syntax-check"],
                    },
                    "enforce_admins": True,
                    "required_pull_request_reviews": {
                        "required_approving_review_count": 1,
                        "dismiss_stale_reviews": True,
                    },
                    "restrictions": None,
                },
            )
            resp.raise_for_status()
            logger.info(f"Branch protection set for {branch}")
            return {"status": "protected", "branch": branch}
        else:
            project_id = self.repo.replace("/", "%2F")
            resp = await self._client.post(
                f"/projects/{project_id}/protected_branches",
                json={
                    "name": branch,
                    "push_access_level": 0,
                    "merge_access_level": 30,  # Developer
                    "allow_force_push": False,
                },
            )
            return {"status": "protected", "branch": branch}

    # ─── WEBHOOKS ───────────────────────────────────────────

    async def setup_webhook(self, callback_url: str, secret: str) -> dict:
        """Register a webhook for PR events."""
        if self.provider == GitProvider.GITHUB:
            resp = await self._client.post(
                f"/repos/{self.repo}/hooks",
                json={
                    "name": "web",
                    "active": True,
                    "events": ["pull_request", "pull_request_review", "push"],
                    "config": {
                        "url": callback_url,
                        "content_type": "json",
                        "secret": secret,
                    },
                },
            )
            resp.raise_for_status()
            return {"id": resp.json()["id"], "url": callback_url}
        else:
            project_id = self.repo.replace("/", "%2F")
            resp = await self._client.post(
                f"/projects/{project_id}/hooks",
                json={
                    "url": callback_url,
                    "merge_requests_events": True,
                    "push_events": True,
                    "token": secret,
                },
            )
            resp.raise_for_status()
            return {"id": resp.json()["id"], "url": callback_url}

    # ─── WEBHOOK HANDLER ────────────────────────────────────

    @staticmethod
    async def handle_webhook(provider: GitProvider, event_type: str, payload: dict) -> dict:
        """Process incoming webhook events.

        Returns action to take (e.g., trigger deployment after PR merge).
        """
        if provider == GitProvider.GITHUB:
            action = payload.get("action", "")

            if event_type == "pull_request":
                if action == "closed" and payload.get("pull_request", {}).get("merged"):
                    # PR merged → trigger deployment
                    pr = payload["pull_request"]
                    return {
                        "action": "deploy",
                        "pr_number": pr["number"],
                        "branch": pr["head"]["ref"],
                        "merged_by": pr.get("merged_by", {}).get("login", "unknown"),
                    }

                elif action == "opened":
                    # New PR → notify for review
                    return {
                        "action": "notify_review",
                        "pr_number": payload["pull_request"]["number"],
                        "title": payload["pull_request"]["title"],
                    }

            elif event_type == "pull_request_review":
                if action == "submitted":
                    review_state = payload.get("review", {}).get("state", "")
                    return {
                        "action": "review_update",
                        "pr_number": payload["pull_request"]["number"],
                        "state": review_state,  # "approved", "changes_requested"
                        "reviewer": payload.get("review", {}).get("user", {}).get("login", ""),
                    }

        return {"action": "noop"}

    # ─── PR BODY BUILDER ────────────────────────────────────

    def _build_pr_body(self, metadata: PRMetadata) -> str:
        """Build the PR description with AI metadata."""
        objects_list = "\n".join(f"  - `{o}`" for o in metadata.objects_changed) if metadata.objects_changed else "  _none_"

        return f"""## 🤖 AI-Generated Changes

> This PR was created by **ABAP Code Studio** using AI-assisted code generation.
> **Human review is mandatory before merge.**

### Session Info
| Field | Value |
|-------|-------|
| Session | `{metadata.session_id or 'N/A'}` |
| AI Model | `{metadata.model_used or 'auto'}` |
| Confidence | `{metadata.confidence:.2f if metadata.confidence else 'N/A'}` |
| Transport | `{metadata.transport_nr or 'N/A'}` |

### Objects Changed
{objects_list}

### Review Checklist
- [ ] Code logic is correct
- [ ] No security issues
- [ ] ABAP naming conventions followed
- [ ] ATC check passed
- [ ] Unit tests pass
- [ ] Transport request is correct

---
_Generated by [ABAP Code Studio](https://abap-studio.de) • Review required_
"""
