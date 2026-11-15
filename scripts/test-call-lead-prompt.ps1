# Emulator E2E smoke for "Is this your lead?" notification.
# Prerequisites: SalesFast installed, emulator booted, feature enabled + user logged in
# (or SharedPreferences forced below for debug builds).
#
# Usage:
#   .\scripts\test-call-lead-prompt.ps1
#   .\scripts\test-call-lead-prompt.ps1 -Phone 01711223344 -Package com.salesfastcrm

param(
  [string]$Phone = "01799998888",
  [string]$Package = "com.salesfast.crm"
)

$ErrorActionPreference = "Stop"
$adb = if ($env:ANDROID_HOME) { Join-Path $env:ANDROID_HOME "platform-tools\adb.exe" } else { "adb" }

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "OK  $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "WARN $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "FAIL $msg" -ForegroundColor Red; exit 1 }

Step "Device"
$devices = & $adb devices | Select-String "device$"
if (-not $devices) { Fail "No emulator/device attached" }
Ok ($devices -join ", ")

Step "Package $Package"
$pkg = & $adb shell pm path $Package 2>$null
if (-not $pkg) { Fail "Package not installed: $Package" }
Ok $pkg.Trim()

Step "Grant runtime permissions"
foreach ($p in @(
  "android.permission.READ_PHONE_STATE",
  "android.permission.READ_CALL_LOG",
  "android.permission.READ_CONTACTS",
  "android.permission.POST_NOTIFICATIONS"
)) {
  & $adb shell pm grant $Package $p 2>$null | Out-Null
  $check = & $adb shell dumpsys package $Package | Select-String "$p: granted=true"
  if ($check) { Ok "$p granted" } else { Warn "$p not granted (may be missing from manifest)" }
}

Step "Confirm IncomingCallReceiver is registered"
$rx = & $adb shell dumpsys package $Package | Select-String "IncomingCallReceiver|PHONE_STATE"
if ($rx) {
  Ok "Receiver present"
  $rx | ForEach-Object { Write-Host "    $_" }
} else {
  Fail "IncomingCallReceiver / PHONE_STATE not in package — this APK does not include the feature"
}

Step "Force-enable prompt prefs (debug builds via run-as)"
# enabled=true, skip_contacts=true, session_active=true
$xml = @"
<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
  <boolean name="enabled" value="true" />
  <boolean name="skip_contacts" value="true" />
  <boolean name="session_active" value="true" />
  <long name="configured_at" value="$(([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()))" />
</map>
"@
$tmp = Join-Path $env:TEMP "salesfast_call_lead_prompt.xml"
Set-Content -Path $tmp -Value $xml -Encoding UTF8
& $adb push $tmp "/data/local/tmp/salesfast_call_lead_prompt.xml" | Out-Null
$runAs = & $adb shell run-as $Package sh -c "mkdir -p shared_prefs && cp /data/local/tmp/salesfast_call_lead_prompt.xml shared_prefs/salesfast_call_lead_prompt.xml && ls shared_prefs" 2>&1
if ($LASTEXITCODE -ne 0) {
  Warn "Could not write SharedPreferences via run-as (release build or no debug). Enable the toggle in-app after login instead."
  Write-Host $runAs
} else {
  Ok "SharedPreferences written: $runAs"
}

Step "Clear prior SalesFast notifications"
& $adb shell cmd notification cancel_all 2>$null | Out-Null

Step "Simulate incoming call from $Phone"
& $adb emu gsm call $Phone
Start-Sleep -Seconds 5
& $adb emu gsm cancel $Phone
Start-Sleep -Seconds 4

Step "Check for SalesFast lead prompt notification"
$dump = & $adb shell dumpsys notification --noredact
$hit = $dump | Select-String -Pattern "call_lead_prompt|Is this your lead\?|salesfast-call-lead|Call from $Phone"
$dialer = $dump | Select-String -Pattern "MissedCall|phone_missed_call"

if ($hit) {
  Ok "Feature notification found"
  $hit | Select-Object -First 15 | ForEach-Object { Write-Host "    $_" }
  exit 0
}

Warn "No SalesFast 'Is this your lead?' notification found"
if ($dialer) { Write-Host "Dialer did see the call (emulator telephony works)." }
Write-Host "`nLikely causes if receiver exists:"
Write-Host "  - Feature still off / session_active false (login + Settings → Leads from calls)"
Write-Host "  - Number already in known CRM keys or ignored list"
Write-Host "  - Number saved as a contact and skip_contacts is on"
Write-Host "  - Notifications channel blocked"
& $adb logcat -d -t 120 | Select-String -Pattern "CallLead|IncomingCall|androidcalllog" | Select-Object -First 40
exit 1
