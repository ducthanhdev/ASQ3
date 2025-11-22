import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import * as RadioGroup from "@radix-ui/react-radio-group";

interface Child {
  id: number;
  fullName: string;
  ageMonths: number;
  birthDate: string;
}

interface Domain {
  key: string;
  title: string;
  cutoff_score: number;
  questions: Array<{
    id: string;
    text: string;
    sort_order: number;
  }>;
}

interface AutoSelectData {
  child: Child;
  questionnaire: {
    id: number;
    code: string;
    title: string;
    minMonth: number;
    maxMonth: number;
  };
  version: {
    id: number;
    version: string;
    structureJson: {
      domains: Domain[];
      overall_section?: Array<{
        id: string;
        text: string;
        type: string;
      }>;
    };
  };
}

export default function AssessmentForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const childIdFromQuery = searchParams.get("childId");

  const [data, setData] = useState<AutoSelectData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluatorInfo, setEvaluatorInfo] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    relationship: "",
    address: "",
    homePhone: "",
    otherPhone: "",
    email: "",
    helperName: "",
    programRegistrationNumber: "",
    programName: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const targetChildId = id ? parseInt(id) : childIdFromQuery ? parseInt(childIdFromQuery) : null;
    if (!targetChildId) {
      setError("Child ID is required");
      setLoading(false);
      return;
    }

    api
      .get(`/questionnaires/auto-select?childId=${targetChildId}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load questionnaire");
        setLoading(false);
        toast.error("Failed to load questionnaire");
      });
  }, [id, childIdFromQuery]);

  const handleSubmit = async () => {
    if (!data) return;

    const allQuestions = data.version.structureJson.domains.flatMap((d) => d.questions);
    const missingAnswers = allQuestions.filter((q) => !answers[q.id]);

    if (missingAnswers.length > 0) {
      toast.error(`Please answer all ${missingAnswers.length} remaining questions`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/assessments/online/submit", {
        childId: data.child.id,
        questionnaireVersionId: data.version.id,
        answers,
        evaluatorFirstName: evaluatorInfo.firstName,
        evaluatorMiddleName: evaluatorInfo.middleName,
        evaluatorLastName: evaluatorInfo.lastName,
        relationship: evaluatorInfo.relationship,
        evaluatorAddress: evaluatorInfo.address,
        evaluatorHomePhone: evaluatorInfo.homePhone,
        evaluatorOtherPhone: evaluatorInfo.otherPhone,
        evaluatorEmail: evaluatorInfo.email,
        helperName: evaluatorInfo.helperName,
        programRegistrationNumber: evaluatorInfo.programRegistrationNumber,
        programName: evaluatorInfo.programName,
      });

      toast.success("Assessment submitted successfully!");
      navigate(`/assessment/${res.data.assessment.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-red-600">{error || "Questionnaire not found"}</p>
            </div>
          </div>
          <Button onClick={() => navigate(-1)} className="mt-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const structure = data.version.structureJson;
  const domainTitles: Record<string, string> = {
    communication: "Giao tiếp",
    gross_motor: "Vận động thô",
    fine_motor: "Vận động tinh",
    problem_solving: "Giải quyết vấn đề",
    personal_social: "Cá nhân - Xã hội",
  };

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
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">ASQ-3 Assessment</h1>
          <p className="text-gray-600">
            {data.questionnaire.title} - {data.questionnaire.code}
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Child Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Child Name</p>
                <p className="font-semibold text-lg">{data.child.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Age (Adjusted)</p>
                <p className="font-semibold text-lg">{data.child.ageMonths} months</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Thông tin về người điền bảng hỏi</CardTitle>
            <p className="text-sm text-gray-500 mt-2">Tất cả các trường dưới đây là tùy chọn, bạn có thể bỏ qua nếu không cần thiết</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Họ (Last Name) <span className="text-gray-400 font-normal text-xs">(Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={evaluatorInfo.lastName}
                  onChange={(e) => setEvaluatorInfo({ ...evaluatorInfo, lastName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên đệm (Middle Name) <span className="text-gray-400 font-normal text-xs">(Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={evaluatorInfo.middleName}
                  onChange={(e) => setEvaluatorInfo({ ...evaluatorInfo, middleName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên (First Name) <span className="text-gray-400 font-normal text-xs">(Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={evaluatorInfo.firstName}
                  onChange={(e) => setEvaluatorInfo({ ...evaluatorInfo, firstName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quan hệ với trẻ (Relationship) <span className="text-gray-400 font-normal text-xs">(Tùy chọn)</span>
              </label>
              <select
                value={evaluatorInfo.relationship}
                onChange={(e) => setEvaluatorInfo({ ...evaluatorInfo, relationship: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Chọn quan hệ</option>
                <option value="PARENT">Bố/mẹ</option>
                <option value="GUARDIAN">Người giám hộ</option>
                <option value="TEACHER">Giáo viên</option>
                <option value="CHILDCARE_PROVIDER">Người trông trẻ</option>
                <option value="GRANDPARENT">Ông/bà hoặc người thân trong gia đình</option>
                <option value="FOSTER_PARENT">Bố mẹ nuôi</option>
                <option value="OTHER">Lựa chọn khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Địa chỉ (Address) <span className="text-gray-400 font-normal text-xs">(Tùy chọn)</span>
              </label>
              <textarea
                rows={2}
                value={evaluatorInfo.address}
                onChange={(e) => setEvaluatorInfo({ ...evaluatorInfo, address: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số điện thoại nhà (Home Phone) <span className="text-gray-400 font-normal text-xs">(Tùy chọn)</span>
                </label>
                <input
                  type="tel"
                  value={evaluatorInfo.homePhone}
                  onChange={(e) => setEvaluatorInfo({ ...evaluatorInfo, homePhone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số điện thoại khác (Other Phone) <span className="text-gray-400 font-normal text-xs">(Tùy chọn)</span>
                </label>
                <input
                  type="tel"
                  value={evaluatorInfo.otherPhone}
                  onChange={(e) => setEvaluatorInfo({ ...evaluatorInfo, otherPhone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Địa chỉ thư điện tử (Email) <span className="text-gray-400 font-normal text-xs">(Tùy chọn)</span>
              </label>
              <input
                type="email"
                value={evaluatorInfo.email}
                onChange={(e) => setEvaluatorInfo({ ...evaluatorInfo, email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tên người giúp bạn hoàn thành bảng hỏi này (Helper Name) <span className="text-gray-400 font-normal text-xs">(Tùy chọn)</span>
              </label>
              <input
                type="text"
                value={evaluatorInfo.helperName}
                onChange={(e) => setEvaluatorInfo({ ...evaluatorInfo, helperName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số đăng kí của chương trình (Program Registration Number) <span className="text-gray-400 font-normal text-xs">(Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={evaluatorInfo.programRegistrationNumber}
                  onChange={(e) => setEvaluatorInfo({ ...evaluatorInfo, programRegistrationNumber: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên chương trình (Program Name) <span className="text-gray-400 font-normal text-xs">(Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  value={evaluatorInfo.programName}
                  onChange={(e) => setEvaluatorInfo({ ...evaluatorInfo, programName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 mb-8">
          {structure.domains.map((domain) => (
            <Card key={domain.key}>
              <CardHeader>
                <CardTitle className="text-xl">
                  {domainTitles[domain.key] || domain.title}
                </CardTitle>
                <p className="text-sm text-gray-500">Cutoff Score: {domain.cutoff_score}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {domain.questions.map((q) => (
                  <div key={q.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                    <p className="font-medium mb-2 text-gray-900">
                      <span className="text-red-500 mr-1">*</span>
                      {q.sort_order}. {q.text}
                    </p>
                    <p className="text-xs text-red-600 mb-4 font-medium">Bắt buộc phải trả lời</p>
                    <RadioGroup.Root
                      value={answers[q.id] || ""}
                      onValueChange={(value) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: value }))
                      }
                      className="flex gap-6"
                    >
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <RadioGroup.Item
                          value="Y"
                          className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white group-hover:border-blue-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-colors"
                        >
                          <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-white" />
                        </RadioGroup.Item>
                        <span className="text-gray-700 group-hover:text-blue-600 transition-colors">
                          Có (Yes)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <RadioGroup.Item
                          value="S"
                          className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white group-hover:border-blue-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-colors"
                        >
                          <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-white" />
                        </RadioGroup.Item>
                        <span className="text-gray-700 group-hover:text-blue-600 transition-colors">
                          Đôi khi (Sometimes)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <RadioGroup.Item
                          value="N"
                          className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white group-hover:border-blue-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-colors"
                        >
                          <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-white" />
                        </RadioGroup.Item>
                        <span className="text-gray-700 group-hover:text-blue-600 transition-colors">
                          Chưa (Not yet)
                        </span>
                      </label>
                    </RadioGroup.Root>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {structure.overall_section && structure.overall_section.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Overall Questions</CardTitle>
              <p className="text-sm text-gray-500 mt-2">Các câu hỏi tổng quát (Tùy chọn)</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {structure.overall_section.map((q) => (
                <div key={q.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                  <p className="font-medium mb-4 text-gray-900">
                    {q.text} <span className="text-gray-400 font-normal text-xs ml-2">(Tùy chọn)</span>
                  </p>
                  <RadioGroup.Root
                    value={answers[q.id] || ""}
                    onValueChange={(value) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: value }))
                    }
                    className="flex gap-6"
                  >
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <RadioGroup.Item
                        value="Y"
                        className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white group-hover:border-blue-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-colors"
                      >
                        <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-white" />
                      </RadioGroup.Item>
                      <span className="text-gray-700 group-hover:text-blue-600 transition-colors">
                        Yes
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <RadioGroup.Item
                        value="N"
                        className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white group-hover:border-blue-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-colors"
                      >
                        <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-white" />
                      </RadioGroup.Item>
                      <span className="text-gray-700 group-hover:text-blue-600 transition-colors">
                        No
                      </span>
                    </label>
                  </RadioGroup.Root>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-4 sticky bottom-0 bg-gray-50 p-4 -mx-8 -mb-8 border-t border-gray-200">
          <Button variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Assessment"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
