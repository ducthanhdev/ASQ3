import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

interface Assessment {
  id: number;
  childId: number;
  assessmentDate: string;
  finalConclusion: string;
  method: string;
  createdAt: string;
  child?: {
    id: number;
    fullName: string;
  };
}

export default function AdminAssessments() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/children"),
      api.get("/assessments"),
    ]).then(([childrenRes, assessmentsRes]) => {
      const validChildren = childrenRes.data.filter((child: any) => {
        const hasParent = child.parent && child.parent.id;
        return hasParent;
      });
      
      const validIds = new Set<number>(validChildren.map((c: any) => c.id as number));
      
      const filteredAssessments = assessmentsRes.data.filter((assessment: Assessment) => {
        return assessment.child && validIds.has(assessment.child.id);
      });
      
      setAssessments(filteredAssessments);
    }).finally(() => setLoading(false));
  }, []);

  const filteredAssessments = assessments.filter((a) =>
    a.child?.fullName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading assessments...</div>
      </div>
    );
  }

  const stats = {
    total: assessments.length,
    online: assessments.filter(a => a.method === "ONLINE").length,
    ocr: assessments.filter(a => a.method === "SCAN").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Assessments</h1>
          <p className="text-gray-600 mt-1">View and manage all ASQ-3 assessments</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Assessments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <span className="text-3xl">✅</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Online Method</p>
              <p className="text-2xl font-bold text-blue-600">{stats.online}</p>
            </div>
            <span className="text-3xl">💻</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">OCR Method</p>
              <p className="text-2xl font-bold text-purple-600">{stats.ocr}</p>
            </div>
            <span className="text-3xl">📄</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <input
            type="text"
            placeholder="Search by child name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Assessment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Child</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAssessments.map((assessment) => (
                <tr key={assessment.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">Assessment #{assessment.id}</div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(assessment.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {assessment.child ? (
                      <Link
                        to={`/children/${assessment.child.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {assessment.child.fullName}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(assessment.assessmentDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      assessment.method === "ONLINE"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {assessment.method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      assessment.finalConclusion === "NORMAL"
                        ? "bg-green-100 text-green-700"
                        : assessment.finalConclusion === "MONITOR"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {assessment.finalConclusion}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/assessment/${assessment.id}`}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAssessments.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              <p className="text-lg mb-2">No assessments found</p>
              <p className="text-sm">Try adjusting your search</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredAssessments.length}</span> of <span className="font-semibold">{assessments.length}</span> assessments
          </p>
        </div>
      </div>
    </div>
  );
}

