# Load AGENTMAIL_API_KEY from the DPAPI secret store into this process only, then
# run the read-only inbox fetch. Never prints the key.
$ErrorActionPreference = "Stop"
. "C:\Users\samvs\jev-work\automaton-r2\scripts\native\secret-store.ps1"
Import-AutomatonSecrets -Names @("AGENTMAIL_API_KEY")
if (-not $env:AGENTMAIL_API_KEY) {
  Write-Host "AGENTMAIL_API_KEY not found in DPAPI store"
  exit 1
}
Set-Location "C:\Users\samvs\.automaton\workspace\01M6MGEMHWK27GEGPKSDHWCV6S\work"
node .\fetch-inquiries.mjs
exit $LASTEXITCODE
