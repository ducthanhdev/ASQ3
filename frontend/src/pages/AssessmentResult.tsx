import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Image,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface DomainScore {
  total: number;
  cutoff: number;
  conclusion: string;
}

interface ScanFile {
  id: number;
  originalName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

interface Assessment {
  id: number;
  assessmentDate: string;
  status?: string;
  finalConclusion?: string;
  method?: string;
  answersJson?: Record<string, string>;
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
    structureJson?: {
      overall_section?: Array<{
        id: string;
        text: string;
        type?: string;
      }>;
    };
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
  const [showScanFiles, setShowScanFiles] = useState(false);
  const [scanFiles, setScanFiles] = useState<ScanFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    api
      .get(`/assessments/${id}`)
      .then((res) => {
        setAssessment(res.data);
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
  const answers = assessment.answersJson || {};
  const finalConclusion =
    assessment.finalConclusion || assessment.summaryResultJson?.finalConclusion || "NORMAL";
  
  // Handle overall_section as both object and array formats
  const rawOverallSection = assessment.questionnaireVersion?.structureJson?.overall_section;
  let overallSection: Array<{ id: string; text: string; type?: string }> = [];
  if (rawOverallSection) {
    if (Array.isArray(rawOverallSection)) {
      overallSection = rawOverallSection;
    } else if (typeof rawOverallSection === 'object') {
      overallSection = Object.values(rawOverallSection);
    }
  }

  const domainTitles: Record<string, string> = {
    communication: "Giao tiếp",
    gross_motor: "Vận động thô",
    fine_motor: "Vận động tinh",
    problem_solving: "Giải quyết vấn đề",
    personal_social: "Cá nhân - Xã hội",
  };

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

  const finalConfig = getConclusionConfig(finalConclusion);

  const handleExportPDF = async () => {
    if (!id) return;
    if (assessment?.status !== "APPROVED") {
      toast.error("Assessment must be approved before exporting PDF");
      return;
    }
    setExporting(true);
    try {
      const response = await api.get(`/assessments/${id}/report`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `asq3-report-${id}.pdf`);
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
      toast.success(`Assessment ${status === "APPROVED" ? "approved" : "rejected"} successfully`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to review assessment");
    } finally {
      setReviewing(false);
    }
  };

  const handleViewScanFiles = async () => {
    if (!id) return;
    setLoadingFiles(true);
    setShowScanFiles(true);
    try {
      const res = await api.get(`/api/ocr/files/assessment/${id}`);
      setScanFiles(res.data);
      if (res.data.length === 0) {
        toast.info("Không có bản scan nào cho assessment này");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể tải danh sách bản scan");
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDownloadAll = async () => {
    if (scanFiles.length === 0) return;
    setDownloadingAll(true);
    try {
      for (let i = 0; i < scanFiles.length; i++) {
        const file = scanFiles[i];
        try {
          const response = await api.get(`/api/ocr/files/${file.id}`, {
            responseType: "blob",
          });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", file.originalName);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (err: any) {
          toast.error(`Không thể tải file: ${file.originalName}`);
        }
      }
      toast.success(`Đã tải ${scanFiles.length} file`);
    } catch (err: any) {
      toast.error("Lỗi khi tải tất cả file");
    } finally {
      setDownloadingAll(false);
    }
  };

  const renderScoreChart = (score: number, maxScore: number) => {
    const circles = [];
    const step = 5;

    for (let i = 0; i <= maxScore; i += step) {
      const isFilled = i < score;
      circles.push(
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 ${
            isFilled ? "bg-black border-black" : "border-gray-300"
          }`}
        />
      );
    }

    return <div className="flex items-center gap-1 flex-wrap">{circles}</div>;
  };

  const getOverallAnswer = (questionId: string) => {
    const answer = answers[questionId] || "";
    if (answer === "Y") return { text: "CÓ", bold: true };
    if (answer === "N") return { text: "KHÔNG", bold: false };
    return { text: "", bold: false };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Kết quả đánh giá ASQ-3</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Thông tin đánh giá</span>
              {assessment.method === "SCAN" && (
                <Button
                  variant="outline"
                  onClick={handleViewScanFiles}
                  className="flex items-center gap-2"
                >
                  <Image className="w-4 h-4" />
                  Xem lại các bản scan
                </Button>
              )}
            </CardTitle>
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
                  {assessment.questionnaireVersion?.questionnaire?.title || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phiên bản</p>
                <p className="font-semibold text-lg">{assessment.questionnaireVersion?.version || "N/A"}</p>
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              TÍNH ĐIỂM VÀ CHUYỂN TỔNG ĐIỂM SANG BIỂU ĐỒ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-gray-600 space-y-1">
              <p>CÓ = 10 điểm | ĐÔI KHI = 5 điểm | CHƯA = 0 điểm</p>
              <p>Tổng điểm cho mỗi phần và tô đen hình tròn tương ứng trong biểu đồ dưới đây</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Lĩnh vực</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Giá trị Ngưỡng</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Tổng điểm</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Biểu đồ điểm</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Kết luận</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(domainScores).map(([key, score]: [string, any]) => {
                    if (!score || typeof score.total !== "number" || typeof score.cutoff !== "number") {
                      return null;
                    }
                    const config = getConclusionConfig(score.conclusion || "NORMAL");
                    const maxScore = 60;
                    return (
                      <tr key={key} className="border-b border-gray-200">
                        <td className="py-4 px-4 font-semibold text-gray-900">{domainTitles[key] || key}</td>
                        <td className="py-4 px-4 text-center font-semibold text-gray-700">{score.cutoff.toFixed(2)}</td>
                        <td className="py-4 px-4 text-center text-xl font-bold text-gray-900">{score.total}</td>
                        <td className="py-4 px-4">{renderScoreChart(score.total, maxScore)}</td>
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

        {overallSection.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>CHUYỂN CÂU TRẢ LỜI CHO PHẦN TỔNG QUAN</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 bg-yellow-50 border border-yellow-600 p-3 text-xs text-gray-700">
                <p>
                  <strong>Lưu ý:</strong> Các câu trả lời được viết <strong>IN HOA VÀ ĐẬM</strong> cần được theo dõi
                  thêm. Xem Hướng dẫn sử dụng ASQ-3, chương 6.
                </p>
              </div>
              <div className="space-y-4">
                {overallSection.map((q, idx) => {
                  const answer = getOverallAnswer(q.id);
                  const explanationKey = `${q.id}_explanation`;
                  const explanation = answers[explanationKey] || "";
                  return (
                    <div key={q.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start gap-4">
                        <span className="font-bold text-gray-900 min-w-[24px]">{idx + 1}.</span>
                        <div className="flex-1">
                          <p className="text-gray-900 mb-3">{q.text}</p>
                          <div className="flex items-center gap-6 mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700">C</span>
                              <div className={`w-5 h-5 border-2 border-gray-400 flex items-center justify-center ${
                                answer.text === "CÓ" ? "bg-black border-black" : "bg-white"
                              }`}>
                                {answer.text === "CÓ" && <span className="text-white font-bold text-xs">X</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700">K</span>
                              <div className={`w-5 h-5 border-2 border-gray-400 flex items-center justify-center ${
                                answer.text === "KHÔNG" ? "bg-black border-black" : "bg-white"
                              }`}>
                                {answer.text === "KHÔNG" && <span className="text-white font-bold text-xs">X</span>}
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">Giải thích (nếu có):</label>
                            <textarea
                              readOnly
                              value={explanation}
                              className="w-full border border-gray-300 rounded p-2 text-sm bg-white min-h-[60px] resize-none"
                              placeholder=""
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex gap-4 flex-wrap">
          <Link to={`/children/${assessment.child.id}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Về hồ sơ trẻ
            </Button>
          </Link>
          {hasRole(["SPECIALIST"]) && assessment.status === "PENDING_REVIEW" && (
            <>
              <Button
                onClick={() => handleReview("APPROVED")}
                disabled={reviewing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {reviewing ? "Đang xử lý..." : "Duyệt"}
              </Button>
              <Button
                onClick={() => handleReview("REJECTED")}
                disabled={reviewing}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Từ chối
              </Button>
            </>
          )}
          {assessment.status === "APPROVED" && (
            <Button onClick={handleExportPDF} disabled={exporting} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
              <Download className="w-4 h-4 mr-2" />
              {exporting ? "Đang xuất..." : "Xuất PDF"}
            </Button>
          )}
          <Link to={`/children/${assessment.child.id}/new-assessment`}>
            <Button className="bg-blue-600 hover:bg-blue-700">Đánh giá mới</Button>
          </Link>
        </div>
      </div>

      {showScanFiles && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex items-center justify-between border-b">
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Các bản scan ({scanFiles.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                {scanFiles.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadAll}
                    disabled={downloadingAll}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {downloadingAll ? "Đang tải..." : "Tải tất cả"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScanFiles(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : scanFiles.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Không có bản scan nào</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scanFiles.map((file) => (
                    <Card key={file.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{file.originalName}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {file.sizeBytes
                                ? `${(file.sizeBytes / 1024).toFixed(1)} KB`
                                : "N/A"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(file.createdAt).toLocaleString("vi-VN")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={async () => {
                              try {
                                const response = await api.get(`/api/ocr/files/${file.id}`, {
                                  responseType: "blob",
                                });
                                const mimeType = file.mimeType || response.headers["content-type"] || "image/png";
                                const url = window.URL.createObjectURL(
                                  new Blob([response.data], { type: mimeType })
                                );
                                window.open(url, "_blank");
                                setTimeout(() => window.URL.revokeObjectURL(url), 100);
                              } catch (err: any) {
                                toast.error("Không thể xem file");
                              }
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Xem
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={async () => {
                              try {
                                const response = await api.get(`/api/ocr/files/${file.id}`, {
                                  responseType: "blob",
                                });
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement("a");
                                link.href = url;
                                link.setAttribute("download", file.originalName);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                window.URL.revokeObjectURL(url);
                                toast.success("Đã tải file");
                              } catch (err: any) {
                                toast.error("Không thể tải file");
                              }
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Tải
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
