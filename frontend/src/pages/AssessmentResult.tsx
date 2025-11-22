import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft, CheckCircle, AlertTriangle, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DomainScore {
  total: number;
  cutoff: number;
  conclusion: string;
}

interface Assessment {
  id: number;
  assessmentDate: string;
  finalConclusion: string;
  scoresJson: Record<string, DomainScore>;
  summaryResultJson: {
    domainScores: Record<string, DomainScore>;
    finalConclusion: string;
  };
  child: {
    id: number;
    fullName: string;
  };
  questionnaireVersion: {
    version: string;
    questionnaire: {
      code: string;
      title: string;
    };
  };
}

export default function AssessmentResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    api
      .get(`/assessments/${id}`)
      .then((res) => {
        setAssessment(res.data);
        setLoading(false);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Failed to load assessment");
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading assessment result...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-800 font-semibold">Assessment not found</p>
          </div>
          <Button onClick={() => navigate(-1)} className="mt-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const domainScores = assessment.scoresJson || assessment.summaryResultJson?.domainScores || {};
  const domainTitles: Record<string, string> = {
    communication: "Giao tiếp",
    gross_motor: "Vận động thô",
    fine_motor: "Vận động tinh",
    problem_solving: "Giải quyết vấn đề",
    personal_social: "Cá nhân - Xã hội",
  };

  const getConclusionColor = (conclusion: string) => {
    if (conclusion === "REFER") return "bg-red-100 text-red-800 border-red-300";
    if (conclusion === "MONITOR") return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-green-100 text-green-800 border-green-300";
  };

  const getConclusionIcon = (conclusion: string) => {
    if (conclusion === "REFER") return <AlertTriangle className="w-5 h-5" />;
    if (conclusion === "MONITOR") return <Info className="w-5 h-5" />;
    return <CheckCircle className="w-5 h-5" />;
  };

  const finalConclusion = assessment.finalConclusion || assessment.summaryResultJson?.finalConclusion || "NORMAL";

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Assessment Result</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assessment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Child</p>
                <p className="font-semibold text-lg">{assessment.child.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Assessment Date</p>
                <p className="font-semibold text-lg">
                  {new Date(assessment.assessmentDate).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Questionnaire</p>
                <p className="font-semibold text-lg">
                  {assessment.questionnaireVersion.questionnaire.title}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Version</p>
                <p className="font-semibold text-lg">{assessment.questionnaireVersion.version}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              Final Conclusion
              <span
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${getConclusionColor(
                  finalConclusion
                )}`}
              >
                {getConclusionIcon(finalConclusion)}
                {finalConclusion}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {finalConclusion === "REFER" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium mb-2">⚠️ Refer Required</p>
                <p className="text-red-700 text-sm">
                  This child shows significant developmental concerns. Please refer to a specialist for further evaluation.
                </p>
              </div>
            )}
            {finalConclusion === "MONITOR" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium mb-2">📊 Monitor</p>
                <p className="text-yellow-700 text-sm">
                  This child is at risk. Continue monitoring and consider follow-up assessments.
                </p>
              </div>
            )}
            {finalConclusion === "NORMAL" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium mb-2">✅ Normal Development</p>
                <p className="text-green-700 text-sm">
                  This child is developing within expected ranges. Continue regular monitoring.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Domain Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(domainScores).map(([key, score]) => (
              <div
                key={key}
                className={`p-4 rounded-lg border-2 ${
                  score.conclusion === "REFER"
                    ? "bg-red-50 border-red-300"
                    : score.conclusion === "MONITOR"
                    ? "bg-yellow-50 border-yellow-300"
                    : "bg-green-50 border-green-300"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {domainTitles[key] || key}
                  </h3>
                  <span
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${getConclusionColor(
                      score.conclusion
                    )}`}
                  >
                    {getConclusionIcon(score.conclusion)}
                    {score.conclusion}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Score</p>
                      <p className="text-2xl font-bold text-gray-900">{score.total}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Cutoff</p>
                      <p className="text-lg font-semibold text-gray-700">{score.cutoff}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Difference</p>
                    <p
                      className={`text-lg font-semibold ${
                        score.total >= score.cutoff
                          ? "text-green-600"
                          : score.total >= score.cutoff - 2
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {score.total >= score.cutoff
                        ? `+${(score.total - score.cutoff).toFixed(1)}`
                        : (score.total - score.cutoff).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-4">
          <Link to={`/children/${assessment.child.id}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Child Profile
            </Button>
          </Link>
          <Link to={`/children/${assessment.child.id}/new-assessment`}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              New Assessment
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
