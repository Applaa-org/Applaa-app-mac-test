
import re

path = r'c:\Users\rahul\Documents\Applaa_Project\Applaa-Builder-v1\src\components\app-sidebar.tsx'
print(f"Reading {path}...")

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports: Keep BOTH Bot and Crown
content = re.sub(r'<<<<<<< HEAD\s+Bot\s+=======\s+Crown\s+>>>>>>> origin/master', r'  Bot,\n  Crown', content, count=1)

# 2. Auth hooks: Use master (Supabase + Profile)
content = re.sub(r'<<<<<<< HEAD\s+import \{ WordPressAuthDialog \}.*?import \{ UserProfile \}.*?=======(.*?)>>>>>>> origin/master', r'\1', content, count=1, flags=re.DOTALL)

# 3. Component State/Hooks: Use master
content = re.sub(r'<<<<<<< HEAD\s+const \{ isAuthenticated, user, isLoading: isAuthLoading \} = useWordPressAuth\(\);.*?navigate = useNavigate\(\);\s+=======(.*?)>>>>>>> origin/master', r'\1', content, count=1, flags=re.DOTALL)

# 4. Auth Button Click: Use master (navigate to profile)
content = re.sub(r'<<<<<<< HEAD\s+onClick=\{\(\) => \{.*?\}\}\s+=======(.*?)>>>>>>> origin/master', r'\1', content, count=1, flags=re.DOTALL)

# 5. Auth Label: Use master (Pro tier display)
content = re.sub(r'<<<<<<< HEAD\s+user\?\.display_name.*?\"U\"\s+=======(.*?)>>>>>>> origin/master', r'\1', content, count=1, flags=re.DOTALL)

# 6. User Profile Component: Remove it (master has empty block essentially or removed it)
content = re.sub(r'<<<<<<< HEAD\s+<WordPressUserProfile.*?/>\s+=======\s+>>>>>>> origin/master', '', content, count=1, flags=re.DOTALL)

if '<<<<<<<' in content:
    print("WARNING: Some conflicts were NOT fixed!")
else:
    print("All conflicts fixed!")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("File updated.")
