import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { ClipboardList, PlusCircle, Upload, Calendar, Languages } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface QuestionnaireVersion {
  id: number;
  version: string;
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

export default function AdminQuestionnaires() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadQuestionnaires();
  }, []);

  const loadQuestionnaires = async () => {
    try {
      const res = await api.get("/questionnaires");
      setQuestionnaires(res.data);
    } catch (error) {
      console.error("Failed to load questionnaires:", error);
    } finally {
      setLoading(false);
    }
  };


  const filtered = questionnaires.filter(q =>
    q.code.toLowerCase().includes(search.toLowerCase()) ||
    q.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-lg font-semibold text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900">Questionnaire Management</h1>
        <div className="flex gap-3">
          <Link
            to="/admin/questionnaires/import"
            className="inline-flex items-center px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-xl shadow-lg hover:bg-purple-700 transition-all duration-300"
          >
            <Upload className="w-5 h-5 mr-2" />
            Import JSON
          </Link>
          <Link
            to="/admin/questionnaires/create"
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 transition-all duration-300"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Create Manual
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by code or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl shadow-lg border-none bg-white">
          <CardContent className="py-16">
            <div className="text-center">
              <ClipboardList className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {search ? "No questionnaires found" : "No questionnaires yet"}
              </h3>
              <p className="text-gray-500 mb-6">
                {search ? "Try adjusting your search" : "Create your first ASQ-3 questionnaire"}
              </p>
              {!search && (
                <Link
                  to="/admin/questionnaires/create"
                  className="inline-flex items-center px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Create Questionnaire
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((q) => (
            <Link key={q.id} to={`/admin/questionnaires/${q.id}`}>
              <Card className="rounded-2xl shadow-lg border-none hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-blue-600 mb-1">{q.code}</div>
                      <CardTitle className="text-xl font-bold text-gray-800">{q.title}</CardTitle>
                    </div>
                    <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      {q.versions[0]?.version || "No version"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    Age range: {q.minMonth}-{q.maxMonth} months
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Languages className="w-4 h-4 mr-2 text-gray-400" />
                    Language: {q.language.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {q.versions.length} version{q.versions.length !== 1 ? "s" : ""}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
