import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../../api/client";
import { ArrowLeft, Calendar, Languages, Eye, Trash2, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface QuestionnaireVersion {
  id: number;
  version: string;
  structureJson: any;
  createdAt: string;
}

interface Questionnaire {
  id: number;
  code: string;
  title: string;
  minMonth: number;
  maxMonth: number;
  language: string;
  createdAt: string;
  versions: QuestionnaireVersion[];
}

export default function QuestionnaireDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<QuestionnaireVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestionnaire();
  }, [id]);

  const loadQuestionnaire = async () => {
    try {
      const res = await api.get(`/questionnaires/${id}`);
      setQuestionnaire(res.data);
      if (res.data.versions.length > 0) {
        setSelectedVersion(res.data.versions[0]);
      }
    } catch (error) {
      console.error("Failed to load questionnaire:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${questionnaire?.title}"?\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/questionnaires/${id}`);
      navigate("/admin/questionnaires");
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to delete questionnaire");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-lg font-semibold text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-lg font-semibold text-red-600">Questionnaire not found</div>
      </div>
    );
  }

  const structure = selectedVersion?.structureJson;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/admin/questionnaires")}
            className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Questionnaires
          </button>
          <div className="flex gap-3">
            <Link
              to={`/admin/questionnaires/${id}/edit`}
              className="inline-flex items-center px-5 py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
            <Link
              to={`/admin/questionnaires/${id}/versions`}
              className="inline-flex items-center px-5 py-2.5 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors"
            >
              <Eye className="w-4 h-4 mr-2" />
              Versions
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-5 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>

        <Card className="rounded-2xl shadow-lg border-none mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-blue-600 mb-1">{questionnaire.code}</div>
                <CardTitle className="text-3xl font-bold text-gray-900">{questionnaire.title}</CardTitle>
              </div>
              <div className="px-4 py-2 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                {selectedVersion?.version || "No version"}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center text-gray-700">
              <Calendar className="w-5 h-5 mr-2 text-gray-400" />
              Age Range: {questionnaire.minMonth}-{questionnaire.maxMonth} months
            </div>
            <div className="flex items-center text-gray-700">
              <Languages className="w-5 h-5 mr-2 text-gray-400" />
              Language: {questionnaire.language.toUpperCase()}
            </div>
          </CardContent>
        </Card>

        {questionnaire.versions.length > 1 && (
          <Card className="rounded-2xl shadow-lg border-none mb-6">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-800">Select Version</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {questionnaire.versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVersion(v)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      selectedVersion?.id === v.id
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {v.version}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {structure && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Domains & Questions</h2>
            <div className="space-y-6">
              {structure.domains?.map((domain: any, idx: number) => (
                <Card key={idx} className="rounded-2xl shadow-lg border-none">
                  <CardHeader className="bg-blue-50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold text-gray-900">{domain.title}</CardTitle>
                      <span className="text-sm font-semibold text-blue-700">
                        Cutoff: {domain.cutoff_score}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {domain.questions?.map((q: any, qIdx: number) => (
                        <div key={qIdx} className="flex items-start p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-3">
                            {qIdx + 1}
                          </div>
                          <div className="flex-1 text-gray-800">{q.text}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {structure.overall_section && structure.overall_section.length > 0 && (
              <Card className="rounded-2xl shadow-lg border-none mt-8">
                <CardHeader className="bg-orange-50">
                  <CardTitle className="text-xl font-bold text-gray-900">Overall Questions</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {structure.overall_section.map((q: any, idx: number) => (
                      <div key={idx} className="flex items-start p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-3">
                          {idx + 1}
                        </div>
                        <div className="flex-1 text-gray-800">{q.text}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {structure.rules && (
              <Card className="rounded-2xl shadow-lg border-none mt-6">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900">Scoring Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-green-50 rounded-xl">
                      <div className="text-sm text-green-600 font-medium">YES</div>
                      <div className="text-2xl font-bold text-green-700">{structure.rules.score_values?.Y}</div>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-xl">
                      <div className="text-sm text-yellow-600 font-medium">SOMETIMES</div>
                      <div className="text-2xl font-bold text-yellow-700">{structure.rules.score_values?.S}</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl">
                      <div className="text-sm text-red-600 font-medium">NOT YET</div>
                      <div className="text-2xl font-bold text-red-700">{structure.rules.score_values?.N}</div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl">
                      <div className="text-sm text-purple-600 font-medium">Monitor Margin</div>
                      <div className="text-2xl font-bold text-purple-700">{structure.rules.monitor_margin}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

