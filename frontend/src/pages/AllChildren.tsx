import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Search, Calendar, User, Loader2, Users } from "lucide-react";

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
    (c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    c.parent?.username.toLowerCase().includes(search.toLowerCase())) && c.parent
  );

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
          <h1 className="text-3xl font-bold text-gray-900">All Children</h1>
          <p className="text-gray-600 mt-1">View and manage all children in the system</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or parent..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {filteredChildren.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No children found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChildren.map((child) => (
            <Link
              key={child.id}
              to={`/children/${child.id}`}
              className="block p-5 bg-white rounded-xl border hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start gap-4 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
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
              {child.parent && (
                <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                  <User className="w-3 h-3" />
                  <span>Parent: {child.parent.username}</span>
                </div>
              )}
              {child.prematureWeeks > 0 && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-md">
                    Premature {child.prematureWeeks}w
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

