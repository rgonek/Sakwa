param([ValidateSet(1,2,3)][int]$Variant = 3, [string]$Output = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
if (!$Output) { $Output = Join-Path $PSScriptRoot "../docs/images/previews/preview-$Variant.png" }
$background = [Drawing.Image]::FromFile((Join-Path $PSScriptRoot "../docs/images/previews/background-$Variant.png"))
$note = [Drawing.Image]::FromFile((Join-Path $PSScriptRoot '../docs/images/note.png'))
$canvas = [Drawing.Bitmap]::new(1672,941)
$g = [Drawing.Graphics]::FromImage($canvas)
$g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
try {
    $g.DrawImage($background,[Drawing.Rectangle]::new(0,0,1672,941))
    $x=715; $y=54; $width=900
    $height=[int][Math]::Round($note.Height*$width/$note.Width)
    $shadow=[Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(42,20,25,25))
    $chrome=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#f1ece3'))
    $border=[Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#bdb6aa'))
    try {
        $g.FillRectangle($shadow,$x+6,$y+8,$width,$height+32)
        $g.FillRectangle($chrome,$x,$y,$width,32)
        for($i=0;$i -lt 3;$i++) {
            $dot=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml(@('#ff6057','#ffbd2e','#28c840')[$i]))
            $g.FillEllipse($dot,$x+15+22*$i,$y+10,12,12)
            $dot.Dispose()
        }
        $g.DrawImage($note,[Drawing.Rectangle]::new($x,$y+32,$width,$height))
        $g.DrawRectangle($border,$x,$y,$width,$height+32)
        $canvas.Save([IO.Path]::GetFullPath($Output),[Drawing.Imaging.ImageFormat]::Png)
    } finally { $shadow.Dispose(); $chrome.Dispose(); $border.Dispose() }
} finally { $g.Dispose(); $canvas.Dispose(); $note.Dispose(); $background.Dispose() }
Write-Output ([IO.Path]::GetFullPath($Output))
