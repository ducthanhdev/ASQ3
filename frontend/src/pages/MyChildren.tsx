import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Plus, Baby, Calendar, Edit, FileText, Loader2 } from "lucide-react";

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

  const getAge = (birthDate: string) => {
    const diffMs = Date.now() - new Date(birthDate).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 30);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading children...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Children</h1>
          <p className="text-gray-600 mt-1">Manage your children's information and assessments</p>
        </div>
        <Link
          to="/children/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add New Child
        </Link>
      </div>

      {children.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Baby className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No children yet</h3>
            <p className="text-gray-600 mb-6">
              Add your first child to start tracking their development with ASQ-3 assessments.
            </p>
            <Link
              to="/children/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Your First Child
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <div
              key={child.id}
              className="bg-white rounded-xl border hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    child.gender === "MALE" ? "bg-blue-100" : child.gender === "FEMALE" ? "bg-pink-100" : "bg-gray-100"
                  }`}>
                    {child.gender === "MALE" ? "👦" : child.gender === "FEMALE" ? "👧" : "👤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{child.fullName}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Calendar className="w-3 h-3" />
                      <span>{getAge(child.birthDate)} months</span>
                    </div>
                  </div>
                </div>
                {child.prematureWeeks > 0 && (
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-md">
                      Premature {child.prematureWeeks}w
                    </span>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 bg-gray-50 border-t flex items-center justify-between gap-2">
                <Link
                  to={`/children/${child.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Details
                </Link>
                <div className="flex gap-2">
                  <Link
                    to={`/children/${child.id}/edit`}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <Link
                    to={`/children/${child.id}/new-assessment`}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="New Assessment"
                  >
                    <FileText className="w-4 h-4" />
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

