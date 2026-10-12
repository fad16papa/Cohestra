using Cohestra.Application.Billing;

namespace Cohestra.Infrastructure.Billing;

internal static class PaddlePreviewMoneyMapper
{
    public static MappedPreviewMoney Map(PaddleSubscriptionPreview preview)
    {
        var creditAmount = PaddleMinorUnits.TryParse(preview.UpdateSummary?.Credit?.Amount);
        var dueNowAmount = PaddleMinorUnits.TryParse(GrandTotal(preview.ImmediateTransaction?.Details?.Totals));
        var recurringAmount = PaddleMinorUnits.TryParse(GrandTotal(preview.RecurringTransactionDetails?.Totals))
            ?? PaddleMinorUnits.TryParse(GrandTotal(preview.NextTransaction?.Details?.Totals));

        var currency = FirstNonEmpty(
            preview.ImmediateTransaction?.Details?.Totals?.CurrencyCode,
            preview.UpdateSummary?.Credit?.CurrencyCode,
            preview.RecurringTransactionDetails?.Totals?.CurrencyCode,
            preview.NextTransaction?.Details?.Totals?.CurrencyCode,
            preview.UpdateSummary?.Charge?.CurrencyCode);

        return new MappedPreviewMoney(
            Currency: currency,
            Credit: ToMoney(creditAmount, preview.UpdateSummary?.Credit?.CurrencyCode ?? currency),
            DueNow: ToMoney(dueNowAmount, preview.ImmediateTransaction?.Details?.Totals?.CurrencyCode ?? currency),
            NextRecurringAmount: ToMoney(
                recurringAmount,
                preview.RecurringTransactionDetails?.Totals?.CurrencyCode
                    ?? preview.NextTransaction?.Details?.Totals?.CurrencyCode
                    ?? currency),
            NextBilledAt: preview.NextBilledAt ?? preview.NextTransaction?.BillingPeriod?.EndsAt,
            TransactionId: NullIfEmpty(preview.ImmediateTransaction?.Id),
            InvoiceReference: NullIfEmpty(preview.ImmediateTransaction?.InvoiceNumber));
    }

    public static MappedPreviewMoney Empty { get; } = new(null, null, null, null, null, null, null);

    private static BillingMoneyDto? ToMoney(long? amount, string? currency) =>
        amount is { } value && !string.IsNullOrWhiteSpace(currency)
            ? new BillingMoneyDto(value, currency)
            : null;

    private static string? GrandTotal(PaddleTotals? totals) =>
        NullIfEmpty(totals?.GrandTotal) ?? NullIfEmpty(totals?.Total);

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(static value => !string.IsNullOrWhiteSpace(value));

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;
}

internal sealed record MappedPreviewMoney(
    string? Currency,
    BillingMoneyDto? Credit,
    BillingMoneyDto? DueNow,
    BillingMoneyDto? NextRecurringAmount,
    DateTimeOffset? NextBilledAt,
    string? TransactionId,
    string? InvoiceReference);
