# Bitacora CLI Workflows

## Bootstrap + Skill Update

```bash
# bootstrap deterministic memory
bitacora init

# later, after upgrading bitacora-cli, refresh only the skill + lock entry
bitacora skill
```

## Track Work + Completion + Compaction

```bash
# create next sequential track
bitacora new-track

# append progress
bitacora log --track-id TRACK-001 --message "implemented parser"
bitacora log --track-id TRACK-001 --message "TEST: npm test -- --run tests/core/parser.test.ts -> pass"

# compact and mark completed in one command
bitacora compact --track-id TRACK-001 --complete
```

## Completion Gate Failures

```bash
# If #Tasks still contains '- [ ]' or #Log has no TEST: line, this exits with code 1
bitacora compact --track-id TRACK-001 --complete
```

## History Access

```bash
# metadata/path only
bitacora history --track-id TRACK-001

# full archived content
bitacora history --track-id TRACK-001 --show
```

## Project Root Override

```bash
bitacora skill --root /path/to/project
bitacora compact --all --dry-run --root /path/to/project
```
