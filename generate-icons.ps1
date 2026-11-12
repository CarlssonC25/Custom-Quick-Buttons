Add-Type -AssemblyName System.Drawing
$sizes = @(16, 32, 48, 128)
foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # Background rounded ellipse/circle
    $rect = New-Object System.Drawing.Rectangle 1, 1, ($size - 2), ($size - 2)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(35, 39, 47),
        [System.Drawing.Color]::FromArgb(20, 22, 28),
        [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )
    $g.FillEllipse($bgBrush, $rect)
    
    # Border
    $penWidth = [Math]::Max(1.0, [float]($size / 16.0))
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(99, 102, 241), $penWidth)
    $g.DrawEllipse($pen, $rect)
    
    # Lightning / Flash Symbol
    $s = [float]($size / 128.0)
    [System.Drawing.PointF[]]$pts = @(
        [System.Drawing.PointF]::new(68.0 * $s, 18.0 * $s),
        [System.Drawing.PointF]::new(34.0 * $s, 68.0 * $s),
        [System.Drawing.PointF]::new(62.0 * $s, 68.0 * $s),
        [System.Drawing.PointF]::new(56.0 * $s, 110.0 * $s),
        [System.Drawing.PointF]::new(94.0 * $s, 56.0 * $s),
        [System.Drawing.PointF]::new(68.0 * $s, 56.0 * $s)
    )
    $fgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(129, 140, 248),
        [System.Drawing.Color]::FromArgb(244, 244, 245),
        [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
    )
    $g.FillPolygon($fgBrush, $pts)
    
    $path = "icons\icon$size.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Successfully created $path"
}
