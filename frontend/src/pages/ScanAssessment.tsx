import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

interface OcrResult {
  status: string;
  result: {
    status: string;
    pages: Array<{
      frame_index: number;
      width: number;
      height: number;
      texts: Array<{
        text: string;
        bbox: number[];
        conf: number;
      }>;
    }>;
    full_text: string;
    confidence: number;
    total_frames: number;
  };
  ocrResultId: number;
  fileId: number;
}

interface Child {
  id: number;
  fullName: string;
  birthDate: string;
}

interface QuestionnaireVersion {
  id: number;
  version: string;
  questionnaire: {
    id: number;
    code: string;
    title: string;
  };
}

export default function ScanAssessment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get('childId');
  const questionnaireVersionId = searchParams.get('questionnaireVersionId');

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [creating, setCreating] = useState(false);
  const [child, setChild] = useState<Child | null>(null);
  const [questionnaireVersion, setQuestionnaireVersion] = useState<QuestionnaireVersion | null>(null);

  useEffect(() => {
    if (childId) {
      api.get(`/children/${childId}`)
        .then((res) => setChild(res.data))
        .catch(() => toast.error('Không thể tải thông tin trẻ'));
    }

    if (questionnaireVersionId) {
      api.get(`/questionnaires/versions/${questionnaireVersionId}`)
        .then((res) => setQuestionnaireVersion(res.data))
        .catch(() => {
          api.get(`/questionnaires/${questionnaireVersionId}/version/latest`)
            .then((res) => setQuestionnaireVersion(res.data))
            .catch(() => toast.error('Không thể tải thông tin bảng câu hỏi'));
        });
    }
  }, [childId, questionnaireVersionId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setFiles(Array.from(e.target.files));
    setOcrResults([]);
  };

  const handleUpload = async () => {
    if (!files.length) {
      toast.error('Vui lòng chọn ít nhất một file');
      return;
    }
    if (!questionnaireVersionId) {
      toast.error('Vui lòng chọn bảng câu hỏi');
      return;
    }

    setUploading(true);
    const results: OcrResult[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        formData.append('questionnaireVersionId', questionnaireVersionId);
        if (childId) {
          formData.append('childId', childId);
        }

        const response = await api.post('/api/ocr/recognize', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        results.push(response.data);
        toast.success(`Đã xử lý ${i + 1}/${files.length}: ${files[i].name}`);
      }

      setOcrResults(results);
      toast.success(`OCR thành công ${files.length} file!`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xử lý OCR');
    } finally {
      setUploading(false);
    }
  };


  const handleCreateAssessment = async () => {
    if (!ocrResults.length || !childId || !questionnaireVersionId) {
      toast.error('Thiếu thông tin cần thiết');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/api/ocr/create-assessment', {
        ocrResultId: ocrResults[ocrResults.length - 1].ocrResultId,
        childId: parseInt(childId),
        questionnaireVersionId: parseInt(questionnaireVersionId),
      });

      toast.success('Tạo assessment thành công!');
      navigate(`/assessment/${response.data.assessment.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo assessment');
    } finally {
      setCreating(false);
    }
  };

  const mainOcrResultId = ocrResults.length > 0 ? ocrResults[ocrResults.length - 1].ocrResultId : null;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Quét và OCR Phiếu Đánh Giá</h1>

      <Card className="mb-6">
        <CardContent className="p-4 space-y-2">
          {child && (
            <div>
              <Label>Trẻ:</Label>
              <span className="ml-2 font-semibold text-gray-900">{child.fullName}</span>
            </div>
          )}
          {questionnaireVersion && (
            <div>
              <Label>Bảng câu hỏi:</Label>
              <span className="ml-2 font-semibold text-gray-900">
                {questionnaireVersion.questionnaire.title} (v{questionnaireVersion.version})
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="file">Chọn nhiều file scan (ảnh/PDF) - Giữ Ctrl/Cmd để chọn nhiều</Label>
            <input
              id="file"
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFileChange}
              className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700">Đã chọn {files.length} file:</div>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {index + 1}. {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleUpload} disabled={!files.length || uploading} className="w-full">
            {uploading ? `Đang xử lý OCR... (${files.length} file)` : `Upload và OCR (${files.length} file)`}
          </Button>
        </CardContent>
      </Card>

      {ocrResults.length > 0 && (
        <div className="space-y-4 mb-6">
          {ocrResults.map((ocrResult, resultIdx) => (
            <Card key={resultIdx}>
              <CardHeader>
                <CardTitle className="text-xl">
                  Kết quả OCR - File {resultIdx + 1}: {files[resultIdx]?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Độ tin cậy trung bình:</Label>
                  <span className="ml-2 text-gray-900">{(ocrResult.result.confidence * 100).toFixed(1)}%</span>
                </div>

                <div>
                  <Label>Số frames:</Label>
                  <span className="ml-2 text-gray-900">{ocrResult.result.total_frames}</span>
                </div>

                <div>
                  <Label>Text đã nhận dạng:</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded border max-h-64 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap text-gray-900">
                      {ocrResult.result.full_text}
                    </pre>
                  </div>
                </div>

                <div>
                  <Label>Chi tiết nhận dạng:</Label>
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {ocrResult.result.pages.map((page, pageIdx) => (
                      <div key={pageIdx} className="border-b pb-2">
                        <div className="text-sm font-semibold mb-1 text-gray-900">
                          Frame {page.frame_index + 1} ({page.width}x{page.height})
                        </div>
                        <div className="space-y-1">
                          {page.texts.map((textItem, idx) => (
                            <div key={idx} className="text-xs text-gray-600">
                              <span className="font-mono">{textItem.text}</span>
                              <span className="ml-2 text-gray-400">({(textItem.conf * 100).toFixed(0)}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {ocrResults.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <Button
              onClick={handleCreateAssessment}
              disabled={!mainOcrResultId || !childId || !questionnaireVersionId || creating}
              className="w-full"
            >
              {creating ? 'Đang tạo...' : 'Tạo Assessment từ OCR'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
