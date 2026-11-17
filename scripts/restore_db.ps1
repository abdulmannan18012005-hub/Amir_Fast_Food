<#
.SYNOPSIS
    Safe database restore script for Amir Fast Food.
.DESCRIPTION
    Restores an Amir Fast Food PostgreSQL dump file created with backup_db.ps1.
    Strictly safeguards production: refuses to restore against Supabase production hosts
    unless -ForceTestOnly is explicitly provided and interactive confirmation is given.
.PARAMETER BackupFile
    Path to the .dump file to restore. Defaults to the newest file in $BackupDir.
.PARAMETER TargetDbUrl
    Connection string for the destination database (must be a local or test database).
.PARAMETER ForceTestOnly
    Switch required to confirm this is a non-production test/staging restore.
#>

[CmdletBinding()]
param(
    [string]$BackupFile,
    [string]$TargetDbUrl = $env:TEST_DB_URL,
    [string]$BackupDir = $env:BACKUP_DIR,
    [switch]$ForceTestOnly
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($BackupDir)) {
    $BackupDir = "C:\backups\amir_fast_food"
}

# 1. Resolve Backup File
if ([string]::IsNullOrWhiteSpace($BackupFile)) {
    $latest = Get-ChildItem -Path $BackupDir -Filter "amir_fast_food_*.dump" | Sort-Object CreationTime -Descending | Select-Object -First 1
    if (-not $latest) {
        Write-Error "[FATAL] No backup .dump files found in $BackupDir."
        exit 1
    }
    $BackupFile = $latest.FullName
}

if (-not (Test-Path $BackupFile)) {
    Write-Error "[FATAL] Specified backup file does not exist: $BackupFile"
    exit 1
}

# 2. Resolve Target DB URL
if ([string]::IsNullOrWhiteSpace($TargetDbUrl)) {
    $TargetDbUrl = Read-Host "Enter the TARGET Test/Local Database connection string"
}

if ([string]::IsNullOrWhiteSpace($TargetDbUrl)) {
    Write-Error "[FATAL] No target database URL provided. Aborting."
    exit 1
}

# 3. Production Protection Safeguard
$isProductionHost = $TargetDbUrl -match "supabase\.co" -or $TargetDbUrl -match "aws-0-.*\.pooler\.supabase\.com"
if ($isProductionHost -and -not $ForceTestOnly) {
    Write-Error "[SAFETY BLOCK] The target database appears to be a Supabase cloud database! Direct restore to production is blocked to prevent catastrophic data loss. If you are deliberately testing against a staging branch, pass -ForceTestOnly."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "AMIR FAST FOOD - DATABASE RESTORE CONFIRMATION" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "Backup File : $BackupFile"
Write-Host "Target Host : $((New-Object System.Uri($TargetDbUrl.Replace('postgresql://','http://'))).Host)"
Write-Host "Target DB   : $((New-Object System.Uri($TargetDbUrl.Replace('postgresql://','http://'))).AbsolutePath.Trim('/'))"
Write-Host "==========================================================" -ForegroundColor Yellow

$confirm = Read-Host "Type 'RESTORE' in capital letters to proceed with restoring this backup"
if ($confirm -ne "RESTORE") {
    Write-Host "Restore canceled by user." -ForegroundColor Gray
    exit 0
}

# 4. Locate pg_restore
$pgRestoreCmd = Get-Command "pg_restore" -ErrorAction SilentlyContinue
if (-not $pgRestoreCmd) {
    $standardPaths = @(
        "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe",
        "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_restore.exe",
        "C:\Program Files\PostgreSQL\14\bin\pg_restore.exe"
    )
    foreach ($p in $standardPaths) {
        if (Test-Path $p) {
            $pgRestorePath = $p
            break
        }
    }
} else {
    $pgRestorePath = $pgRestoreCmd.Source
}

if (-not $pgRestorePath -or -not (Test-Path $pgRestorePath)) {
    Write-Error "[FATAL] pg_restore executable not found. Please install PostgreSQL client tools."
    exit 1
}

# 5. Verify Backup File Integrity First
Write-Host "[1/2] Verifying backup archive integrity..." -ForegroundColor Cyan
$verifyProc = Start-Process -FilePath $pgRestorePath -ArgumentList @("-l", $BackupFile) -NoNewWindow -Wait -PassThru
if ($verifyProc.ExitCode -ne 0) {
    Write-Error "[FATAL] Backup file failed integrity verification! Restore aborted."
    exit 1
}
Write-Host "[1/2] Backup integrity verified." -ForegroundColor Green

# 6. Execute Restore
Write-Host "[2/2] Restoring database schema and data..." -ForegroundColor Cyan
$restoreArgs = @(
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "-d", $TargetDbUrl,
    $BackupFile
)

$restoreProc = Start-Process -FilePath $pgRestorePath -ArgumentList $restoreArgs -NoNewWindow -Wait -PassThru

if ($restoreProc.ExitCode -eq 0) {
    Write-Host "[SUCCESS] Database restored successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[WARN] pg_restore exited with code: $($restoreProc.ExitCode). Some non-fatal notices may have occurred." -ForegroundColor Yellow
    exit 0
}
