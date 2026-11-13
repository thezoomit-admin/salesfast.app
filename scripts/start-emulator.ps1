# Starts Android Emulator detached, then minimizes any netsim console that pops up.
$ErrorActionPreference = "Stop"

$emulator = Join-Path $env:LOCALAPPDATA "Android\Sdk\emulator\emulator.exe"
$avd = "Medium_Phone_API_37.0"

if (-not (Test-Path $emulator)) {
  Write-Error "emulator.exe not found: $emulator"
}

Start-Process -FilePath $emulator -ArgumentList @(
  "-avd", $avd,
  "-gpu", "swiftshader_indirect",
  "-no-snapshot-load"
) -WindowStyle Hidden

Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class EmulatorWindowHelper {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  public const int SW_MINIMIZE = 6;
  public const int SW_HIDE = 0;
}
"@

# netsimd console can appear a few seconds after launch
1..20 | ForEach-Object {
  Start-Sleep -Milliseconds 500
  [EmulatorWindowHelper]::EnumWindows({
    param($hWnd, $lParam)
    $sb = New-Object System.Text.StringBuilder 512
    [void][EmulatorWindowHelper]::GetWindowText($hWnd, $sb, $sb.Capacity)
    $title = $sb.ToString()
    if ($title -match 'netsim|emulator\.exe|Android Emulator') {
      # Hide console-style windows; keep the actual AVD GUI alone
      if ($title -notmatch 'Medium_Phone|API_') {
        [void][EmulatorWindowHelper]::ShowWindow($hWnd, [EmulatorWindowHelper]::SW_HIDE)
      }
    }
    return $true
  }, [IntPtr]::Zero) | Out-Null
}

Write-Host "Emulator launch requested for $avd"
