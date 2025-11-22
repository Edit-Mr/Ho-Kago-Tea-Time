"""
Fix syntax errors in converted scrapers (extra parenthesis)
"""

from pathlib import Path
import re

def fix_syntax_error(file_path):
    """Fix the extra parenthesis in logger.info line"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix the extra parenthesis
    original = content
    content = re.sub(
        r'logger\.info\(f"Columns: \{df\.columns\.tolist\(\)\}"\)\)',
        'logger.info(f"Columns: {df.columns.tolist()}")',
        content
    )

    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Fixed {file_path.name}")
        return True
    else:
        print(f"  {file_path.name} - no fix needed")
        return False

def main():
    """Fix all scraper files"""
    scripts_dir = Path(__file__).parent
    fixed = 0

    for file_path in sorted(scripts_dir.glob('[0-9][0-9]_*.py')):
        if fix_syntax_error(file_path):
            fixed += 1

    print(f"\n✅ Fixed {fixed} files")

if __name__ == "__main__":
    main()
