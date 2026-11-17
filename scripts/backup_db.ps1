<#
.SYNOPSIS
    Automated zero-cost PostgreSQL database backup script for Amir Fast Food.
.DESCRIPTION
    Creates a verified, compressed, custom-format PostgreSQL dump using pg_dump.
    Enforces atomic write (.tmp -> .dump), integrity checking via pg_restore -l,
    and a 7-day daily / 4-week weekly / 12-month monthly retention policy.
    Never hardcodes credentials; reads securely from SUPABASE_DB_URL or DATABASE_URL.
.NOTES
    Author: Amir Fast Food Engineering
    Target: Windows PowerShell 5.1+ / PowerShell 7+
#>

[CmdletBinding()]
param(
    [string]$BackupDir = $env:BACKUP_DIR,
    [string]$DbUrl = $env:SUPABASE_DB_URL
)

$ErrorActionPreference = "Stop"

# 1. Resolve Target Backup Directory (Outside Application Repository)
if ([string]::IsNullOrWhiteSpace($BackupDir)) {
    $BackupDir = "C:\backups\amir_fast_food"
}

if (-not (Test-Path -Path $BackupDir)) {
    try {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        Write-Host "[INIT] Created backup directory at: $BackupDir" -ForegroundColor Cyan
    } catch {
        Write-Error "[FATAL] Failed to create backup directory: $_"
        exit 1
    }
}

$LogFile = Join-Path $BackupDir "backup.log"

function Log-Message {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $entry = "[$timestamp] [$Level] $Message"
    Write-Host $entry -ForegroundColor $(switch ($Level) { "ERROR" { "Red" } "WARN" { "Yellow" } "SUCCESS" { "Green" } default { "White" } })
    Add-Content -Path $LogFile -Value $entry -ErrorAction SilentlyContinue
}

Log-Message "Starting database backup run..." "INFO"

# 2. Resolve Database Connection String
if ([string]::IsNullOrWhiteSpace($DbUrl)) {
    $DbUrl = $env:DATABASE_URL
}

if ([string]::IsNullOrWhiteSpace($DbUrl)) {
    Log-Message "Database connection string missing! Please set SUPABASE_DB_URL or DATABASE_URL environment variable." "ERROR"
    Log-Message "Example: `$env:SUPABASE_DB_URL = 'postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres'" "ERROR"
    exit 1
}

# 3. Verify pg_dump and pg_restore Availability
$pgDumpCmd = Get-Command "pg_dump" -ErrorAction SilentlyContinue
$pgRestoreCmd = Get-Command "pg_restore" -ErrorAction SilentlyContinue

if (-not $pgDumpCmd) {
    # Check standard PostgreSQL installation directories on Windows
    $standardPaths = @(
        "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"
    )
    foreach ($p in $standardPaths) {
        if (Test-Path $p) {
            $pgDumpPath = $p
            $pgRestorePath = $p.Replace("pg_dump.exe", "pg_restore.exe")
            break
        }
    }
} else {
    $pgDumpPath = $pgDumpCmd.Source
    $pgRestorePath = $pgRestoreCmd.Source
}

if (-not $pgDumpPath -or -not (Test-Path $pgDumpPath)) {
    Log-Message "pg_dump was not found on PATH or in standard PostgreSQL directories. Please install PostgreSQL client tools or add bin directory to PATH." "ERROR"
    exit 1
}

# 4. Generate Timestamp and File Paths
$now = Get-Date
$timestamp = $now.ToString("yyyy-MM-dd_HHmmss")
$tempFileName = "amir_backup_temp_$timestamp.dump.tmp"
$finalFileName = "amir_fast_food_$timestamp.dump"

$tempFilePath = Join-Path $BackupDir $tempFileName
$finalFilePath = Join-Path $BackupDir $finalFileName

Log-Message "Dumping database schema and data to temporary file: $tempFileName..." "INFO"

# 5. Execute pg_dump (Custom Format -Fc, with blobs and compression)
try {
    $dumpArgs = @(
        "-Fc",
        "--no-owner",
        "--no-privileges",
        "-d", $DbUrl,
        "-f", $tempFilePath
    )
    
    $proc = Start-Process -FilePath $pgDumpPath -ArgumentList $dumpArgs -NoNewWindow -Wait -PassThru
    
    if ($proc.ExitCode -ne 0) {
        throw "pg_dump exited with error code: $($proc.ExitCode)"
    }
    
    if (-not (Test-Path $tempFilePath) -or (Get-Item $tempFilePath).Length -eq 0) {
        throw "Backup dump file was created empty or missing."
    }
    
    $dumpSizeMb = [math]::Round((Get-Item $tempFilePath).Length / 1MB, 2)
    Log-Message "Dump completed ($dumpSizeMb MB). Verifying backup file integrity..." "INFO"
} catch {
    Log-Message "Backup failed during dump: $_" "ERROR"
    if (Test-Path $tempFilePath) { Remove-Item $tempFilePath -Force -ErrorAction SilentlyContinue }
    exit 1
}

# 6. Verify Backup File with pg_restore -l (Table of Contents Integrity Check)
try {
    $restoreArgs = @("-l", $tempFilePath)
    $verifyProc = Start-Process -FilePath $pgRestorePath -ArgumentList $restoreArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput (Join-Path $BackupDir "verify_toc.tmp")
    
    if ($verifyProc.ExitCode -ne 0) {
        throw "pg_restore -l verification failed with exit code: $($verifyProc.ExitCode)"
    }
    
    Remove-Item (Join-Path $BackupDir "verify_toc.tmp") -Force -ErrorAction SilentlyContinue
    Log-Message "Backup integrity verified successfully." "SUCCESS"
} catch {
    Log-Message "Integrity verification failed for backup: $_" "ERROR"
    if (Test-Path $tempFilePath) { Remove-Item $tempFilePath -Force -ErrorAction SilentlyContinue }
    exit 1
}

# 7. Atomic Move from .tmp to Final .dump
try {
    Move-Item -Path $tempFilePath -Destination $finalFilePath -Force
    Log-Message "Backup file saved securely at: $finalFilePath" "SUCCESS"
} catch {
    Log-Message "Failed to move temporary backup file: $_" "ERROR"
    exit 1
}

# 8. Optional Encryption with 7-Zip or GPG
if ($env:BACKUP_ENCRYPTION_KEY) {
    $sevenZip = Get-Command "7z" -ErrorAction SilentlyContinue
    if ($sevenZip) {
        try {
            $encTarget = "$finalFilePath.7z"
            $zipArgs = @("a", "-t7z", "-mhe=on", "-p$($env:BACKUP_ENCRYPTION_KEY)", $encTarget, $finalFilePath)
            $zipProc = Start-Process -FilePath $sevenZip.Source -ArgumentList $zipArgs -NoNewWindow -Wait -PassThru
            if ($zipProc.ExitCode -eq 0 -and (Test-Path $encTarget)) {
                Remove-Item $finalFilePath -Force
                $finalFilePath = $encTarget
                Log-Message "Backup encrypted with AES-256 via 7-Zip: $encTarget" "SUCCESS"
            }
        } catch {
            Log-Message "Encryption warning: $_. Preserved unencrypted .dump file." "WARN"
        }
    }
}

# 9. Enforce Retention Policy
# Retention Rules:
# - Keep all backups from the last 7 days (Daily)
# - Keep 1 backup per week for the last 4 weeks (Weekly, e.g. Sunday)
# - Keep 1 backup per month for the last 12 months (Monthly, e.g. 1st of month)
# - Prune files older than 365 days
Log-Message "Applying retention policy (7 daily, 4 weekly, 12 monthly)..." "INFO"

try {
    $allBackups = Get-ChildItem -Path $BackupDir -Filter "amir_fast_food_*.dump*" | Sort-Object CreationTime -Descending
    $keepFiles = [System.Collections.Generic.HashSet[string]]::new()
    
    $sevenDaysAgo = $now.AddDays(-7)
    $fourWeeksAgo = $now.AddDays(-28)
    $oneYearAgo = $now.AddDays(-365)
    
    # 1. Daily: Keep all backups within last 7 days
    foreach ($file in $allBackups) {
        if ($file.CreationTime -ge $sevenDaysAgo) {
            $keepFiles.Add($file.FullName) | Out-Null
        }
    }
    
    # 2. Weekly: Keep newest backup for each week between day 7 and 28
    $weeklyBuckets = @{}
    foreach ($file in $allBackups) {
        if ($file.CreationTime -lt $sevenDaysAgo -and $file.CreationTime -ge $fourWeeksAgo) {
            $weekKey = "$($file.CreationTime.Year)-W$([System.Globalization.ISOWeek]::GetWeekOfYear($file.CreationTime))"
            if (-not $weeklyBuckets.ContainsKey($weekKey)) {
                $weeklyBuckets[$weekKey] = $file.FullName
                $keepFiles.Add($file.FullName) | Out-Null
            }
        }
    }
    
    # 3. Monthly: Keep newest backup for each month up to 1 year
    $monthlyBuckets = @{}
    foreach ($file in $allBackups) {
        if ($file.CreationTime -lt $fourWeeksAgo -and $file.CreationTime -ge $oneYearAgo) {
            $monthKey = "$($file.CreationTime.Year)-$($file.CreationTime.Month)"
            if (-not $monthlyBuckets.ContainsKey($monthKey)) {
                $monthlyBuckets[$monthKey] = $file.FullName
                $keepFiles.Add($file.FullName) | Out-Null
            }
        }
    }
    
    # 4. Prune unkept files
    $deletedCount = 0
    foreach ($file in $allBackups) {
        if (-not $keepFiles.Contains($file.FullName)) {
            Log-Message "Pruning expired backup: $($file.Name)" "INFO"
            Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue
            $deletedCount++
        }
    }
    
    Log-Message "Retention complete. Retained: $($keepFiles.Count), Pruned: $deletedCount." "SUCCESS"
} catch {
    Log-Message "Retention pruning encountered non-fatal error: $_" "WARN"
}

Log-Message "Backup operation completed successfully." "SUCCESS"
exit 0
