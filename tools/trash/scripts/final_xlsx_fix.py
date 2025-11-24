"""
Final comprehensive fix to convert all scrapers to XLSX format properly
"""

from pathlib import Path
import re

def fix_scraper(file_path):
    """Fix a single scraper file completely"""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    skip_until_df = False

    for i, line in enumerate(lines):
        # Skip old CSV parsing block
        if 'text = try_decode_csv(content)' in line:
            skip_until_df = True
            continue
        elif skip_until_df and ('df = pd.read' in line):
            # Replace with XLSX parsing
            indent = len(line) - len(line.lstrip())
            new_lines.append(' ' * indent + '# Parse XLSX (not CSV!)\n')
            new_lines.append(' ' * indent + 'df = pd.read_excel(BytesIO(content), engine=\'openpyxl\')\n')
            new_lines.append(' ' * indent + 'logger.info(f"Columns: {df.columns.tolist()}")\n')
            new_lines.append('\n')
            skip_until_df = False
            continue
        elif skip_until_df:
            continue

        # Keep line
        new_lines.append(line)

    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    print(f"✓ Fixed {file_path.name}")

def main():
    """Fix all scraper files"""
    scripts_dir = Path(__file__).parent

    # Fix all numbered scrapers except 01, 02, 03, and 09_fixed
    for file_path in sorted(scripts_dir.glob('[0-9][0-9]_*.py')):
        if '01_population' in file_path.name:
            continue  # Special format
        if file_path.name in ['02_parks.py', '03_playgrounds.py', '09_youbike_fixed.py']:
            continue  # Already manually fixed

        fix_scraper(file_path)

    print(f"\n✅ All files fixed")

if __name__ == "__main__":
    main()
