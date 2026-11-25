@echo off
rem QueryShield Lab native runner (no Docker). Usage: lab.cmd setup^|start^|stop^|status^|reset^|check
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0lab.ps1" %*
