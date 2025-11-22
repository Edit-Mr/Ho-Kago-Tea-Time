"""
Run all scrapers in sequence
"""

import subprocess
import sys
from pathlib import Path

def run_scraper(script_path):
    """Run a single scraper"""
    print(f"\n{'='*80}")
    print(f"Running {script_path.name}...")
    print('='*80)

    try:
        result = subprocess.run(
            ['uv', 'run', 'python', str(script_path)],
            cwd=script_path.parent,
            timeout=60
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print(f"⏱️  Timeout: {script_path.name}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Run all scrapers"""
    scripts_dir = Path(__file__).parent

    # Skip population (manual), 09_youbike.py (use 09_youbike_fixed.py instead)
    skip_files = ['01_population.py', '09_youbike.py', 'run_all.py']

    scraper_files = [
        f for f in sorted(scripts_dir.glob('[0-9][0-9]_*.py'))
        if f.name not in skip_files
    ]

    success = 0
    failed = 0

    for script_path in scraper_files:
        if run_scraper(script_path):
            success += 1
        else:
            failed += 1

    print(f"\n{'='*80}")
    print("SUMMARY")
    print('='*80)
    print(f"✅ Success: {success}/{len(scraper_files)}")
    print(f"❌ Failed: {failed}/{len(scraper_files)}")

    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
