import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft, CheckCircle, AlertTriangle, Info, Loader2, FileText, Download, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface DomainScore {
  total: number;
  cutoff: number;
  conclusion: string;
}

interface Assessment {
  id: number;
  assessmentDate: string;
  status?: string;
  finalConclusion?: string;
  scoresJson?: Record<string, DomainScore>;
  summaryResultJson?: {
    domainScores?: Record<string, DomainScore>;
    finalConclusion?: string;
  };
  child: {
    id: number;
    fullName: string;
  };
  questionnaireVersion?: {
    version: string;
    questionnaire: {
      code: string;
      title: string;
    };
  };
  reviewedBy?: {
    id: number;
    username: string;
  };
}

export default function AssessmentResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    api
      .get(`/assessments/${id}`)
      .then((res) => {
        const data = res.data;
        if (!data) {
          toast.error("Invalid assessment data");
          setLoading(false);
          return;
        }

        if (!data.scoresJson && !data.summaryResultJson) {
          toast.error("Assessment data missing scores");
        }

        setAssessment(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Assessment load error:", err);
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

  if (Object.keys(domainScores).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
            <p className="text-yellow-800 font-semibold mb-2">Dữ liệu đánh giá chưa hoàn chỉnh</p>
            <p className="text-yellow-700 text-sm">Điểm số theo lĩnh vực chưa được tính toán.</p>
          </div>
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h2 className="font-semibold text-lg mb-4">Thông tin đánh giá</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Trẻ</p>
                <p className="font-semibold">{assessment.child.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ngày đánh giá</p>
                <p className="font-semibold">
                  {new Date(assessment.assessmentDate).toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  const getConclusionConfig = (conclusion: string) => {
    if (conclusion === "REFER") {
      return {
        color: "bg-red-600 text-white",
        border: "border-red-300",
        bg: "bg-red-50",
        icon: <AlertTriangle className="w-5 h-5" />,
        label: "Cần đánh giá chuyên sâu",
        message: "Trẻ có dấu hiệu chậm phát triển đáng kể. Cần được đánh giá chuyên sâu bởi chuyên gia.",
      };
    }
    if (conclusion === "MONITOR") {
      return {
        color: "bg-yellow-500 text-white",
        border: "border-yellow-300",
        bg: "bg-yellow-50",
        icon: <Info className="w-5 h-5" />,
        label: "Cần theo dõi",
        message: "Trẻ có nguy cơ chậm phát triển. Cần tiếp tục theo dõi và đánh giá lại sau một thời gian.",
      };
    }
    return {
      color: "bg-green-600 text-white",
      border: "border-green-300",
      bg: "bg-green-50",
      icon: <CheckCircle className="w-5 h-5" />,
      label: "Bình thường",
      message: "Trẻ phát triển trong phạm vi bình thường. Tiếp tục theo dõi định kỳ.",
    };
  };

  const finalConclusion = assessment.finalConclusion || assessment.summaryResultJson?.finalConclusion || "NORMAL";
  const finalConfig = getConclusionConfig(finalConclusion);

  const handleExportPDF = async () => {
    if (!id) return;
    if (assessment?.status !== 'APPROVED') {
      toast.error("Assessment must be approved before exporting PDF");
      return;
    }
    setExporting(true);
    try {
      const response = await api.get(`/assessments/${id}/report`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `asq3-report-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF exported successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleReview = async (status: string) => {
    if (!id) return;
    setReviewing(true);
    try {
      await api.patch(`/assessments/${id}/review`, { status });
      const res = await api.get(`/assessments/${id}`);
      setAssessment(res.data);
      toast.success(`Assessment ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to review assessment");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Kết quả đánh giá ASQ-3</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Thông tin đánh giá</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Trẻ</p>
                <p className="font-semibold text-lg">{assessment.child.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ngày đánh giá</p>
                <p className="font-semibold text-lg">
                  {new Date(assessment.assessmentDate).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Bộ câu hỏi</p>
                <p className="font-semibold text-lg">
                  {assessment.questionnaireVersion?.questionnaire?.title || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phiên bản</p>
                <p className="font-semibold text-lg">{assessment.questionnaireVersion?.version || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              Kết luận tổng quát
              <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${finalConfig.color}`}>
                {finalConfig.icon}
                {finalConfig.label}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`${finalConfig.bg} border-2 ${finalConfig.border} rounded-lg p-6`}>
              <p className="font-semibold text-lg mb-2 text-gray-900">{finalConfig.label}</p>
              <p className="text-gray-700">{finalConfig.message}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Điểm số theo từng lĩnh vực
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Lĩnh vực</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Điểm</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Ngưỡng</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Chênh lệch</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Kết luận</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(domainScores).map(([key, score]: [string, any]) => {
                    if (!score || typeof score.total !== 'number' || typeof score.cutoff !== 'number') {
                      return null;
                    }
                    const config = getConclusionConfig(score.conclusion || 'NORMAL');
                    const difference = score.total - score.cutoff;
                    return (
                      <tr key={key} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-semibold text-gray-900">{domainTitles[key] || key}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-2xl font-bold text-gray-900">{score.total}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-lg font-semibold text-gray-700">{score.cutoff}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`text-lg font-semibold ${
                              difference >= 0 ? "text-green-600" : difference >= -2 ? "text-yellow-600" : "text-red-600"
                            }`}
                          >
                            {difference >= 0 ? `+${difference.toFixed(1)}` : difference.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}
                          >
                            {config.icon}
                            {config.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-4 flex-wrap">
          <Link to={`/children/${assessment.child.id}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Về hồ sơ trẻ
            </Button>
          </Link>
          {hasRole(['SPECIALIST', 'ADMIN']) && assessment.status === 'PENDING_REVIEW' && (
            <>
              <Button
                onClick={() => handleReview('APPROVED')}
                disabled={reviewing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {reviewing ? "Đang xử lý..." : "Duyệt"}
              </Button>
              <Button
                onClick={() => handleReview('REJECTED')}
                disabled={reviewing}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Từ chối
              </Button>
            </>
          )}
          {assessment.status === 'APPROVED' && (
            <Button
              onClick={handleExportPDF}
              disabled={exporting}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? "Đang xuất..." : "Xuất PDF"}
            </Button>
          )}
          <Link to={`/children/${assessment.child.id}/new-assessment`}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Đánh giá mới
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
