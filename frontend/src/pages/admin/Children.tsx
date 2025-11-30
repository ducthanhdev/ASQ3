import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

interface Child {
  id: number;
  fullName: string;
  gender: string;
  birthDate: string;
  prematureWeeks: number;
  parent?: {
    id: number;
    username: string;
  } | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  createdAt: string;
}

export default function AdminChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState<string>("ALL");

  useEffect(() => {
    api.get("/children")
      .then((res) => {
        const childrenWithParentOrGuardian = res.data.filter((child: Child) => {
          const hasParent = child.parent && child.parent.id;
          return hasParent;
        });
        setChildren(childrenWithParentOrGuardian);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredChildren = children.filter((c) => {
    const matchSearch = c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.parent?.username?.toLowerCase().includes(search.toLowerCase());
    const matchGender = filterGender === "ALL" || c.gender === filterGender;
    return matchSearch && matchGender;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading children...</div>
      </div>
    );
  }

  const getAge = (birthDate: string) => {
    const diffMs = Date.now() - new Date(birthDate).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 30);
  };

  const genderStats = {
    MALE: children.filter(c => c.gender === "MALE").length,
    FEMALE: children.filter(c => c.gender === "FEMALE").length,
    premature: children.filter(c => c.prematureWeeks >= 3).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Children Records</h1>
          <p className="text-gray-600 mt-1">View and manage all children in the system</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Male Children</p>
              <p className="text-2xl font-bold text-blue-600">{genderStats.MALE}</p>
            </div>
            <span className="text-3xl">👦</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Female Children</p>
              <p className="text-2xl font-bold text-pink-600">{genderStats.FEMALE}</p>
            </div>
            <span className="text-3xl">👧</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Premature (≥3w)</p>
              <p className="text-2xl font-bold text-orange-600">{genderStats.premature}</p>
            </div>
            <span className="text-3xl">⚠️</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search by name or parent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Child</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Birth Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Age</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Parent</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredChildren.map((child) => {
                const age = getAge(child.birthDate);
                return (
                  <tr key={child.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                          {child.gender === "MALE" ? "👦" : child.gender === "FEMALE" ? "👧" : "👤"}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{child.fullName}</p>
                          <p className="text-xs text-gray-500">ID: {child.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{child.gender}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(child.birthDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{age} months</div>
                      {child.prematureWeeks > 0 && (
                        <span className="inline-flex px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full mt-1">
                          Premature {child.prematureWeeks}w
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {child.parent ? child.parent.username : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(child.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/children/${child.id}`}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredChildren.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              <p className="text-lg mb-2">No children found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredChildren.length}</span> of <span className="font-semibold">{children.length}</span> children
          </p>
        </div>
      </div>
    </div>
  );
}

