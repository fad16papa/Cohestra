"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil, Trash2, Users } from "lucide-react";

import { DeleteCatalogItemDialog } from "@/components/activities/delete-catalog-item-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCommunity,
  deleteCommunity,
  fetchCommunities,
  updateCommunity,
  type CommunityListItem,
} from "@/lib/communities-api";
import { cn } from "@/lib/utils";

const communitiesTableClassName = "w-full min-w-[36rem] border-collapse text-sm";

export function CommunitiesListPage() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [communities, setCommunities] = useState<CommunityListItem[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommunityListItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function openDeleteDialog(community: CommunityListItem) {
    if (deleteTarget !== null) {
      return;
    }

    setDeleteTarget(community);
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    setDeleteDialogOpen(false);
  }

  function finishDeleteDialogClose() {
    setDeleteTarget(null);
  }

  async function loadCommunities() {
    setLoading(true);
    try {
      const items = await fetchCommunities(authFetch);
      setCommunities(items);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load communities."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCommunities();
  }, [authFetch]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      showToast("Community name is required.");
      return;
    }

    setSaving(true);
    try {
      const created = await createCommunity(authFetch, name.trim());
      setCommunities((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setName("");
      showToast("Community created.");
    } catch (createError) {
      showToast(createError instanceof Error ? createError.message : "Could not create community.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(communityId: string) {
    if (!editingName.trim()) {
      showToast("Community name is required.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateCommunity(authFetch, communityId, editingName.trim());
      setCommunities((current) =>
        current
          .map((item) => (item.id === updated.id ? updated : item))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      setEditingName("");
      showToast("Community updated.");
    } catch (updateError) {
      showToast(updateError instanceof Error ? updateError.message : "Could not update community.");
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    if (!deleteTarget || deleteTarget.activityCount > 0) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCommunity(authFetch, deleteTarget.id);
      setCommunities((current) => current.filter((item) => item.id !== deleteTarget.id));
      closeDeleteDialog();
      showToast("Community deleted.");
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : "Could not delete community.");
    } finally {
      setIsDeleting(false);
    }
  }

  function startRenameFromDialog() {
    if (!deleteTarget) {
      return;
    }

    setEditingId(deleteTarget.id);
    setEditingName(deleteTarget.name);
    closeDeleteDialog();
    finishDeleteDialogClose();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-display-sm text-text-warm">Communities</h2>
        <p className="mt-1 text-sm text-text-muted-warm">
          Create communities and review leads captured from activities in each community.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid gap-4 rounded-xl border border-border-warm bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div className="space-y-2">
          <Label htmlFor="community-name">New community</Label>
          <Input
            id="community-name"
            value={name}
            maxLength={100}
            placeholder="e.g. Ikigai"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={saving}>
            Add community
          </Button>
        </div>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div
        className={cn(
          "overflow-x-auto rounded-xl border border-border-warm bg-card",
          deleteTarget !== null && "pointer-events-none"
        )}
      >
        <table className={communitiesTableClassName}>
          <thead>
            <tr className="border-b border-border-warm bg-muted/30">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted-warm"
              >
                Community
              </th>
              <th
                scope="col"
                className="w-28 px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-text-muted-warm"
              >
                Activities
              </th>
              <th
                scope="col"
                className="w-28 px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-text-muted-warm"
              >
                Leads
              </th>
              <th scope="col" className="w-32 px-4 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-text-muted-warm">
                  Loading communities…
                </td>
              </tr>
            ) : communities.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-text-muted-warm">
                  No communities yet. Add one above, then assign it when creating activities.
                </td>
              </tr>
            ) : (
              communities.map((community) => (
                <tr key={community.id} className="border-b border-border-warm last:border-b-0">
                  <td className="px-4 py-4 align-middle">
                    {editingId === community.id ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={editingName}
                          maxLength={100}
                          onChange={(event) => setEditingName(event.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={saving}
                            onClick={() => void handleSaveEdit(community.id)}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Link
                        href={`/activities/communities/${community.id}`}
                        className="font-medium text-text-warm hover:underline"
                      >
                        {community.name}
                      </Link>
                    )}
                  </td>
                  <td className="w-28 px-4 py-4 text-center align-middle tabular-nums text-text-muted-warm">
                    {community.activityCount > 0 ? (
                      <Link
                        href={`/activities?community=${encodeURIComponent(community.name)}`}
                        className="text-status-contacted underline-offset-2 hover:underline"
                        title={`View ${community.activityCount} activit${community.activityCount === 1 ? "y" : "ies"} in ${community.name}`}
                      >
                        {community.activityCount}
                      </Link>
                    ) : (
                      community.activityCount
                    )}
                  </td>
                  <td className="w-28 px-4 py-4 text-center align-middle tabular-nums text-text-muted-warm">
                    {community.leadCount}
                  </td>
                  <td className="w-32 px-4 py-4 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/activities/communities/${community.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
                        aria-label={`View leads for ${community.name}`}
                        title="View leads"
                      >
                        <Users className="size-4" />
                      </Link>
                      {editingId !== community.id ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Rename ${community.name}`}
                            title="Rename"
                            onClick={() => {
                              setEditingId(community.id);
                              setEditingName(community.name);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Delete ${community.name}`}
                            title="Delete"
                            onClick={() => openDeleteDialog(community)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DeleteCatalogItemDialog
        kind="community"
        open={deleteDialogOpen}
        name={deleteTarget?.name ?? ""}
        activityCount={deleteTarget?.activityCount ?? 0}
        leadCount={deleteTarget?.leadCount}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteDialog();
          }
        }}
        onOpenChangeComplete={(open) => {
          if (!open) {
            finishDeleteDialogClose();
          }
        }}
        onConfirm={() => void performDelete()}
        onRenameInstead={startRenameFromDialog}
      />
    </div>
  );
}
