#!/usr/bin/env python
# NOTE: Filename contains `company_settings`. The script now seeds `system_settings` records
# (columns: `email_notifications`, `admin_alerts`, etc.). Filename was kept for backwards compatibility.
"""
Seed System Settings Script

Initializes default system_settings records for all existing companies in the database.
Run this script after applying the 20260531_add_company_settings.sql migration.

Usage:
    cd backend
    python scripts/seed_company_settings.py [--dry-run]

This script:
- Queries unique companies from tickets table (with pagination)
- Creates default system_settings record for each (batch insert)
- Sets default values:
    - auto_close_enabled: true
    - auto_close_days: 7
    - email_notifications: true
    - admin_alerts: true
    - digest_frequency: 'daily'
"""

import os
import sys
import argparse
import logging
from datetime import datetime, timezone

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[SeedCompanySettings] %(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Pagination page size (Supabase default is 1000)
PAGE_SIZE = 1000


def _build_client():
    """Build a shared Supabase client with env-var validation.

    Raises:
        EnvironmentError: If required env vars are missing.
    """
    from supabase import create_client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise EnvironmentError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment. "
            "Check your .env file or export them before running this script."
        )

    return create_client(url, key)


def _fetch_all_pages(supabase, table: str, columns: str) -> list[dict]:
    """Fetch all rows from a table using range-based pagination.

    Supabase defaults to 1 000 rows per request. This helper loops until
    every page has been consumed so no rows are silently truncated.

    Args:
        supabase: Authenticated Supabase client.
        table: Table name to query.
        columns: Comma-separated column names for .select().

    Returns:
        Complete list of matching rows.
    """
    all_rows: list[dict] = []
    offset = 0

    while True:
        response = (
            supabase.table(table)
            .select(columns)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        page = response.data or []
        all_rows.extend(page)

        if len(page) < PAGE_SIZE:
            # Last page (or empty)
            break
        offset += PAGE_SIZE

    return all_rows


def seed_company_settings(dry_run: bool = False) -> dict:
    """Seed system_settings for all companies found in the tickets table.

    Args:
        dry_run: If True, log intended inserts without writing to the database.

    Returns:
        Dict with status and counts.
    """
    supabase = _build_client()

    logger.info("Starting company settings seed script...")
    if dry_run:
        logger.info("[DRY RUN] No changes will be written to the database.")

    try:
        # Step 1: Get all unique companies from tickets table (paginated)
        logger.info("Fetching all unique companies from tickets table...")

        all_tickets = _fetch_all_pages(supabase, "tickets", "company_id")
        if not all_tickets:
            logger.warning("No tickets found. Database may be empty.")
            return {"status": "no_tickets", "created_count": 0}

        unique_companies = list({
            t["company_id"]
            for t in all_tickets
            if t.get("company_id")
        })
        logger.info(f"Found {len(unique_companies)} unique companies")

        # Step 2: Get existing system_settings to avoid duplicates (paginated)
        logger.info("Fetching existing system_settings...")

        existing_rows = _fetch_all_pages(supabase, "system_settings", "company_id")
        existing_companies = {
            s["company_id"]
            for s in existing_rows
            if s.get("company_id")
        }
        logger.info(f"Found {len(existing_companies)} existing system_settings")

        # Step 3: Determine which companies need settings created
        companies_to_create = [
            c for c in unique_companies if c not in existing_companies
        ]
        logger.info(f"Need to create settings for {len(companies_to_create)} companies")

        if not companies_to_create:
            logger.info("All companies already have settings. Nothing to do.")
            return {"status": "complete", "created_count": 0}

        # Step 4: Batch insert default settings
        now = datetime.now(timezone.utc).isoformat()
        records = [
            {
                "company_id": company_id,
                "auto_close_enabled": True,
                "auto_close_days": 7,
                "email_notifications": True,
                "admin_alerts": True,
                "digest_frequency": "daily",
                "created_at": now,
            }
            for company_id in companies_to_create
        ]

        if dry_run:
            logger.info(f"[DRY RUN] Would insert {len(records)} system_settings records:")
            for r in records[:10]:
                logger.info(f"  - {r['company_id']}")
            if len(records) > 10:
                logger.info(f"  ... and {len(records) - 10} more")
            return {"status": "dry_run", "would_create": len(records)}

        # Single batch insert instead of N individual inserts
        logger.info(f"Inserting {len(records)} system_settings records...")
        supabase.table("system_settings").insert(records).execute()

        logger.info(f"Seed complete: {len(records)} created")
        return {"status": "success", "created_count": len(records)}

    except EnvironmentError:
        raise
    except Exception as e:
        logger.error(f"Fatal error during seed: {str(e)}")
        return {"status": "error", "message": str(e)}


def verify_seed(supabase=None) -> bool:
    """Verify that seed was successful.

    Args:
        supabase: Optional pre-built client. If None, creates a new one.

    Returns:
        True if all companies have settings, False otherwise.
    """
    if supabase is None:
        supabase = _build_client()

    logger.info("Verifying seed results...")

    try:
        # Paginated fetch for both tables
        all_tickets = _fetch_all_pages(supabase, "tickets", "company_id")
        all_settings = _fetch_all_pages(supabase, "system_settings", "company_id")

        companies_count = len({
            t["company_id"] for t in all_tickets if t.get("company_id")
        })
        settings_count = len({
            s["company_id"] for s in all_settings if s.get("company_id")
        })

        logger.info(
            f"Verification: {companies_count} unique companies, "
            f"{settings_count} system_settings"
        )

        if companies_count == settings_count:
            logger.info("✓ Verification passed: All companies have settings!")
            return True
        else:
            missing = companies_count - settings_count
            logger.warning(f"✗ Verification failed: {missing} companies missing settings")
            return False

    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Seed default system_settings for all companies."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Log intended inserts without writing to the database.",
    )
    args = parser.parse_args()

    # Run seed
    result = seed_company_settings(dry_run=args.dry_run)

    if args.dry_run:
        logger.info("Dry run complete. No changes were made.")
        sys.exit(0)

    # Verify
    verified = verify_seed()

    # Exit with appropriate code
    if verified and result.get("status") in ["success", "complete"]:
        logger.info("Seed script completed successfully!")
        sys.exit(0)
    else:
        logger.error("Seed script completed with issues")
        sys.exit(1)


if __name__ == "__main__":
    main()
