import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { ArrowLeft, ArrowRight, Check, AlertCircle, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

interface Question {
  text: string;
}

interface Domain {
  key: string;
  title: string;
  cutoffScore: number;
  questions: Question[];
}

interface FormData {
  code: string;
  title: string;
  minMonth: number;
  maxMonth: number;
  language: string;
  description: string;
  version: string;
  domains: Domain[];
  overallQuestions: Question[];
}

const DOMAIN_TEMPLATES = [
  { key: "communication", title: "Giao tiếp (Communication)" },
  { key: "gross_motor", title: "Vận động thô (Gross Motor)" },
  { key: "fine_motor", title: "Vận động tinh (Fine Motor)" },
  { key: "problem_solving", title: "Giải quyết vấn đề (Problem Solving)" },
  { key: "personal_social", title: "Cá nhân - Xã hội (Personal-Social)" },
];

export default function QuestionnaireForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    code: "",
    title: "",
    minMonth: 0,
    maxMonth: 0,
    language: "vi",
    description: "",
    version: "v1.0",
    domains: DOMAIN_TEMPLATES.map(d => ({
      key: d.key,
      title: d.title,
      cutoffScore: 0,
      questions: Array(6).fill({ text: "" }).map(() => ({ text: "" })),
    })),
    overallQuestions: [{ text: "" }],
  });

  const updateMetadata = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const updateDomain = (domainIdx: number, field: string, value: any) => {
    const domains = [...formData.domains];
    domains[domainIdx] = { ...domains[domainIdx], [field]: value };
    setFormData({ ...formData, domains });
  };

  const updateQuestion = (domainIdx: number, questionIdx: number, text: string) => {
    const domains = [...formData.domains];
    domains[domainIdx].questions[questionIdx] = { text };
    setFormData({ ...formData, domains });
  };

  const updateOverallQuestion = (idx: number, text: string) => {
    const overallQuestions = [...formData.overallQuestions];
    overallQuestions[idx] = { text };
    setFormData({ ...formData, overallQuestions });
  };

  const addOverallQuestion = () => {
    setFormData({
      ...formData,
      overallQuestions: [...formData.overallQuestions, { text: "" }],
    });
  };

  const removeOverallQuestion = (idx: number) => {
    if (formData.overallQuestions.length <= 1) return;
    setFormData({
      ...formData,
      overallQuestions: formData.overallQuestions.filter((_, i) => i !== idx),
    });
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      await api.post("/questionnaires/create-manual", formData);
      navigate("/admin/questionnaires");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create questionnaire");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) {
      return formData.code && formData.title && formData.minMonth >= 0 && formData.maxMonth > formData.minMonth;
    }
    if (step === 2) {
      return formData.domains.every(d => 
        d.cutoffScore > 0 && d.questions.every(q => q.text.trim() !== "")
      );
    }
    if (step === 3) {
      return formData.overallQuestions.every(q => q.text.trim() !== "");
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate("/admin/questionnaires")}
            className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Questionnaires
          </button>
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Create Questionnaire (Manual Entry)</h1>

        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  s < step ? "bg-green-500 text-white" : s === step ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"
                }`}
              >
                {s < step ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-24 h-1 ${s < step ? "bg-green-500" : "bg-gray-300"}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        <Card className="rounded-2xl shadow-lg border-none">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-800">
              {step === 1 && "Step 1: Basic Information"}
              {step === 2 && "Step 2: Domain Questions"}
              {step === 3 && "Step 3: Overall Questions"}
              {step === 4 && "Step 4: Review & Submit"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="code">Questionnaire Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => updateMetadata("code", e.target.value)}
                      placeholder="e.g., ASQ3_4M"
                    />
                  </div>
                  <div>
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => updateMetadata("version", e.target.value)}
                      placeholder="e.g., v1.0"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateMetadata("title", e.target.value)}
                    placeholder="e.g., ASQ-3: 4 months"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="minMonth">Min Month</Label>
                    <Input
                      id="minMonth"
                      type="number"
                      value={formData.minMonth}
                      onChange={(e) => updateMetadata("minMonth", parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxMonth">Max Month</Label>
                    <Input
                      id="maxMonth"
                      type="number"
                      value={formData.maxMonth}
                      onChange={(e) => updateMetadata("maxMonth", parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      value={formData.language}
                      onChange={(e) => updateMetadata("language", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="vi">Vietnamese</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateMetadata("description", e.target.value)}
                      placeholder="Brief description"
                    />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-8">
                {formData.domains.map((domain, domainIdx) => (
                  <div key={domainIdx} className="p-6 bg-gray-50 rounded-xl">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">{domain.title}</h3>
                    <div className="mb-4">
                      <Label htmlFor={`cutoff-${domainIdx}`}>Cutoff Score</Label>
                      <Input
                        id={`cutoff-${domainIdx}`}
                        type="number"
                        step="0.01"
                        value={domain.cutoffScore}
                        onChange={(e) => updateDomain(domainIdx, "cutoffScore", parseFloat(e.target.value))}
                        placeholder="e.g., 25.41"
                      />
                    </div>
                    <div className="space-y-3">
                      {domain.questions.map((q, qIdx) => (
                        <div key={qIdx}>
                          <Label htmlFor={`q-${domainIdx}-${qIdx}`}>Question {qIdx + 1}</Label>
                          <Input
                            id={`q-${domainIdx}-${qIdx}`}
                            value={q.text}
                            onChange={(e) => updateQuestion(domainIdx, qIdx, e.target.value)}
                            placeholder={`Enter question ${qIdx + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                {formData.overallQuestions.map((q, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex-1">
                      <Label htmlFor={`overall-${idx}`}>Overall Question {idx + 1}</Label>
                      <Input
                        id={`overall-${idx}`}
                        value={q.text}
                        onChange={(e) => updateOverallQuestion(idx, e.target.value)}
                        placeholder={`Enter overall question ${idx + 1}`}
                      />
                    </div>
                    {formData.overallQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOverallQuestion(idx)}
                        className="mt-7 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOverallQuestion}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <h3 className="font-bold text-blue-900 mb-2">Metadata</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div><strong>Code:</strong> {formData.code}</div>
                    <div><strong>Title:</strong> {formData.title}</div>
                    <div><strong>Age Range:</strong> {formData.minMonth}-{formData.maxMonth} months</div>
                    <div><strong>Language:</strong> {formData.language}</div>
                    <div><strong>Version:</strong> {formData.version}</div>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <h3 className="font-bold text-green-900 mb-2">Domains</h3>
                  <div className="text-sm text-green-800 space-y-2">
                    {formData.domains.map((d, idx) => (
                      <div key={idx}>
                        <strong>{d.title}:</strong> {d.questions.length} questions, Cutoff: {d.cutoffScore}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <h3 className="font-bold text-purple-900 mb-2">Overall Questions</h3>
                  <div className="text-sm text-purple-800">
                    {formData.overallQuestions.length} questions
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6 border-t">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center px-6 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </button>
              )}
              {step < 4 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="ml-auto inline-flex items-center px-6 py-2.5 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="ml-auto inline-flex items-center px-6 py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Questionnaire"}
                  <Check className="w-4 h-4 ml-2" />
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

