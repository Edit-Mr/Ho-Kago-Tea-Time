"""
Test all scrapers and report results
"""

import subprocess
import sys
from pathlib import Path

def test_scraper(script_path):
    """Test a single scraper"""
    try:
        result = subprocess.run(
            ['uv', 'run', 'python', script_path.name],
            cwd=script_path.parent,
            capture_output=True,
            text=True,
            timeout=60
        )

        # Check for success indicators
        if result.returncode == 0 and ('✅' in result.stdout or 'inserted' in result.stdout.lower()):
            # Extract record count if available
            lines = result.stdout.split('\n')
            for line in lines:
                if '✅ Completed' in line or 'inserted' in line.lower():
                    return ('success', line.strip())
            return ('success', 'Completed successfully')
        else:
            error_msg = result.stderr if result.stderr else result.stdout
            return ('error', error_msg[:200])

    except subprocess.TimeoutExpired:
        return ('timeout', 'Script timeout after 60s')
    except Exception as e:
        return ('error', str(e)[:200])

def main():
    """Test all scraper scripts"""
    scripts_dir = Path(__file__).parent

    results = []
    print("Testing all scrapers...\n")

    # Get all numbered scraper files
    scraper_files = sorted([
        f for f in scripts_dir.glob('[0-9][0-9]_*.py')
        if 'fixed' not in f.name and 'youbike.py' not in f.name  # Skip old youbike
    ])

    for script_path in scraper_files:
        script_name = script_path.name
        print(f"Testing {script_name}...", end=' ')

        status, message = test_scraper(script_path)
        results.append((script_name, status, message))

        if status == 'success':
            print(f"✅ {message}")
        elif status == 'timeout':
            print(f"⏱️  {message}")
        else:
            print(f"❌ {message}")

    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)

    success_count = sum(1 for _, status, _ in results if status == 'success')
    error_count = sum(1 for _, status, _ in results if status == 'error')
    timeout_count = sum(1 for _, status, _ in results if status == 'timeout')

    print(f"✅ Success: {success_count}/{len(results)}")
    print(f"❌ Errors: {error_count}/{len(results)}")
    print(f"⏱️  Timeouts: {timeout_count}/{len(results)}")

    if error_count > 0:
        print("\nFailed scrapers:")
        for name, status, message in results:
            if status == 'error':
                print(f"  - {name}: {message}")

    return 0 if error_count == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
