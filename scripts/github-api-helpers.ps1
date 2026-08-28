# ─────────────────────────────────────────────────────────────────────────
# Dugout Lineup — GitHub API PowerShell Helper
# ─────────────────────────────────────────────────────────────────────────
# Fixes a real, silent data-corruption bug: Windows PowerShell 5.1's
# Invoke-RestMethod does NOT default to UTF-8 when sending a JSON string
# body. A non-ASCII character (an emoji, a curly quote, an accented letter)
# in a PR/issue/comment body sent through plain `Invoke-RestMethod -Body
# ($x | ConvertTo-Json)` either:
#   - gets silently corrupted to "??" in the stored GitHub content, with a
#     normal 200/201 success response (no error, no warning) -- or
#   - makes the request fail outright with a GitHub 400 "Problems parsing
#     JSON" error, for the exact same un-encoded-body pattern.
#
# Discovered 2026-08-07 (session retro 2026-08-07-A, PR #643) when two
# GitHub API calls back to back both contained a checkmark emoji: the first
# silently corrupted, the second 400'd. Without the second call's hard
# failure, the first call's corruption would have shipped unnoticed -- a
# real content-integrity gap, not just an inconvenience. See #644.
#
# Usage:
#   . .\scripts\github-api-helpers.ps1
#   Invoke-GitHubApi -Uri "https://api.github.com/repos/OWNER/REPO/issues/1/comments" `
#     -Method Post `
#     -Headers @{ Authorization = "Bearer $env:GITHUB_TOKEN"; Accept = "application/vnd.github+json" } `
#     -Body @{ body = "Some text with a checkmark: ✓" }
# ─────────────────────────────────────────────────────────────────────────

function Invoke-GitHubApi {
    <#
    .SYNOPSIS
    Invoke-RestMethod for the GitHub API with correct UTF-8 body encoding.

    .DESCRIPTION
    Drop-in wrapper: pass the same -Uri / -Method / -Headers you would to
    Invoke-RestMethod, plus -Body as a hashtable or PSCustomObject (not a
    pre-serialized JSON string). Handles ConvertTo-Json and the UTF-8 byte
    encoding GitHub's API needs for any non-ASCII content, so callers never
    have to remember the fix from #644.

    .PARAMETER Uri
    Full GitHub API URL, e.g. https://api.github.com/repos/OWNER/REPO/issues/1/comments

    .PARAMETER Method
    HTTP method: Post, Patch, Put, Delete, Get, etc.

    .PARAMETER Headers
    Hashtable of request headers. Must include Authorization; Accept is
    recommended (e.g. "application/vnd.github+json").

    .PARAMETER Body
    Hashtable or PSCustomObject request body. Omit for bodyless requests
    (e.g. GET, some DELETEs).

    .PARAMETER Depth
    ConvertTo-Json -Depth override for deeply nested bodies. Default 10.
    #>
    param(
        [Parameter(Mandatory)] [string] $Uri,
        [Parameter(Mandatory)] [string] $Method,
        [Parameter(Mandatory)] [hashtable] $Headers,
        $Body = $null,
        [int] $Depth = 10
    )

    if ($null -eq $Body) {
        return Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers
    }

    $json = $Body | ConvertTo-Json -Depth $Depth
    return Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers `
        -Body ([System.Text.Encoding]::UTF8.GetBytes($json)) `
        -ContentType "application/json; charset=utf-8"
}
