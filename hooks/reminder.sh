#!/bin/sh
# No Surprises: always-on policy reminder for Claude Code.
#
# Runs on UserPromptSubmit. It prints a short static reminder to stdout, which
# Claude Code injects into the model's context for this turn. It makes no model
# or network call, needs no Node, Python or jq, and does not read its stdin.
#
# It always exits 0 so that a reminder failure can never block a prompt. The
# hook is also configured with a short timeout in hooks.json as a second guard.

cat <<'REMINDER'
No Surprises is active. During substantial implementation, inspect project decisions (instructions, docs, manifests, established patterns) before acting. If an unresolved choice would materially affect product behaviour, architecture, data, authorisation, privacy, security, cost, an external provider, a public contract or requested scope, apply the No Surprises policy: Go for routine choices; Log a reversible consequential choice in the final receipt; for a Gate, call AskUserQuestion before any dependent Edit, Write, Bash, migration, install or delegated implementation. Keep routine work autonomous; do not turn it into approval requests.
REMINDER

exit 0
