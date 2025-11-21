import { useState, useEffect } from "react";
import { api } from "../api/client";

interface User {
  id: number;
  username: string;
  email: string | null;
  role: string;
  createdAt: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = () => {
    api.get("/users")
      .then((res) => setUsers(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`Delete user ${username}?`)) return;
    
    try {
      await api.delete(`/users/${id}`);
      loadUsers();
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Username</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Email</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Role</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Created</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{user.username}</td>
                <td className="px-6 py-4 text-gray-600">{user.email || "-"}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded ${
                    user.role === "ADMIN" ? "bg-red-100 text-red-700" :
                    user.role === "SPECIALIST" ? "bg-blue-100 text-blue-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(user.id, user.username)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

