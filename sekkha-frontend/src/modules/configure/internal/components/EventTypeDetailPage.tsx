import { useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { getMasterCategories } from "@/modules/events/internal/masterdata"
import { useAuth } from "@/modules/auth"

export function EventTypeDetailPage() {
  const { categoryId } = useParams({ strict: false }) as { categoryId?: string }
  const navigate = useNavigate()
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"
  const [category, setCategory] = useState(() =>
    getMasterCategories().find((item) => item.id === categoryId)
  )
  if (!category) {
    return (
      <main className="p-8">
        <p>Event category not found.</p>
        <button
          type="button"
          onClick={() => navigate({ to: "/configure/master/event-type" })}
        >
          Back
        </button>
      </main>
    )
  }
  const selectedCategory = category
  function toggleStatus() {
    const updated = getMasterCategories().map((item) =>
      item.id === selectedCategory.id
        ? { ...item, is_active: item.is_active === false }
        : item
    )
    localStorage.setItem("sekkha_master_categories", JSON.stringify(updated))
    setCategory(updated.find((item) => item.id === selectedCategory.id))
  }
  function remove() {
    if (!confirm(`Delete ${selectedCategory.name}?`)) return
    localStorage.setItem(
      "sekkha_master_categories",
      JSON.stringify(
        getMasterCategories().filter((item) => item.id !== selectedCategory.id)
      )
    )
    navigate({ to: "/configure/master/event-type" })
  }
  return (
    <main className="min-h-screen bg-[#fffaf0] p-6">
      <button
        type="button"
        onClick={() => navigate({ to: "/configure/master/event-type" })}
        className="mb-6 inline-flex items-center gap-2"
      >
        <ArrowLeftIcon className="size-4" />
        Back to list
      </button>
      <div className="max-w-2xl rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-6">
        <h1 className="text-2xl font-bold">{selectedCategory.name}</h1>
        <p className="mt-2">
          Status: {selectedCategory.is_active === false ? "Inactive" : "Active"}
        </p>
        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="font-bold">Autofill title</dt>
            <dd>
              {selectedCategory.autofillTitle ||
                `Vihara ${selectedCategory.name} Activity`}
            </dd>
          </div>
          <div>
            <dt className="font-bold">Location</dt>
            <dd>{selectedCategory.autofillLocation || "Not configured"}</dd>
          </div>
          <div>
            <dt className="font-bold">Description</dt>
            <dd>{selectedCategory.autofillDesc || "Not configured"}</dd>
          </div>
          <div>
            <dt className="font-bold">Allowed roles</dt>
            <dd>{selectedCategory.target_roles?.join(", ") || "All roles"}</dd>
          </div>
        </dl>
        {isAdmin && (
          <div className="mt-8 flex gap-2">
            <button
              type="button"
              onClick={() =>
                navigate({ to: "/configure/master/event-type/new" })
              }
              className="inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-white"
            >
              <PencilIcon className="size-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={toggleStatus}
              className="rounded border px-4 py-2"
            >
              {selectedCategory.is_active === false ? "Activate" : "Deactivate"}
            </button>
            <button
              type="button"
              onClick={remove}
              className="inline-flex items-center gap-2 rounded border border-red-300 px-4 py-2 text-red-700"
            >
              <Trash2Icon className="size-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
