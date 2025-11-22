"""
Utility functions for data scraping scripts
"""

import requests
import sqlite3
from pathlib import Path
from typing import Optional
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Database path
DB_PATH = Path(__file__).parent.parent / "hsinchu_data.db"

# Base URL for Hsinchu Open Data
BASE_URL = "https://opendata.hccg.gov.tw"


def get_connection():
    """Get database connection"""
    return sqlite3.connect(DB_PATH)


def download_file(url: str, timeout: int = 30, encoding: str = None) -> Optional[bytes]:
    """
    Download file from URL

    Args:
        url: URL to download from
        timeout: Request timeout in seconds
        encoding: Force specific encoding (optional)

    Returns:
        File content as bytes, or None if failed
    """
    try:
        # Construct full URL if relative
        if url.startswith('/'):
            url = BASE_URL + url

        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }

        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()

        # If specific encoding requested, decode and re-encode
        if encoding:
            try:
                text = response.content.decode(encoding)
                return text.encode('utf-8')
            except (UnicodeDecodeError, LookupError):
                logging.warning(f"Failed to decode with {encoding}, returning raw bytes")
                return response.content

        return response.content

    except requests.RequestException as e:
        logging.error(f"Failed to download from {url}: {e}")
        return None


def try_decode_csv(content: bytes) -> Optional[str]:
    """
    Try to decode CSV content with multiple encodings

    Args:
        content: Raw bytes content

    Returns:
        Decoded text or None if all attempts fail
    """
    # Try common Chinese/Taiwan encodings in order
    encodings = ['utf-8-sig', 'utf-8', 'big5', 'cp950', 'gb2312', 'gbk', 'latin-1']

    for encoding in encodings:
        try:
            text = content.decode(encoding)
            logging.debug(f"Successfully decoded with {encoding}")
            return text
        except (UnicodeDecodeError, LookupError):
            continue

    logging.error("Failed to decode content with any known encoding")
    return None


def clean_text(text) -> Optional[str]:
    """Clean and normalize text field"""
    if text is None or text == '':
        return None
    return str(text).strip()


def safe_int(value) -> Optional[int]:
    """Safely convert value to integer"""
    if value is None or value == '':
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def safe_float(value) -> Optional[float]:
    """Safely convert value to float"""
    if value is None or value == '':
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def read_excel_file(content: bytes):
    """
    Read data file (Excel XLS/XLSX or CSV formats)

    Args:
        content: Raw bytes content from download

    Returns:
        pandas DataFrame
    """
    import pandas as pd
    from io import BytesIO, StringIO

    # Check file signature to determine format
    if content[:4] == b'PK\x03\x04':
        # XLSX format (ZIP-based)
        return pd.read_excel(BytesIO(content), engine='openpyxl')
    elif content[:8] == b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1':
        # XLS format (OLE2/CFBF)
        return pd.read_excel(BytesIO(content), engine='xlrd')
    elif content[:3] == b'\xef\xbb\xbf' or b',' in content[:1000]:
        # CSV format (with or without UTF-8 BOM)
        text = try_decode_csv(content)
        if text:
            return pd.read_csv(StringIO(text), on_bad_lines='skip')
        else:
            raise ValueError("Failed to decode CSV content")
    else:
        # Try Excel engines as fallback
        try:
            return pd.read_excel(BytesIO(content), engine='openpyxl')
        except:
            try:
                return pd.read_excel(BytesIO(content), engine='xlrd')
            except:
                # Last resort: try as CSV
                text = try_decode_csv(content)
                if text:
                    return pd.read_csv(StringIO(text), on_bad_lines='skip')
                else:
                    raise ValueError("Unknown file format")


def log_progress(script_name: str, records_processed: int, records_inserted: int, errors: int = 0):
    """Log script execution progress"""
    logger = logging.getLogger(script_name)
    logger.info(f"✅ Completed: {records_processed} processed, {records_inserted} inserted, {errors} errors")


def truncate_table(table_name: str):
    """Truncate a table (delete all records)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(f"DELETE FROM {table_name}")
    conn.commit()
    conn.close()
    logging.info(f"Truncated table: {table_name}")
