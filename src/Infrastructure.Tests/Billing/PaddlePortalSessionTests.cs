using System.Text.Json;
using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddlePortalSessionTests
{
    [Fact]
    public void ResolveUrl_reads_paddle_general_overview()
    {
        const string json = """
            {
              "data": {
                "id": "cpls_01jcgezdnnd1t0c7wdrdher9vv",
                "customer_id": "ctm_01jcdaf4zgm2fxw3nc0e4fn137",
                "urls": {
                  "general": {
                    "overview": "https://customer-portal.paddle.com/cpl_overview"
                  },
                  "subscriptions": []
                }
              }
            }
            """;

        var envelope = JsonSerializer.Deserialize<PaddleEnvelope<PaddlePortalSession>>(json, PaddleJson.Options);

        Assert.Equal(
            "https://customer-portal.paddle.com/cpl_overview",
            envelope?.Data?.ResolveUrl());
    }

    [Fact]
    public void ResolveUrl_prefers_update_payment_method_deep_link()
    {
        const string json = """
            {
              "data": {
                "urls": {
                  "general": {
                    "overview": "https://customer-portal.paddle.com/cpl_overview"
                  },
                  "subscriptions": [
                    {
                      "id": "sub_01h04vsc0qhwtsbsxh3422wjs4",
                      "cancel_subscription": "https://customer-portal.paddle.com/cpl_cancel",
                      "update_subscription_payment_method": "https://customer-portal.paddle.com/cpl_update_card"
                    }
                  ]
                }
              }
            }
            """;

        var envelope = JsonSerializer.Deserialize<PaddleEnvelope<PaddlePortalSession>>(json, PaddleJson.Options);

        Assert.Equal(
            "https://customer-portal.paddle.com/cpl_update_card",
            envelope?.Data?.ResolveUrl());
    }
}
