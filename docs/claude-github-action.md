# Claude GitHub Action

The repository includes `.github/workflows/claude.yml` for `@claude` comments on issues and pull requests.

## What It Does

- Responds when a write-authorized repository user mentions `@claude`.
- Works on issue comments, PR comments, PR review comments, and issue bodies/titles.
- Lets Claude inspect the repo, answer questions, and prepare changes.
- Does not auto-merge.
- Does not use `pull_request_target`.

## Required GitHub Setup

1. Install the Claude GitHub app on this repository:
   `https://github.com/apps/claude`
2. Add the repository secret:
   `ANTHROPIC_API_KEY`
3. Keep the workflow permissions scoped to this repository.

## Usage

Comment on an issue or pull request:

```txt
@claude check why the install script is failing on macOS
```

or:

```txt
@claude implement this issue with a small PR and run npm run smoke
```

## Safety Notes

- Do not enable `allowed_non_write_users` on this public repo.
- Do not enable wildcard `allowed_bots`.
- Do not enable full output unless debugging in a private fork.
- Review Claude's branch or suggested PR before merging.
