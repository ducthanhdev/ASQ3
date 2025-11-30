import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Edit, Calendar, User, Phone, Mail, FileText, Plus, Loader2, AlertCircle, Scan, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";

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
    finalConclusion?: string;
  }[];
}

export default function ChildDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingScan, setLoadingScan] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/children/${id}`)
      .then((res) => setChild(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  const getConclusionColor = (conclusion?: string) => {
    if (conclusion === "REFER") return "bg-red-100 text-red-700";
    if (conclusion === "MONITOR") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const handlePrintQuestionnaire = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/questionnaires/auto-select?childId=${id}`);
      navigate(`/print-questionnaire/${res.data.version.id}?childId=${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể tải bảng câu hỏi");
    }
  };

  const handleScanAssessment = async () => {
    if (!id) return;
    setLoadingScan(true);
    try {
      const res = await api.get(`/questionnaires/auto-select?childId=${id}`);
      navigate(`/scan-assessment?childId=${id}&questionnaireVersionId=${res.data.version.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể tải bảng câu hỏi");
    } finally {
      setLoadingScan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading child information...</p>
        </div>
      </div>
    );
  }

  if (!child || !child?.parent) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Child not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{child.fullName}</h1>
          <p className="text-gray-600 mt-1">Child profile and assessment history</p>
        </div>
        <Link
          to={`/children/${id}/edit`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Edit className="w-4 h-4" />
          Edit
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Gender</p>
                <p className="font-medium text-gray-900">{child.gender}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Birth Date</p>
                <p className="font-medium text-gray-900">{new Date(child.birthDate).toLocaleDateString("vi-VN")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Age</p>
                <p className="font-medium text-gray-900">{child.ageMonths} months</p>
              </div>
            </div>
            {child.prematureWeeks > 0 && (
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-500">Adjusted Age</p>
                  <p className="font-medium text-orange-600">
                    {child.adjustedAgeMonths} months
                    <span className="text-sm text-gray-500 ml-2">(premature {child.prematureWeeks} weeks)</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Guardian Information</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Guardian Name</p>
                <p className="font-medium text-gray-900">{child.guardianName || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Guardian Phone</p>
                <p className="font-medium text-gray-900">{child.guardianPhone || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Parent Account</p>
                <p className="font-medium text-gray-900">{child.parent.username}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {child.note && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{child.note}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assessment History</h2>
            <p className="text-sm text-gray-600 mt-1">View and manage assessment records</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handlePrintQuestionnaire} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-2" />
              In phiếu
            </Button>
            <Button
              onClick={handleScanAssessment}
              disabled={loadingScan}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Scan className="w-4 h-4 mr-2" />
              {loadingScan ? "Loading..." : "Scan Assessment"}
            </Button>
            <Link to={`/children/${id}/new-assessment`}>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                New Assessment
              </Button>
            </Link>
          </div>
        </div>

        {child.assessments.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No assessments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {child.assessments.map((assessment) => (
              <Link
                key={assessment.id}
                to={`/assessment/${assessment.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Assessment #{assessment.id}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(assessment.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>
                  {assessment.finalConclusion && (
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getConclusionColor(assessment.finalConclusion)}`}>
                      {assessment.finalConclusion}
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
