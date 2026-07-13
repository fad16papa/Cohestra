"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { DeleteCatalogItemDialog } from "@/components/activities/delete-catalog-item-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
  type CategoryListItem,
} from "@/lib/categories-api";
import { cn } from "@/lib/utils";

const categoriesTableClassName = "w-full min-w-[28rem] border-collapse text-sm";

export function CategoriesListPage() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryListItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function openDeleteDialog(category: CategoryListItem) {
    if (deleteTarget !== null) {
      return;
    }

    setDeleteTarget(category);
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    setDeleteDialogOpen(false);
  }

  function finishDeleteDialogClose() {
    setDeleteTarget(null);
  }

  async function loadCategories() {
    setLoading(true);
    try {
      const items = await fetchCategories(authFetch);
      setCategories(items);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load categories."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, [authFetch]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      showToast("Category name is required.");
      return;
    }

    setSaving(true);
    try {
      const created = await createCategory(authFetch, name.trim());
      setCategories((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setName("");
      showToast("Category created.");
    } catch (createError) {
      showToast(createError instanceof Error ? createError.message : "Could not create category.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(categoryId: string) {
    if (!editingName.trim()) {
      showToast("Category name is required.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateCategory(authFetch, categoryId, editingName.trim());
      setCategories((current) =>
        current
          .map((item) => (item.id === updated.id ? updated : item))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      setEditingName("");
      showToast("Category updated.");
    } catch (updateError) {
      showToast(updateError instanceof Error ? updateError.message : "Could not update category.");
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
      await deleteCategory(authFetch, deleteTarget.id);
      setCategories((current) => current.filter((item) => item.id !== deleteTarget.id));
      closeDeleteDialog();
      showToast("Category deleted.");
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : "Could not delete category.");
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
        <h2 className="text-display-sm text-text-warm">Categories</h2>
        <p className="mt-1 text-sm text-text-muted-warm">
          Create categories and assign them when setting up activities.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid gap-4 rounded-xl border border-border-warm bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div className="space-y-2">
          <Label htmlFor="category-name">New category</Label>
          <Input
            id="category-name"
            value={name}
            maxLength={100}
            placeholder="e.g. tennis, pickleball"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={saving}>
            Add category
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
        <table className={categoriesTableClassName}>
          <thead>
            <tr className="border-b border-border-warm bg-muted/30">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted-warm"
              >
                Category
              </th>
              <th
                scope="col"
                className="w-28 px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-text-muted-warm"
              >
                Activities
              </th>
              <th scope="col" className="w-24 px-4 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-text-muted-warm">
                  Loading categories…
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-text-muted-warm">
                  No categories yet. Add one above, then assign it when creating activities.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="border-b border-border-warm last:border-b-0">
                  <td className="px-4 py-4 align-middle">
                    {editingId === category.id ? (
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
                            onClick={() => void handleSaveEdit(category.id)}
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
                      <p className="font-medium text-text-warm">{category.name}</p>
                    )}
                  </td>
                  <td className="w-28 px-4 py-4 text-center align-middle tabular-nums text-text-muted-warm">
                    {category.activityCount > 0 ? (
                      <Link
                        href={`/activities?category=${encodeURIComponent(category.name)}`}
                        className="text-status-contacted underline-offset-2 hover:underline"
                        title={`View ${category.activityCount} activit${category.activityCount === 1 ? "y" : "ies"} in ${category.name}`}
                      >
                        {category.activityCount}
                      </Link>
                    ) : (
                      category.activityCount
                    )}
                  </td>
                  <td className="w-24 px-4 py-4 align-middle">
                    {editingId !== category.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Rename ${category.name}`}
                          title="Rename"
                          onClick={() => {
                            setEditingId(category.id);
                            setEditingName(category.name);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Delete ${category.name}`}
                          title="Delete"
                          onClick={() => openDeleteDialog(category)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DeleteCatalogItemDialog
        kind="category"
        open={deleteDialogOpen}
        name={deleteTarget?.name ?? ""}
        activityCount={deleteTarget?.activityCount ?? 0}
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
