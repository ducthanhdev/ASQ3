import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

interface Child {
  id: number;
  fullName: string;
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

  useEffect(() => {
    api.get("/children")
      .then((res) => setChildren(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">All Children</h1>

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
            {child.parent && (
              <p className="text-sm text-gray-500 mt-1">
                Parent: {child.parent.username}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

