import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

interface Child {
  id: number;
  fullName: string;
  birthDate: string;
  prematureWeeks: number;
}

export default function MyChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/children/my")
      .then((res) => setChildren(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Children</h1>
        <Link
          to="/children/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Child
        </Link>
      </div>

      {children.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No children yet. Add your first child to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {children.map((child) => (
            <Link
              key={child.id}
              to={`/children/${child.id}`}
              className="block p-6 bg-white rounded-lg border hover:shadow-md transition"
            >
              <h3 className="text-xl font-semibold mb-2">{child.fullName}</h3>
              <p className="text-gray-600">
                Birth Date: {new Date(child.birthDate).toLocaleDateString()}
              </p>
              {child.prematureWeeks > 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  Premature: {child.prematureWeeks} weeks
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

