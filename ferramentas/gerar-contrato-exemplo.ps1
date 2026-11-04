# Gera exemplos/contrato-exemplo.pdf a partir de ferramentas/contrato-exemplo.txt
# sem dependencias externas (PDF 1.4, fontes Helvetica, codificacao WinAnsi).
#
# Marcacao do .txt:
#   "# "  titulo        "^ "  subtitulo centralizado
#   "## " secao         "="   linha horizontal
#   linha vazia = espaco; demais linhas = paragrafo com quebra automatica
param(
  [string]$Fonte = (Join-Path $PSScriptRoot 'contrato-exemplo.txt'),
  [string]$Saida = (Join-Path $PSScriptRoot '..\exemplos\contrato-exemplo.pdf')
)
$ErrorActionPreference = 'Stop'
$inv = [Globalization.CultureInfo]::InvariantCulture
$enc = [Text.Encoding]::GetEncoding(1252)

$PW = 595; $PH = 842; $Margem = 60; $Topo = 778; $Base = 72
$Largura = $PW - 2 * $Margem

function N([double]$v) { $v.ToString('0.##', $inv) }
function Esc([string]$s) { $s.Replace('\', '\\').Replace('(', '\(').Replace(')', '\)') }

# Largura aproximada da Helvetica (em unidades de 1/1000 em)
function LarguraTexto([string]$s, [double]$tam, [bool]$negrito) {
  $w = 0.0
  foreach ($c in $s.ToCharArray()) {
    if ($c -eq ' ') { $w += 0.278 }
    elseif ('iljI.,;:|!'.IndexOf($c) -ge 0) { $w += 0.26 }
    elseif ('ftr()-/'.IndexOf($c) -ge 0) { $w += 0.34 }
    elseif ('mwMW'.IndexOf($c) -ge 0) { $w += 0.86 }
    elseif ([char]::IsUpper($c)) { $w += 0.70 }
    elseif ([char]::IsDigit($c)) { $w += 0.556 }
    else { $w += 0.54 }
  }
  if ($negrito) { $w *= 1.06 }
  $w * $tam
}

function Quebrar([string]$texto, [double]$tam, [bool]$negrito) {
  $linhas = New-Object System.Collections.Generic.List[string]
  $atual = ''
  foreach ($p in ($texto -split ' ')) {
    $teste = if ($atual) { "$atual $p" } else { $p }
    if ($atual -and (LarguraTexto $teste $tam $negrito) -gt $Largura) { $linhas.Add($atual); $atual = $p }
    else { $atual = $teste }
  }
  if ($atual) { $linhas.Add($atual) }
  , $linhas
}

$script:paginas = New-Object System.Collections.Generic.List[object]
$script:ops = New-Object System.Collections.Generic.List[string]
$script:y = $Topo

function Garantir([double]$altura) {
  if ($script:y - $altura -lt $Base) {
    $script:paginas.Add($script:ops)
    $script:ops = New-Object System.Collections.Generic.List[string]
    $script:y = $Topo
  }
}

function Texto([string]$fonte, [double]$tam, [double]$x, [double]$yy, [string]$s, [double]$cinza) {
  $script:ops.Add("BT /$fonte $(N $tam) Tf $(N $cinza) g $(N $x) $(N $yy) Td ($(Esc $s)) Tj ET")
}

$linhasFonte = [IO.File]::ReadAllLines($Fonte, [Text.Encoding]::UTF8)
foreach ($l in $linhasFonte) {
  $l = $l.TrimEnd()
  if ($l.StartsWith('# ')) {
    $t = $l.Substring(2); Garantir 30
    Texto 'F2' 16 (($PW - (LarguraTexto $t 16 $true)) / 2) $script:y $t 0
    $script:y -= 22
  }
  elseif ($l.StartsWith('^ ')) {
    $t = $l.Substring(2); Garantir 16
    Texto 'F1' 9.5 (($PW - (LarguraTexto $t 9.5 $false)) / 2) $script:y $t 0.35
    $script:y -= 14
  }
  elseif ($l -eq '=') {
    $script:y -= 4
    $script:ops.Add("0.75 G 0.8 w $Margem $(N $script:y) m $($PW - $Margem) $(N $script:y) l S")
    $script:y -= 18
  }
  elseif ($l.StartsWith('## ')) {
    $t = $l.Substring(3); Garantir 40
    $script:y -= 6
    Texto 'F2' 10.5 $Margem $script:y $t 0.1
    $script:y -= 16
  }
  elseif ($l -eq '') { $script:y -= 6 }
  else {
    foreach ($ln in (Quebrar $l 10 $false)) {
      Garantir 14
      Texto 'F1' 10 $Margem $script:y $ln 0
      $script:y -= 14
    }
    $script:y -= 2
  }
}
$script:paginas.Add($script:ops)

# Monta os objetos PDF
$objs = New-Object System.Collections.Generic.List[string]
$objs.Add('<< /Type /Catalog /Pages 2 0 R >>')
$objs.Add('PAGES')
$objs.Add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
$objs.Add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
$objs.Add('<< /Title (Termo de Compromisso de Estagio - Exemplo) /Producer (VerificaEstagio) >>')

$total = $script:paginas.Count
$kids = @()
for ($i = 0; $i -lt $total; $i++) {
  $conteudo = New-Object System.Collections.Generic.List[string]
  $conteudo.AddRange($script:paginas[$i])
  $rodape = "Termo de Compromisso de Estagio - documento ficticio para demonstracao"
  $conteudo.Add("BT /F1 8 Tf 0.5 g $Margem 40 Td ($rodape) Tj ET")
  $pag = $enc.GetString($enc.GetBytes("P$([char]0xE1)gina $($i + 1) de $total"))
  $conteudo.Add("BT /F1 8 Tf 0.5 g $(N ($PW - $Margem - (LarguraTexto $pag 8 $false))) 40 Td ($pag) Tj ET")
  $stream = ($conteudo -join "`n")
  $len = $enc.GetByteCount($stream)
  $numPagina = $objs.Count + 1
  $objs.Add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 $PW $PH] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents $($numPagina + 1) 0 R >>")
  $objs.Add("<< /Length $len >>`nstream`n$stream`nendstream")
  $kids += "$numPagina 0 R"
}
$objs[1] = "<< /Type /Pages /Kids [$($kids -join ' ')] /Count $total >>"

$sb = New-Object System.Text.StringBuilder
[void]$sb.Append("%PDF-1.4`n%$([char]0xE2)$([char]0xE3)$([char]0xCF)$([char]0xD3)`n")
$offsets = @()
for ($i = 0; $i -lt $objs.Count; $i++) {
  $offsets += $enc.GetByteCount($sb.ToString())
  [void]$sb.Append("$($i + 1) 0 obj`n$($objs[$i])`nendobj`n")
}
$xref = $enc.GetByteCount($sb.ToString())
[void]$sb.Append("xref`n0 $($objs.Count + 1)`n0000000000 65535 f `n")
foreach ($o in $offsets) { [void]$sb.Append($o.ToString('D10') + " 00000 n `n") }
[void]$sb.Append("trailer`n<< /Size $($objs.Count + 1) /Root 1 0 R /Info 5 0 R >>`nstartxref`n$xref`n%%EOF`n")

$dir = Split-Path $Saida -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
[IO.File]::WriteAllBytes($Saida, $enc.GetBytes($sb.ToString()))
Write-Output "PDF gerado: $Saida ($total paginas)"
