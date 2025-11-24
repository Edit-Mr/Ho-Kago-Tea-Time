"""
Update all scraper scripts to use smart encoding detection
"""

import re
from pathlib import Path

def fix_script_encoding(script_path):
    """Fix encoding in a single script"""
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if already fixed
    if 'try_decode_csv' in content:
        return False

    # Add import
    old_import = r'(from utils import [^\n]+)'
    if 'try_decode_csv' not in content:
        new_import = r'\1, try_decode_csv'
        content = re.sub(old_import, new_import, content)

    # Add StringIO import if not present
    if 'from io import StringIO' not in content and 'from io import BytesIO' not in content:
        # Add after logging import
        content = re.sub(
            r'(import logging\n)',
            r'\1from io import StringIO\n',
            content
        )
    elif 'from io import BytesIO' in content:
        content = content.replace('from io import BytesIO', 'from io import StringIO')

    # Replace BytesIO pattern with try_decode_csv
    old_pattern = r'from io import BytesIO\s+df = pd\.read_csv\(BytesIO\(content\)[^\)]*\)'
    new_pattern = '''text = try_decode_csv(content)
        if not text:
            logger.error("Failed to decode CSV content")
            return
        df = pd.read_csv(StringIO(text))'''

    content = re.sub(old_pattern, new_pattern, content, flags=re.DOTALL)

    # Another pattern
    old_pattern2 = r'df = pd\.read_csv\(BytesIO\(content\)[^\)]*\)'
    new_pattern2 = '''text = try_decode_csv(content)
        if not text:
            logger.error("Failed to decode CSV content")
            return
        df = pd.read_csv(StringIO(text))'''

    content = re.sub(old_pattern2, new_pattern2, content)

    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return True


scripts_dir = Path(__file__).parent
scripts = list(scripts_dir.glob('[0-9][0-9]_*.py'))

print(f"Fixing encoding in {len(scripts)} scripts...")

for script in sorted(scripts):
    print(f"  {script.name}...", end=" ")
    if fix_script_encoding(script):
        print("✅")
    else:
        print("⏭️  (already fixed)")

print("\nDone!")
