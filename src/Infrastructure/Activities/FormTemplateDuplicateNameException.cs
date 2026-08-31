namespace Cohestra.Infrastructure.Activities;

public sealed class FormTemplateDuplicateNameException(string message) : Exception(message);
