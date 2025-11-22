import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { ArrowLeft, Calendar } from "lucide-react";
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
  versions: QuestionnaireVersion[];
}

export default function QuestionnaireVersions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, [id]);

  const loadVersions = async () => {
    try {
      const res = await api.get(`/questionnaires/${id}/versions`);
      const qRes = await api.get(`/questionnaires/${id}`);
      setQuestionnaire({ ...qRes.data, versions: res.data });
    } catch (error) {
      console.error("Failed to load versions:", error);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(`/admin/questionnaires/${id}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Details
          </button>
        </div>

        <div className="mb-8">
          <div className="text-sm font-semibold text-blue-600 mb-1">{questionnaire.code}</div>
          <h1 className="text-4xl font-extrabold text-gray-900">{questionnaire.title}</h1>
          <p className="text-gray-600 mt-2">{questionnaire.versions.length} version(s)</p>
        </div>

        <div className="space-y-4">
          {questionnaire.versions.map((version) => (
            <Card key={version.id} className="rounded-2xl shadow-lg border-none hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">{version.version}</CardTitle>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      Created: {new Date(version.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                    {version.structureJson?.domains?.length || 0} domains
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/admin/questionnaires/${id}`)}
                    className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

