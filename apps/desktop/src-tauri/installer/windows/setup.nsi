; iHIMS Windows Installer Script (NSIS)
; Tauri auto-generates a full NSIS installer — this file is for reference/customization only.
; The actual installer is built by `tauri build` using the settings in tauri.conf.json.

; Key installer settings (reflected in tauri.conf.json):
;   - Install location: C:\Program Files\iHIMS\
;   - Creates Start Menu shortcut: iHIMS
;   - Creates Desktop shortcut: iHIMS
;   - Registers uninstaller in Add/Remove Programs
;   - Installation mode: per-machine (requires admin) OR per-user
;   - Associates .ihims file extension for exported reports (optional)

; PostgreSQL check (added as a custom page before install):
;   1. Checks for running PostgreSQL service
;   2. If not found, prompts to install PostgreSQL 16 from postgresql.org
;   3. Provides option to skip (use external database)
;
; Database setup on first run:
;   - App auto-creates database 'pibs_db' and user 'pibs' on first launch
;   - Shows setup wizard if database credentials are not configured

; To customize installer graphics:
;   - Header: installer/windows/header.bmp (150 x 57 px)
;   - Sidebar: installer/windows/sidebar.bmp (164 x 314 px)
;   - Icon: icons/icon.ico

; To sign the installer for production:
;   - Set TAURI_PRIVATE_KEY and TAURI_KEY_PASSWORD environment variables
;   - Or use Azure Code Signing / DigiCert in CI/CD pipeline
