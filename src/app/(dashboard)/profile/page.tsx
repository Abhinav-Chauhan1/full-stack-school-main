import { UserProfile } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";

export default async function ProfilePage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your profile and account preferences
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm">
          <UserProfile
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "border-0 shadow-none",
                navbar: "hidden",
                pageScrollBox: "p-8",
              },
            }}
          />
        </div>

        <div className="mt-6 text-sm text-gray-500 text-center">
          <p>Last signed in: {formatDate(user.lastSignInAt ? new Date(user.lastSignInAt) : null)}</p>
          <p>Member since: {formatDate(new Date(user.createdAt))}</p>
        </div>
      </div>
    </div>
  );
}
