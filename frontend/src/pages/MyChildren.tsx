import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

interface Child {
  id: number;
  fullName: string;
  gender: string;
  birthDate: string;
  prematureWeeks: number;
}

export default function MyChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChildren = () => {
    api.get("/children/my")
      .then((res) => setChildren(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadChildren();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Children</h1>
          <p className="text-gray-600 mt-1">Manage your children's information and assessments</p>
        </div>
        <Link
          to="/children/new"
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all font-semibold"
        >
          <span className="text-xl">+</span>
          Add New Child
        </Link>
      </div>

      {children.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">👶</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No children yet</h3>
            <p className="text-gray-600 mb-6">
              Add your first child to start tracking their development with ASQ-3 assessments.
            </p>
            <Link
              to="/children/new"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all font-bold text-lg"
            >
              <span className="text-2xl">+</span>
              Add Your First Child
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {children.map((child) => (
            <div
              key={child.id}
              className="bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-3xl text-white shadow-md">
                      {child.gender === "MALE" ? "👦" : child.gender === "FEMALE" ? "👧" : "👤"}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">{child.fullName}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">{child.gender}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium">{getAge(child.birthDate)} months old</span>
                        </span>
                        <span>•</span>
                        <span>Born: {new Date(child.birthDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {child.prematureWeeks > 0 && (
                      <span className="px-3 py-1.5 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full">
                        ⚠️ Premature {child.prematureWeeks}w
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                <Link
                  to={`/children/${child.id}`}
                  className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                >
                  View Details →
                </Link>
                <div className="flex gap-2">
                  <Link
                    to={`/children/${child.id}/edit`}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition"
                  >
                    Edit
                  </Link>
                  <Link
                    to={`/children/${child.id}/new-assessment`}
                    className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    New Assessment
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

