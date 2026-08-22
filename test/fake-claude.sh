#!/usr/bin/env bash

if [[ "$1" == "--version" ]]; then
  printf '2.1.230 (Claude Code)\n'
  exit 0
fi

if [[ "$1" == "auth" && "$2" == "status" ]]; then
  printf '{"loggedIn":true}\n'
  exit 0
fi

seen_bare=false
seen_print=false
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --bare)
      seen_bare=true
      shift
      ;;
    --print)
      seen_print=true
      shift
      ;;
    --add-dir)
      test -f "$2/.claude/skills/no-surprises/SKILL.md" || exit 2
      shift 2
      ;;
    --output-format|--permission-mode|--settings|--disallowedTools|--model)
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

$seen_bare && $seen_print || exit 2
printf 'fake implementation\n' > implemented.txt

printf '{"type":"system","subtype":"init"}\n'
printf '{"type":"assistant","message":{"content":[{"type":"text","text":"Working"}]}}\n'
printf '{"type":"result","subtype":"success","result":"Fake final response"}\n'
