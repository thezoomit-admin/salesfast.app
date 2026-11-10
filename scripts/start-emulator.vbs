' Starts Android Emulator without a visible console window.
' Double-click this file, or run: wscript scripts\start-emulator.vbs
Option Explicit

Dim shell, emulator, avd, cmd
Set shell = CreateObject("WScript.Shell")

emulator = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Android\Sdk\emulator\emulator.exe"
avd = "Medium_Phone_API_37.0"
' swiftshader avoids gray/offline stuck on some Windows GPUs; -no-snapshot-load = cold boot
cmd = """" & emulator & """ -avd " & avd & " -gpu swiftshader_indirect -no-snapshot-load"

' 0 = hide window, False = do not wait
shell.Run cmd, 0, False
