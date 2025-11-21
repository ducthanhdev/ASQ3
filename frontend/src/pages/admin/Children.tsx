import { useState, useEffect } from "react";
import { api } from "../../api/client";

interface Child {
  id: number;
  fullName: string;
  birthDate: string;
  prematureWeeks: number;
  parent?: {
    id: number;
    username: string;
  };
  createdAt: string;
}

export default function AdminChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/children")
      .then((res) => setChildren(res.data))
      .finally(() => setLoading(false));
  }, []);

  const filteredChildren = children.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.parent?.username.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Children Records</h1>
        <input
          type="text"
          placeholder="Search children..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Child</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Birth Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredChildren.map((child) => {
              const age = Math.floor((Date.now() - new Date(child.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
              return (
                <tr key={child.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{child.fullName}</div>
                    <div className="text-sm text-gray-500">ID: {child.id}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(child.birthDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{age} months</div>
                    {child.prematureWeeks > 0 && (
                      <div className="text-xs text-orange-600">-{child.prematureWeeks}w</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {child.parent ? child.parent.username : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(child.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredChildren.length === 0 && (
          <div className="py-12 text-center text-gray-500">No children found</div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredChildren.length} of {children.length} children
      </div>
    </div>
  );
}

