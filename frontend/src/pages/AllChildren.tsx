import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

interface Child {
  id: number;
  fullName: string;
  gender: string;
  birthDate: string;
  prematureWeeks: number;
  parent?: {
    id: number;
    username: string;
  };
}

export default function AllChildren() {
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

  const getAge = (birthDate: string) => {
    const diffMs = Date.now() - new Date(birthDate).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 30);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">All Children</h1>
        <input
          type="text"
          placeholder="Search children..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4">
        {filteredChildren.map((child) => (
          <Link
            key={child.id}
            to={`/children/${child.id}`}
            className="block p-6 bg-white rounded-lg border hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-1">{child.fullName}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {child.gender} • {getAge(child.birthDate)} months old
                </p>
                <p className="text-sm text-gray-600">
                  Born: {new Date(child.birthDate).toLocaleDateString()}
                </p>
                {child.parent && (
                  <p className="text-sm text-gray-500 mt-2">
                    Parent: {child.parent.username}
                  </p>
                )}
              </div>
              {child.prematureWeeks > 0 && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                  Premature {child.prematureWeeks}w
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filteredChildren.length === 0 && (
        <div className="py-12 text-center text-gray-500">No children found</div>
      )}
    </div>
  );
}

