import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { ArrowLeft, Upload, FileJson, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function QuestionnaireImport() {
  const navigate = useNavigate();
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        setJsonText(JSON.stringify(parsed, null, 2));
        setError("");
      } catch (err) {
        setError("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/json") {
      processFile(file);
    } else {
      setError("Please drop a valid JSON file");
    }
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (!jsonText.trim()) {
        setError("Please provide JSON content");
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(jsonText);
      
      let payload;
      if (parsed.structure) {
        payload = {
          code: parsed.code,
          title: parsed.title,
          minMonth: parsed.minMonth,
          maxMonth: parsed.maxMonth,
          language: parsed.language,
          version: parsed.version || "v1.0",
          structure: parsed.structure
        };
      } else if (parsed.structureJson) {
        payload = {
          code: parsed.code,
          title: parsed.title,
          minMonth: parsed.minMonth,
          maxMonth: parsed.maxMonth,
          language: parsed.language,
          version: parsed.version || "v1.0",
          structure: parsed.structureJson
        };
      } else if (parsed.metadata && parsed.domains) {
        payload = {
          code: parsed.code || parsed.metadata.code,
          title: parsed.title || parsed.metadata.title,
          minMonth: parsed.minMonth || parsed.metadata.min_month,
          maxMonth: parsed.maxMonth || parsed.metadata.max_month,
          language: parsed.language || parsed.metadata.language,
          version: parsed.version || parsed.metadata.version || "v1.0",
          structure: {
            metadata: parsed.metadata,
            domains: parsed.domains,
            overall_section: parsed.overall_section || {},
            rules: parsed.rules || { score_values: { Y: 10, S: 5, N: 0 }, monitor_margin: 2 }
          }
        };
      } else {
        throw new Error("Invalid JSON structure. Must have 'structure', 'structureJson', or 'metadata' + 'domains' fields.");
      }

      if (!payload.code || !payload.title || payload.minMonth === undefined || payload.maxMonth === undefined || !payload.language) {
        throw new Error("Missing required fields: code, title, minMonth, maxMonth, language");
      }

      if (!payload.structure || !payload.structure.domains) {
        throw new Error("Missing 'structure.domains' field");
      }

      await api.post("/questionnaires/import-json", payload);
      setSuccess("Questionnaire imported successfully!");
      setTimeout(() => navigate("/admin/questionnaires"), 2000);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON format: " + err.message);
      } else {
        const errorMessage = err.response?.data?.message || err.message || "Failed to import questionnaire";
        setError(errorMessage);
        console.error("Import error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate("/admin/questionnaires")}
            className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Questionnaires
          </button>
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Import Questionnaire (JSON)</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center text-green-700">
            <CheckCircle className="w-5 h-5 mr-2" />
            {success}
          </div>
        )}

        <Card className="rounded-2xl shadow-lg border-none mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-800">Upload JSON File</CardTitle>
            <p className="text-sm text-gray-500 mt-2">
              Supports both formats: with top-level fields or nested structure
            </p>
          </CardHeader>
          <CardContent>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
              }`}
            >
              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                <FileJson className="w-12 h-12 text-gray-400 mb-3" />
                <span className="text-sm text-gray-600 font-medium">Click to upload JSON file</span>
                <span className="text-xs text-gray-500 mt-1">or drag and drop</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-lg border-none">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-800">JSON Content</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='Paste or upload JSON here...'
              className="w-full h-96 p-4 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-end mt-6">
              <button
                onClick={handleSubmit}
                disabled={!jsonText.trim() || loading}
                className="inline-flex items-center px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4 mr-2" />
                {loading ? "Importing..." : "Import Questionnaire"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

