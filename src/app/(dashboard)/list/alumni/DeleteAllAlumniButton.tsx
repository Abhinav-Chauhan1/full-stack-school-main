"use client";

import { useState } from "react";
import { deleteAllAlumni } from "./actions";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function DeleteAllAlumniButton({ count }: { count: number }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteAllAlumni();
    setLoading(false);
    setConfirming(false);
    if (result.success) {
      toast.success(`Deleted ${result.count} alumni student${result.count !== 1 ? "s" : ""}`);
      router.refresh();
    } else {
      toast.error(result.message || "Failed to delete alumni");
    }
  };

  if (count === 0) return null;

  return confirming ? (
    <div className="flex items-center gap-2">
      <span className="text-sm text-red-600">Delete all {count} alumni? This cannot be undone.</span>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? "Deleting..." : "Confirm"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
      >
        Cancel
      </button>
    </div>
  ) : (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
    >
      Delete All Alumni
    </button>
  );
}
