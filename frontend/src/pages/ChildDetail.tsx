import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";

interface Child {
  id: number;
  fullName: string;
  gender: string;
  birthDate: string;
  prematureWeeks: number;
  guardianName: string | null;
  guardianPhone: string | null;
  note: string | null;
  ageMonths: number;
  adjustedAgeMonths: number;
  parent: { id: number; username: string; email: string };
  assessments: {
    id: number;
    createdAt: string;
    summaryResultJson: any;
  }[];
}

export default function ChildDetail() {
  const { id } = useParams();
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/children/${id}`)
      .then((res) => setChild(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!child) return <div>Child not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{child.fullName}</h1>
        <Link
          to={`/children/${id}/edit`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Edit
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Gender</p>
              <p className="font-medium">{child.gender}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Birth Date</p>
              <p className="font-medium">{new Date(child.birthDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Age</p>
              <p className="font-medium">{child.ageMonths} months</p>
            </div>
            {child.prematureWeeks > 0 && (
              <div>
                <p className="text-sm text-gray-600">Adjusted Age</p>
                <p className="font-medium text-orange-600">
                  {child.adjustedAgeMonths} months
                  <span className="text-sm text-gray-500 ml-2">
                    (premature {child.prematureWeeks} weeks)
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Guardian Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Guardian Name</p>
              <p className="font-medium">{child.guardianName || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Guardian Phone</p>
              <p className="font-medium">{child.guardianPhone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Parent Account</p>
              <p className="font-medium">{child.parent.username}</p>
            </div>
          </div>
        </div>
      </div>

      {child.note && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-2">Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{child.note}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Assessment History</h2>
          <Link
            to={`/children/${id}/new-assessment`}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            New Assessment
          </Link>
        </div>

        {child.assessments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No assessments yet</p>
        ) : (
          <div className="space-y-3">
            {child.assessments.map((assessment) => (
              <Link
                key={assessment.id}
                to={`/assessment/${assessment.id}`}
                className="block p-4 border rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Assessment #{assessment.id}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {assessment.summaryResultJson && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                      Completed
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

