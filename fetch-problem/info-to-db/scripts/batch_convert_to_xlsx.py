"""
Batch convert all CSV-based scrapers to XLSX format
"""

import os
import re
from pathlib import Path

def convert_scraper_to_xlsx(file_path):
    """Convert a single scraper file from CSV to XLSX format"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if already using BytesIO (already converted)
    if 'from io import BytesIO' in content:
        print(f"✓ {file_path.name} already converted")
        return False

    # Skip population (uses ODS) and youbike_fixed (already done)
    if '01_population' in file_path.name or 'fixed' in file_path.name:
        print(f"✓ {file_path.name} skipped (special format)")
        return False

    # Replace imports
    content = re.sub(
        r'from io import StringIO\nfrom utils import.*try_decode_csv',
        'from io import BytesIO\nfrom utils import get_connection, download_file, clean_text, safe_int, safe_float, log_progress',
        content
    )

    # If that didn't work, try alternative pattern
    if 'from io import StringIO' in content:
        content = content.replace('from io import StringIO', 'from io import BytesIO')
    if 'try_decode_csv' in content:
        content = re.sub(r',\s*try_decode_csv', '', content)

    # Change comment from CSV to XLSX
    content = re.sub(r'# Data URL \(CSV format\)', '# Data URL (XLSX format)', content)
    content = re.sub(r'# Download CSV file', '# Download file', content)

    # Remove CSV decoding logic
    content = re.sub(
        r'\s*# Decode CSV.*?\n\s*text = try_decode_csv\(content\).*?\n\s*if not text:.*?\n\s*logger\.error\(.*?\).*?\n\s*return\n',
        '',
        content,
        flags=re.DOTALL
    )

    # Replace CSV parsing with XLSX
    content = re.sub(
        r'# Parse CSV\n\s*df = pd\.read_csv\(\s*StringIO\(text\)[^\)]*\)',
        '# Parse XLSX (not CSV!)\n        df = pd.read_excel(BytesIO(content), engine=\'openpyxl\')\n\n        logger.info(f"Columns: {df.columns.tolist()}")',
        content
    )

    # Alternative CSV parsing pattern
    content = re.sub(
        r'df = pd\.read_csv\([^\)]*\)',
        'df = pd.read_excel(BytesIO(content), engine=\'openpyxl\')\n        logger.info(f"Columns: {df.columns.tolist()}")',
        content
    )

    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✓ {file_path.name} converted to XLSX")
    return True

def main():
    """Convert all scraper files"""
    scripts_dir = Path(__file__).parent
    converted = 0

    # Find all numbered scraper files
    for file_path in sorted(scripts_dir.glob('[0-9][0-9]_*.py')):
        if 'fixed' not in file_path.name:  # Skip already fixed files
            if convert_scraper_to_xlsx(file_path):
                converted += 1

    print(f"\n✅ Converted {converted} scraper files to XLSX format")

if __name__ == "__main__":
    main()
