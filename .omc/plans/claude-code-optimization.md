# Claude Code Optimization Plan

**Date:** 2026-03-06
**Status:** Revised v1.1
**Priority:** MEDIUM

---

## Change Log (v1.1)

| Date | Change | Author |
|------|--------|--------|
| 2026-03-06 | Initial version | Planner |
| 2026-03-06 | Added Action 1.1.5 verification step (critical) | Planner (per Architect review) |
| 2026-03-06 | Fixed rollback command syntax | Planner (per Architect review) |
| 2026-03-06 | Clarified Phase 3 MCP sources (plugin vs external) | Planner (per Architect review) |
| 2026-03-06 | Added pre-flight backup step | Planner |
| 2026-03-06 | Clarified version expectation (2.1.70+) | Planner |
| 2026-03-06 | Added PATH modification step | Planner |

---

## Executive Summary

This plan addresses four critical issues identified in the Claude Code diagnostic report:
1. Outdated version (2.1.50 vs 2.1.70 available via Homebrew)
2. Conflicting duplicate installations (native + Homebrew)
3. Auto-updates disabled via environment variable
4. Excessive MCP context usage (29,830 tokens > 25,000 threshold)

**Note:** Version 2.1.71 is the latest released, but Homebrew currently has 2.1.70. The plan targets 2.1.70+ as the minimum acceptable version.

---

## Current State Analysis

### Version Status
| Component | Current | Latest | Gap |
|-----------|---------|--------|-----|
| Claude Code | 2.1.50 | 2.1.71 | 21 versions |
| Homebrew Available | 2.1.50 | 2.1.70 | 20 versions |

**Notes:**
- "Latest" is the latest released version from official sources
- "Homebrew Available" is what's installable via Homebrew
- "Gap" is calculated as: Latest - Current

### Installation Conflicts
- **Native:** `~/.local/bin/claude` -> `~/.local/share/claude/versions/2.1.50`
- **Homebrew:** `/opt/homebrew/bin/claude` -> `/opt/homebrew/Caskroom/claude-code/2.1.70`
- **PATH Priority:** `~/.local/bin` precedes `/opt/homebrew/bin` (native takes precedence)
- **Impact:** Version 2.1.50 is being used despite 2.1.70 being available via Homebrew

### Auto-Updates
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` is set in `~/.claude/settings.json`
- Blocks automatic update checks and downloads
- Source: Environment configuration in Claude settings

### MCP Context Usage
| Server | Tools | Tokens |
|--------|-------|--------|
| plugin_oh-my-claudecode_t | 32 | ~7,456 |
| chrome-devtools | 29 | ~6,757 |
| claude-in-chrome | 17 | ~3,961 |
| pencil | 14 | ~3,262 |
| filesystem | 14 | ~3,262 |
| **Total** | **12+ servers** | **~29,830** |

---

## Root Cause Analysis

### 1. Outdated Version
- **Cause:** Auto-updates disabled + manual PATH priority to older installation
- **Effect:** Missing 21 versions of bug fixes, features, and performance improvements

### 2. Duplicate Installations
- **Cause:** Native installer (via Claude Code native install) + Homebrew cask
- **Effect:** Confusion about which version is active, wasted disk space (~370MB)

### 3. Auto-Updates Disabled
- **Cause:** Explicitly set in `~/.claude/settings.json` to prevent network traffic
- **Effect:** Requires manual intervention for updates

### 4. High MCP Context
- **Cause:** Multiple browser/devtool MCP servers registered simultaneously
- **Effect:** Reduced context available for actual code, potential performance degradation

---

## Optimization Plan

### Phase 0: Pre-Flight Backup (NEW)

**Action 0.1: Backup Configuration**
```bash
# Capture timestamp once
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create backup directory with timestamp
mkdir -p ~/.claude/backup-$TIMESTAMP

# Backup critical configuration
cp -a ~/.claude/settings.json ~/.claude/backup-$TIMESTAMP/
cp -a ~/.claude/.mcp.json ~/.claude/backup-$TIMESTAMP/ 2>/dev/null || true
```

**Acceptance Criteria:**
- Backup directory created with timestamp
- Configuration files successfully copied

**Risk:** NONE
- Read-only operation, no system modifications

---

### Phase 1: Update to Latest Version

**Action 1.1: Update Claude Code via Homebrew**
```bash
brew upgrade --cask claude-code
```

**Acceptance Criteria:**
- Homebrew installation updated to 2.1.70 or later
- Verify with: `brew list --cask --versions claude-code`

**Risk:** LOW
- Homebrew updates are well-tested
- **Note:** `brew reinstall --cask claude-code` does NOT rollback - it reinstalls the latest version

**Rollback Options:**
1. **Versioned cask (if available):**
   ```bash
   brew install --cask claude-code@2.1.50
   ```

2. **Extract previous version to tap:**
   ```bash
   brew extract claude-code local/tap --version 2.1.50
   brew install claude-code@2.1.50
   ```

3. **Restore native installation/backup** (see Rollback Plan section)

---

**Action 1.1.5: CRITICAL VERIFICATION STEP (NEW)**

**BEFORE removing the native installation, verify the Homebrew version is fully functional:**

```bash
# Temporarily prioritize Homebrew in PATH
export PATH="/opt/homebrew/bin:$PATH"

# Verify the correct binary is being used
which claude
# Expected output: /opt/homebrew/bin/claude

# Verify version is 2.1.70 or later
claude --version
# Expected output: Claude Code version 2.1.70 or higher

# Verify MCP servers load correctly
claude mcp list
# Expected output: List of MCP servers without errors

# Test basic functionality
claude --help
# Expected output: Help text displays correctly
```

**Acceptance Criteria:**
- `which claude` returns `/opt/homebrew/bin/claude`
- `claude --version` returns 2.1.70 or higher
- `claude mcp list` executes without errors
- `claude --help` displays correctly

**Risk:** NONE (verification only)
- This is a read-only verification step
- If any verification fails, DO NOT proceed to Action 1.2

**If Verification Fails:**
1. Document which step failed
2. Stop and investigate before proceeding
3. Keep native installation as fallback

---

**Action 1.2: Make PATH Change Permanent (NEW)**

After verification succeeds, make the Homebrew version the default by modifying your shell configuration:

```bash
# For zsh (default on macOS)
# Check if line already exists before adding (handles both quote styles)
if ! grep -q "export PATH=.*opt/homebrew/bin" ~/.zshrc 2>/dev/null; then
  echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
  echo "Added Homebrew to PATH"
else
  echo "Homebrew already in PATH, skipping"
fi
source ~/.zshrc

# Verify the change persists
which claude
```

**Acceptance Criteria:**
- PATH modification added to shell configuration
- New terminal sessions will use Homebrew version by default

**Risk:** LOW
- Reversible by editing ~/.zshrc

---

**Action 1.3: Remove Native Installation**
```bash
# Remove binary (force to avoid error if symlink doesn't exist)
rm -f ~/.local/bin/claude

# Remove old version directories
rm -rf ~/.local/share/claude/versions/2.1.50
rm -rf ~/.local/share/claude/versions/2.1.44
# Keep 2.1.52 as fallback
```

**Acceptance Criteria:**
- `which claude` returns `/opt/homebrew/bin/claude`
- `claude --version` shows 2.1.70 or later
- No duplicate installations in PATH
- Fallback version 2.1.52 preserved in `~/.local/share/claude/versions/`

**Risk:** MEDIUM
- Ensure Homebrew version is working before removing native
- Keep 2.1.52 as emergency fallback

---

### Phase 2: Configure Update Policy

**Action 2.1: Evaluate Auto-Update Policy**

**Question for User:**
> Do you want to enable auto-updates, or keep them disabled and update manually?

**Option A: Enable Auto-Updates (Recommended)**
- Remove `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` from `~/.claude/settings.json`
- Benefit: Automatic security patches and bug fixes
- Trade-off: Occasional network traffic for update checks

**Option B: Keep Disabled with Manual Schedule**
- Keep current setting
- Create monthly reminder to check for updates
- Benefit: Full control over update timing
- Trade-off: Risk of missing critical updates

**Acceptance Criteria:**
- Decision documented and implemented
- If enabled: verify auto-update works after next release
- If disabled: set up calendar reminder

**Risk:** LOW
- Either option is valid depending on workflow preferences

---

### Phase 3: Optimize MCP Context

**IMPORTANT: Understanding MCP Sources**

There are TWO sources of MCP servers:

1. **External MCP Servers** (defined in `~/.claude/.mcp.json`):
   - `context7` - Documentation query service
   - `github` - GitHub API integration
   - `cloudflare-api` - Cloudflare API access

2. **Plugin-Provided MCP Servers** (from oh-my-claudecode):
   - `chrome-devtools`: 29 tools (~6,757 tokens)
   - `claude-in-chrome`: 17 tools (~3,961 tokens)
   - `pencil`: 14 tools (~3,262 tokens)
   - Plus many others (32 total tools from plugin_oh-my-claudecode_t)

**Key Distinction:** Browser/devtool servers are NOT in `.mcp.json` - they come from the oh-my-claudecode PLUGIN and cannot be disabled via the external MCP configuration file.

---

**Action 3.1: Audit External MCP Servers**

Review active MCP servers in `~/.claude/.mcp.json`:
```json
{
  "mcpServers": {
    "context7": { ... },
    "github": { ... },
    "cloudflare-api": { ... }
  }
}
```

**Current:** 3 external servers + oh-my-claudecode plugin (provides browser/devtool servers)

---

**Action 3.2: Disable Plugin-Provided Browser DevTools**

The following servers contribute significantly to context but are NOT controlled by `.mcp.json`:
- `chrome-devtools`: 29 tools (~6,757 tokens) - from oh-my-claudecode plugin
- `claude-in-chrome`: 17 tools (~3,961 tokens) - from oh-my-claudecode plugin
- `pencil`: 14 tools (~3,262 tokens) - from oh-my-claudecode plugin

**Recommendation:**
- If not actively doing browser automation: disable chrome-devtools and claude-in-chrome
- If not doing design work: disable pencil
- These can be re-enabled via OMC skills when needed

**Action - To disable plugin-provided MCP servers:**

Modify `~/.claude/settings.json` to disable specific MCP tools. Add or modify the `disabledMcpServers` array:

```json
{
  "disabledMcpServers": [
    "chrome-devtools",
    "claude-in-chrome",
    "pencil"
  ]
}
```

Alternatively, create project-specific settings to disable only for certain projects.

---

**Action 3.3: Use Project-Scoped MCP Configuration**

Create `.claude/settings.local.json` in project directory for project-specific MCP server control:

```json
{
  "disabledMcpServers": [
    "chrome-devtools",
    "pencil"
  ]
}
```

This allows browser devtools to be available globally but disabled for projects that don't need them.

**Acceptance Criteria:**
- MCP context reduced below 25,000 tokens
- Only necessary servers active for current project
- Browser devtools available globally but disabled in specific projects

**Risk:** LOW
- MCP servers can be re-enabled instantly by editing settings
- No data loss when disabling servers

---

## Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| Claude Version | 2.1.70+ | 2.1.50 |
| Installations | 1 | 2 |
| MCP Context | <25,000 tokens | 29,830 tokens |
| Update Policy | Defined | Disabled |

---

## Rollback Plan

If issues arise after changes:

1. **Version Rollback (Homebrew):**
   ```bash
   # WARNING: brew reinstall --cask claude-code installs the LATEST version,
   # NOT a rollback. Use one of these methods instead:

   # Option A: Restore from native installation backup
   ln -sf ~/.local/share/claude/versions/2.1.52 ~/.local/bin/claude

   # Option B: Install specific version (if available in tap)
   brew install --cask claude-code@2.1.50

   # Option C: Extract and install specific version
   brew extract claude-code local/tap --version 2.1.50
   brew install claude-code@2.1.50
   ```

2. **Native Installation Restoration:**
   ```bash
   # To restore native installation from preserved fallback:
   ln -sf ~/.local/share/claude/versions/2.1.52 ~/.local/bin/claude
   # Or if you backed up 2.1.50:
   ln -sf ~/.local/share/claude/versions/2.1.50 ~/.local/bin/claude
   ```

3. **PATH Restoration:**
   ```bash
   # Remove the PATH line from ~/.zshrc that was added
   # Edit ~/.zshrc and remove: export PATH="/opt/homebrew/bin:$PATH"
   ```

4. **Settings Restoration:**
   ```bash
   # List available backups
   ls -ld ~/.claude/backup-*/

   # Restore from latest backup
   LATEST_BACKUP=$(ls -td ~/.claude/backup-*/ | head -1)
   cp "$LATEST_BACKUP/settings.json" ~/.claude/

   # Or restore from specific backup (edit timestamp as needed)
   # cp ~/.claude/backup-20260307-143022/settings.json ~/.claude/
   ```

---

## Compatibility Considerations

**oh-my-claudecode (OMC) Compatibility:**

- OMC is designed to work with Claude Code 2.1.x versions
- The jump from 2.1.50 to 2.1.70+ includes significant changes that may affect:
  - MCP server protocol handling
  - Agent orchestration behavior
  - State management formats

**Recommendation:**
- After updating, run a quick smoke test of common OMC skills:
  ```bash
  /oh-my-claudecode:autopilot --help
  /oh-my-claudecode:team --help
  ```
- Verify OMC state files are readable:
  ```bash
  cat ~/.omc/state/team-state.json  # Should be valid JSON
  ```

**Known Issues:**
- None reported for 2.1.50 -> 2.1.70+ migration
- If issues occur, check `.omc/logs/` for detailed error information

---

## Open Questions

1. **Auto-update preference:** Should auto-updates be enabled or remain disabled?
2. **Browser automation frequency:** How often are chrome-devtools and claude-in-chrome used?
3. **Design tools frequency:** Is the pencil MCP server actively used?

---

## Next Steps

1. User reviews and approves plan
2. Execute Phase 1 (Update)
3. Execute Phase 2 (Update Policy)
4. Execute Phase 3 (MCP Optimization)
5. Verify with: `claude --diagnostics`

---

**Generated by:** Planner Agent (oh-my-claudecode:planner)
**Document ID:** claude-code-optimization-20260306
**Revision:** v1.1 (incorporates Architect review feedback)
