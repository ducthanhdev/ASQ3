import { useState, useEffect } from "react";
import { api } from "../../api/client";

interface Questionnaire {
  id: number;
  code: string;
  title: string;
  minMonth: number;
  maxMonth: number;
  language: string;
  versions: { id: number; version: string }[];
}

export default function AdminQuestionnaires() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/questionnaires")
      .then((res) => setQuestionnaires(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Questionnaires</h1>

      <div className="grid gap-6">
        {questionnaires.map((q) => (
          <div key={q.id} className="p-6 bg-white rounded-lg border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-1">{q.title}</h2>
                <p className="text-sm text-gray-600">Code: {q.code}</p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                {q.language.toUpperCase()}
              </span>
            </div>

            <div className="flex gap-6 mb-4 text-sm">
              <div>
                <span className="text-gray-600">Age Range:</span>
                <span className="ml-2 font-medium">{q.minMonth} - {q.maxMonth} months</span>
              </div>
              <div>
                <span className="text-gray-600">Versions:</span>
                <span className="ml-2 font-medium">{q.versions.length}</span>
              </div>
            </div>

            {q.versions.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Latest Version:</p>
                <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-700 text-sm font-mono rounded">
                  {q.versions[0].version}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {questionnaires.length === 0 && (
        <div className="py-12 text-center text-gray-500">No questionnaires found</div>
      )}
    </div>
  );
}

