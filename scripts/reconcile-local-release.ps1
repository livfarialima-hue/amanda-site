[CmdletBinding(SupportsShouldProcess = $true)]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$manifestPath = Join-Path $repositoryRoot "netlify\functions\lib\bruna-policy\manifest.json"
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$expectedCommit = [string]$manifest.release.lastObservedProductionCommit
$expectedBranch = "reestruturacao-site"

if ($expectedCommit -notmatch "^[0-9a-f]{40}$") {
  throw "O manifesto não contém lastObservedProductionCommit válido."
}

Push-Location $repositoryRoot
try {
  $currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
  if ($LASTEXITCODE -ne 0) { throw "Não foi possível identificar a branch local." }
  if ($currentBranch -ne $expectedBranch) {
    throw "Branch incorreta: esperado $expectedBranch; atual $currentBranch."
  }

  $stagedFiles = @(git diff --cached --name-only)
  if ($LASTEXITCODE -ne 0) { throw "Não foi possível conferir o índice do Git." }
  if ($stagedFiles.Count -gt 0) {
    throw "Há alterações staged. Retire-as do índice ou conclua o commit antes da reconciliação."
  }

  git fetch --no-tags origin $expectedBranch
  if ($LASTEXITCODE -ne 0) { throw "Falha ao atualizar a referência remota." }

  $remoteCommit = (git rev-parse "origin/$expectedBranch").Trim()
  if ($LASTEXITCODE -ne 0) { throw "Não foi possível identificar origin/$expectedBranch." }
  git merge-base --is-ancestor $expectedCommit $remoteCommit 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "O remoto $remoteCommit não descende do recibo $expectedCommit. Revise antes de reconciliar."
  }

  $currentCommit = (git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0) { throw "Não foi possível identificar o HEAD local." }

  git merge-base --is-ancestor $remoteCommit $currentCommit 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Output "LOCAL_RELEASE_BASE_ALREADY_CONTAINS=$remoteCommit"
    Write-Output "RECEIPT_ANCESTOR=$expectedCommit"
    Write-Output "WORKTREE_PRESERVED=true"
    exit 0
  }

  if ($PSCmdlet.ShouldProcess(
    "$expectedBranch ($currentCommit -> $remoteCommit)",
    "Atualizar branch e índice com git reset --mixed, preservando o worktree"
  )) {
    git reset --mixed $remoteCommit
    if ($LASTEXITCODE -ne 0) { throw "Falha na reconciliação mixed." }
  }

  Write-Output "LOCAL_RELEASE_BASE=$remoteCommit"
  Write-Output "RECEIPT_ANCESTOR=$expectedCommit"
  Write-Output "WORKTREE_PRESERVED=true"
  Write-Output "NEXT=npm.cmd run ops:check"
}
finally {
  Pop-Location
}
