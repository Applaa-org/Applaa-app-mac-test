
import re
import os

path = r'c:\Users\rahul\Documents\Applaa_Project\Applaa-Builder-v1\src\ipc\handlers\app_handlers.ts'
print(f"Reading {path}...")

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<<<<<<< HEAD\s+.*?>>>>>>> origin/master'
replacement = r'''      // Check tier-based app limits (use async to get latest tier from database)
      const { canCreateAppAsync } = await import("../utils/feature_checks");
      const appLimitCheck = await canCreateAppAsync();
      if (!appLimitCheck.allowed) {
        throw new Error(appLimitCheck.reason || "APP_LIMIT_REACHED");
      }

      // Legacy auth check (keep for backwards compatibility)
      const existingApps = db.$client.prepare("SELECT COUNT(*) as count FROM apps").get() as { count: number };
      const FREE_UNAUTH_LIMIT = 3;
      const { isUserAuthenticated } = await import("../../lib/supabase");
      const isAuthenticated = await isUserAuthenticated();

      // Require authentication after 3 apps (only if not already checked by tier)
      if (!isAuthenticated && existingApps.count >= FREE_UNAUTH_LIMIT) {
        throw new Error(`AUTH_REQUIRED_APP_LIMIT:${FREE_UNAUTH_LIMIT}`);
      }'''

# Use dotall to match across lines
new_content = re.sub(pattern, replacement, content, count=1, flags=re.DOTALL)

if content == new_content:
    print("No changes made! Pattern not found.")
    # Debug: print matching context
    match = re.search(r'<<<<<<< HEAD', content)
    if match:
        print("Found START marker at:", match.start())
        print(content[match.start():match.start()+100])
    else:
        print("START marker not found.")
else:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully fixed conflicts!")
