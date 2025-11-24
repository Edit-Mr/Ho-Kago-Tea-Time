"""
Update all scrapers to use the universal read_excel_file function
"""

from pathlib import Path
import re

def update_scraper(file_path):
    """Update a single scraper to use read_excel_file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if already using read_excel_file
    if 'read_excel_file' in content:
        print(f"  {file_path.name} already updated")
        return False

    # Skip special files
    if '01_population' in file_path.name or 'fixed' in file_path.name:
        print(f"  {file_path.name} skipped (special format)")
        return False

    # Add read_excel_file to imports
    content = re.sub(
        r'from utils import (.*)',
        r'from utils import \1, read_excel_file',
        content
    )

    # Replace pd.read_excel with read_excel_file
    content = re.sub(
        r'df = pd\.read_excel\(BytesIO\(content\)(?:, engine=[\'"][^\'"]+[\'"])?\)',
        'df = read_excel_file(content)',
        content
    )

    # Remove BytesIO import if it's only used for read_excel
    if 'read_excel_file(content)' in content and 'BytesIO' in content:
        # Check if BytesIO is used elsewhere
        if content.count('BytesIO') == 1:  # Only in import
            content = content.replace('from io import BytesIO\n', '')

    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✓ Updated {file_path.name}")
    return True

def main():
    """Update all scraper files"""
    scripts_dir = Path(__file__).parent
    updated = 0

    for file_path in sorted(scripts_dir.glob('[0-9][0-9]_*.py')):
        if update_scraper(file_path):
            updated += 1

    print(f"\n✅ Updated {updated} files")

if __name__ == "__main__":
    main()
