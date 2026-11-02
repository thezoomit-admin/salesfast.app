$ErrorActionPreference = 'Stop'
$HOOKS = "  const colors = useThemeColors();`n  const styles = useMemo(() => createStyles(colors), [colors]);`n"

function Wrap-Styles([string]$c) {
  $i = $c.IndexOf("const styles = StyleSheet.create({")
  if ($i -lt 0) { throw "no styles" }
  $head = $c.Substring(0, $i)
  $body = $c.Substring($i).Replace("const styles = StyleSheet.create({", "function createStyles(colors: ThemeColors) {`n  return StyleSheet.create({")
  $lines = $body -split "`r?`n"
  $out = @()
  foreach ($l in $lines) {
    if ($l -match 'function createStyles|return StyleSheet.create') { $out += $l }
    elseif ($l -eq '});') { $out += '  });'; $out += '}' }
    elseif ($l.Length) { $out += '  ' + $l }
    else { $out += $l }
  }
  return $head + ($out -join "`n")
}

# $anchors: array of exact signature-end lines (after normalising to \n); hooks inserted after each (first occurrence)
function Migrate([string]$path, [string[]]$anchors, [string]$hooks = $HOOKS, [bool]$needsMemo = $true) {
  $p = (Resolve-Path -LiteralPath $path).Path
  $c = [IO.File]::ReadAllText($p) -replace "`r`n", "`n"
  # theme import
  $m = [regex]::Match($c, "import \{([^}]*)\} from '@/theme';")
  if (-not $m.Success) { throw "no theme import in $path" }
  $names = $m.Groups[1].Value -split ',' | % { $_.Trim() } | ? { $_ -and $_ -ne 'colors' }
  $names += 'useThemeColors'
  $names += 'type ThemeColors'
  $c = $c.Replace($m.Value, "import { " + ($names -join ', ') + " } from '@/theme';")
  if ($needsMemo -and $c -notmatch "\buseMemo\b[^;]*from 'react'") {
    if ($c -match "import \{([^}]*)\} from 'react';") {
      $mm = [regex]::Match($c, "import \{([^}]*)\} from 'react';")
      $n = ($mm.Groups[1].Value -split ',' | % { $_.Trim() } | ? { $_ }) + 'useMemo' | Sort-Object -Unique
      $c = $c.Replace($mm.Value, "import { " + ($n -join ', ') + " } from 'react';")
    } else {
      $c = $c -replace "(?m)^(import [^\n]*from 'react-native';)", "import { useMemo } from 'react';`n`$1"
    }
  }
  foreach ($a in $anchors) {
    $idx = $c.IndexOf($a)
    if ($idx -lt 0) { throw "anchor not found in ${path}: $a" }
    $c = $c.Insert($idx + $a.Length, $hooks)
  }
  $c = Wrap-Styles $c
  [IO.File]::WriteAllText($p, $c)
}
