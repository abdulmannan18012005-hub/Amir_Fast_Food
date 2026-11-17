# Amir Fast Food — Database Backup & Disaster Recovery Guide

This guide describes the zero-cost automated database backup and disaster recovery system for Amir Fast Food (`https://amir-fast-food.vercel.app`), built using PostgreSQL native tools and Windows PowerShell without introducing any paid third-party services.

---

## 1. Architecture & Security Safeguards

- **No Hardcoded Credentials:** The backup script never hardcodes database passwords or connection URLs. It reads from `$env:SUPABASE_DB_URL` or `$env:DATABASE_URL`.
- **Target Location:** Backups are stored completely outside the Git application repository in `C:\backups\amir_fast_food` (configurable via `$env:BACKUP_DIR`).
- **Atomic Writes:** Backups are dumped directly into a temporary `.dump.tmp` file.
- **Integrity Verification:** Every backup is verified using `pg_restore -l` before the temporary file is accepted and renamed to `.dump`. If verification fails, the corrupted temp file is purged immediately.
- **Custom Format (`-Fc`):** Creates compressed, platform-independent PostgreSQL dumps that support selective table restore, multithreaded restores, and metadata verification.
- **Production Guard on Restore:** `scripts/restore_db.ps1` strictly refuses to run against a live Supabase production host unless the operator explicitly provides `-ForceTestOnly` and types `RESTORE`.

---

## 2. Retention Policy

The backup runner automatically cleans and organizes backup archives:
1. **Daily Backups:** All backups created within the last **7 days** are retained.
2. **Weekly Backups:** The newest backup from each week is retained for the last **4 weeks**.
3. **Monthly Backups:** The newest backup from each month is retained for the last **12 months**.
4. **Pruning:** Backups older than 365 days that do not meet the retention criteria are automatically purged.

---

## 3. Prerequisites & Environment Setup

1. **PostgreSQL Client Tools:** Ensure `pg_dump` and `pg_restore` are installed (either via standard PostgreSQL installer for Windows or added to PATH).
2. **Configure Database Connection String:**
   In your Windows User Environment Variables or PowerShell profile:
   ```powershell
   [System.Environment]::SetEnvironmentVariable("SUPABASE_DB_URL", "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].pooler.supabase.com:6543/postgres?sslmode=require", "User")
   ```
   *(Retrieve your pooled connection string from the Supabase Project Settings -> Database -> Connection string).*

3. *(Optional) Optional Encryption Key:*
   ```powershell
   [System.Environment]::SetEnvironmentVariable("BACKUP_ENCRYPTION_KEY", "YourStrongAesPasswordHere", "User")
   ```

---

## 4. Manual Execution

### Running a Manual Backup
```powershell
powershell -ExecutionPolicy Bypass -File "D:\5th Semester\Web Technologies\AMR Fast Food\scripts\backup_db.ps1"
```

### Running a Safe Test Restore
```powershell
powershell -ExecutionPolicy Bypass -File "D:\5th Semester\Web Technologies\AMR Fast Food\scripts\restore_db.ps1" -TargetDbUrl "postgresql://postgres:postgres@localhost:5432/amir_test_db"
```

---

## 5. Automated Windows Task Scheduler Setup (Daily at 4:00 AM PKT)

To ensure daily backups without human intervention, register a Windows Scheduled Task.

### Option A: Using PowerShell (Run as Administrator)

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""D:\5th Semester\Web Technologies\AMR Fast Food\scripts\backup_db.ps1"""
$trigger = New-ScheduledTaskTrigger -Daily -At "04:00 AM"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName "AmirFastFood_DatabaseBackup" -Action $action -Trigger $trigger -Settings $settings -Description "Daily PostgreSQL backup for Amir Fast Food"
```

### Option B: Using Windows Task Scheduler GUI
1. Press `Win + R`, type `taskschd.msc`, and press Enter.
2. Click **Create Basic Task...** in the Actions pane on the right.
3. **Name:** `AmirFastFood_DatabaseBackup`.
4. **Trigger:** Daily at `04:00 AM`.
5. **Action:** Start a program.
   - **Program/script:** `powershell.exe`
   - **Add arguments:** `-ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\5th Semester\Web Technologies\AMR Fast Food\scripts\backup_db.ps1"`
6. Click **Finish**.
7. In task properties, check **Run whether user is logged on or not** and **Run with highest privileges**.

---

## 6. Honest Limitations & Operational Boundaries

1. **Host Power State:** Windows Scheduled Tasks require the host computer to be powered on and connected to the internet during the scheduled window (or will run on next boot if *StartWhenAvailable* is enabled).
2. **Local vs. Off-Site Storage:** A local backup on your computer protects against database corruption, accidental table drops, or accidental deletion, but it is **not** an off-site cloud backup. If your local storage fails, local backups could be lost. We recommend periodically copying `C:\backups\amir_fast_food` to an external USB drive or syncing the directory to a free-tier Google Drive / OneDrive personal folder outside the Git repository.
3. **Zero Paid assumption:** Supabase free-tier does not guarantee point-in-time recovery (PITR). This local automated backup script provides complete ownership and independent physical custody of your restaurant's data at zero cost.
