param(
    [Parameter(Mandatory = $true)]
    [string]$Destination
)

$ErrorActionPreference = 'Stop'
if (Test-Path -LiteralPath $Destination) {
    throw 'Choose a new export directory; existing backups are never overwritten.'
}
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
New-Item -ItemType Directory -Path $destinationPath | Out-Null

function Invoke-Docker {
    param([string[]]$DockerArguments)
    & docker @DockerArguments
    if ($LASTEXITCODE -ne 0) { throw "Docker failed: $($DockerArguments[0..2] -join ' ')" }
}

$countsQuery = @'
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{const tables=await p.$queryRawUnsafe('SHOW TABLES');const counts={};for(const row of tables){const table=Object.values(row)[0];if(!/^[a-z_]+$/.test(table))throw Error('Unexpected table name');const result=await p.$queryRawUnsafe('SELECT COUNT(*) AS count FROM `'+table+'`');counts[table]=Number(result[0].count)}console.log(JSON.stringify(counts));})().finally(()=>p.$disconnect()).catch(e=>{console.error(e.message);process.exitCode=1});
'@
$counts = & docker compose exec -T api node -e $countsQuery
if ($LASTEXITCODE -ne 0) { throw 'Cannot read source database counts' }
$counts | ConvertFrom-Json | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $destinationPath 'counts.json'), ($counts -join "`n"), $utf8)

try {
    Invoke-Docker -DockerArguments @('compose', 'exec', '-T', 'db', 'sh', '-c',
        'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE" > /tmp/im-export.sql')
    Invoke-Docker -DockerArguments @('compose', 'cp', 'db:/tmp/im-export.sql', (Join-Path $destinationPath 'database.sql'))
    Invoke-Docker -DockerArguments @('compose', 'exec', '-T', 'api', 'tar', '-czf', '/tmp/im-media.tar.gz', '-C', '/repo/apps/api/storage', '.')
    Invoke-Docker -DockerArguments @('compose', 'cp', 'api:/tmp/im-media.tar.gz', (Join-Path $destinationPath 'media.tar.gz'))
} finally {
    Invoke-Docker -DockerArguments @('compose', 'exec', '-T', 'db', 'rm', '-f', '/tmp/im-export.sql')
    Invoke-Docker -DockerArguments @('compose', 'exec', '-T', 'api', 'rm', '-f', '/tmp/im-media.tar.gz')
}

Write-Output 'Exported all database tables and API media. Keep this private; it contains account and subscriber data.'
