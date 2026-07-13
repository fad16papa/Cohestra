using System.Drawing;
using QRCoder;

namespace Cohestra.Infrastructure.Activities;

internal static class ActivityQrCodeGenerator
{
    public static byte[] GeneratePng(string payload)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(payload, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(data);

        return qrCode.GetGraphic(
            pixelsPerModule: 10,
            darkColor: Color.Black,
            lightColor: Color.White);
    }
}
