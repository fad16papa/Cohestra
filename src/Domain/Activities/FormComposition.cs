namespace Cohestra.Domain.Activities;

/// <summary>
/// Presentation/structure node for Form Studio 2.0 composition (Epic 36).
/// Input fields remain in <see cref="ActivityFormSchema.Fields"/>.
/// </summary>
public sealed class FormCompositionNode
{
    public string Id { get; set; } = string.Empty;

    /// <summary>fieldRef | content | section | columns | domain</summary>
    public string Kind { get; set; } = string.Empty;

    public string? FieldId { get; set; }

    /// <summary>content kind: heading | paragraph | divider | image</summary>
    public string? ContentType { get; set; }

    public FormCompositionContentProps? Content { get; set; }

    public string? Title { get; set; }

    public string? Description { get; set; }

    public List<FormCompositionNode>? Children { get; set; }

    public List<List<FormCompositionNode>>? Columns { get; set; }

    /// <summary>domain kind: activityDetails | communityIdentity | capacityStatus</summary>
    public string? Domain { get; set; }
}

public sealed class FormCompositionContentProps
{
    public string? Text { get; set; }

    /// <summary>Heading level 2–4 when contentType is heading.</summary>
    public int? Level { get; set; }

    public string? ImageUrl { get; set; }

    public string? Alt { get; set; }
}

public static class FormCompositionKinds
{
    public const string FieldRef = "fieldRef";
    public const string Content = "content";
    public const string Section = "section";
    public const string Columns = "columns";
    public const string Domain = "domain";
}

public static class FormCompositionContentTypes
{
    public const string Heading = "heading";
    public const string Paragraph = "paragraph";
    public const string Divider = "divider";
    public const string Image = "image";
}

public static class FormCompositionDomainTypes
{
    public const string ActivityDetails = "activityDetails";
    public const string CommunityIdentity = "communityIdentity";
    public const string CapacityStatus = "capacityStatus";
}
